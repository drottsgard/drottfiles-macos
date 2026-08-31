import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { ThinkingLevel } from "@earendil-works/pi-agent-core";

export type AgentRole = "implementor" | "reviewer";

export interface AgentInvocation {
	role: AgentRole;
	cwd: string;
	systemPrompt: string;
	task: string;
	model?: string;
	thinkingLevel?: ThinkingLevel;
	signal: AbortSignal;
	onProgress?: (message: string) => void;
}

export interface AgentInvocationResult {
	finalText: string;
	diagnostics: string[];
}

export interface AgentRunnerOptions {
	timeoutMs?: number;
}

interface AssistantMessage {
	role?: string;
	content?: Array<{ type?: string; text?: string }>;
	stopReason?: string;
	errorMessage?: string;
}

interface JsonEvent {
	type?: string;
	message?: AssistantMessage;
	toolName?: string;
	args?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

export class PiAgentRunner {
	constructor(private readonly options: AgentRunnerOptions = {}) {}

	async run(invocation: AgentInvocation): Promise<AgentInvocationResult> {
		invocation.signal.throwIfAborted();
		const temporaryDirectory = await mkdtemp(join(tmpdir(), `pi-${invocation.role}-`));
		const systemPromptPath = join(temporaryDirectory, "system.md");
		const taskPath = join(temporaryDirectory, "task.md");

		try {
			await Promise.all([
				writeFile(systemPromptPath, invocation.systemPrompt, { encoding: "utf8", mode: 0o600 }),
				writeFile(taskPath, invocation.task, { encoding: "utf8", mode: 0o600 }),
			]);
			return await this.spawnAgent(invocation, systemPromptPath, taskPath);
		} finally {
			await rm(temporaryDirectory, { recursive: true, force: true });
		}
	}

	private async spawnAgent(
		invocation: AgentInvocation,
		systemPromptPath: string,
		taskPath: string,
	): Promise<AgentInvocationResult> {
		const args = ["--mode", "json", "-p", "--no-session", "--append-system-prompt", systemPromptPath];
		if (invocation.model) args.push("--model", invocation.model);
		if (invocation.thinkingLevel) args.push("--thinking", invocation.thinkingLevel);
		if (invocation.role === "reviewer") args.push("--tools", "read,grep,find,ls");
		args.push(`@${taskPath}`);

		const executable = getPiInvocation(args);
		const messages: AssistantMessage[] = [];
		let stderr = "";
		let eventBuffer = "";
		let timedOut = false;
		let child: ChildProcess | undefined;

		const exitCode = await new Promise<number>((resolve, reject) => {
			child = spawn(executable.command, executable.args, {
				cwd: invocation.cwd,
				shell: false,
				stdio: ["ignore", "pipe", "pipe"],
				detached: process.platform !== "win32",
			});

			const processLine = (line: string) => {
				if (!line.trim()) return;
				let event: JsonEvent;
				try {
					event = JSON.parse(line);
				} catch {
					return;
				}
				if (event.type === "tool_execution_start" && event.toolName) {
					invocation.onProgress?.(formatToolActivity(event.toolName, event.args ?? {}));
				}
				if (event.type === "message_end" && event.message?.role === "assistant") {
					messages.push(event.message);
					invocation.onProgress?.("completed a model turn");
				}
			};

			child.stdout?.on("data", (data: Buffer) => {
				eventBuffer += data.toString();
				const lines = eventBuffer.split("\n");
				eventBuffer = lines.pop() ?? "";
				for (const line of lines) processLine(line);
			});
			child.stderr?.on("data", (data: Buffer) => {
				stderr += data.toString();
			});

			const timeout = setTimeout(() => {
				timedOut = true;
				terminateProcessTree(child!);
			}, this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
			const abort = () => terminateProcessTree(child!);
			invocation.signal.addEventListener("abort", abort, { once: true });

			child.once("error", (error) => {
				clearTimeout(timeout);
				invocation.signal.removeEventListener("abort", abort);
				reject(error);
			});
			child.once("close", (code) => {
				clearTimeout(timeout);
				invocation.signal.removeEventListener("abort", abort);
				if (eventBuffer.trim()) processLine(eventBuffer);
				resolve(code ?? 1);
			});

			if (invocation.signal.aborted) abort();
		});

		if (invocation.signal.aborted) throw new DOMException("Implementation loop cancelled", "AbortError");
		if (timedOut) throw new Error(`${invocation.role} timed out after ${this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`);
		if (exitCode !== 0) throw new Error(`${invocation.role} process exited ${exitCode}: ${stderr.trim() || "no diagnostics"}`);

		const finalMessage = messages.at(-1);
		if (!finalMessage) throw new Error(`${invocation.role} produced no assistant message`);
		if (finalMessage.stopReason === "error" || finalMessage.stopReason === "aborted") {
			throw new Error(`${invocation.role} stopped with ${finalMessage.stopReason}: ${finalMessage.errorMessage ?? "no diagnostics"}`);
		}
		const finalText = (finalMessage.content ?? [])
			.filter((part) => part.type === "text" && typeof part.text === "string")
			.map((part) => part.text)
			.join("\n");
		return { finalText, diagnostics: stderr.trim() ? [stderr.trim()] : [] };
	}
}

function formatToolActivity(toolName: string, args: Record<string, unknown>): string {
	const path = typeof args.path === "string" ? args.path : undefined;
	switch (toolName) {
		case "bash": {
			const command = typeof args.command === "string" ? args.command.replace(/\s+/g, " ").trim() : "";
			return `$ ${truncate(command || "command", 80)}`;
		}
		case "read":
		case "write":
		case "edit":
		case "grep":
		case "find":
		case "ls":
			return `${toolName} ${truncate(path ?? "…", 80)}`;
		default:
			return toolName;
	}
}

function truncate(value: string, maximumLength: number): string {
	return value.length > maximumLength ? `${value.slice(0, maximumLength - 1)}…` : value;
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	if (currentScript && !currentScript.startsWith("/$bunfs/root/") && existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}
	const executable = basename(process.execPath).toLowerCase();
	return /^(node|bun)(\.exe)?$/.test(executable)
		? { command: "pi", args }
		: { command: process.execPath, args };
}

function terminateProcessTree(child: ChildProcess): void {
	if (!child.pid || child.exitCode !== null) return;
	try {
		if (process.platform === "win32") child.kill("SIGTERM");
		else process.kill(-child.pid, "SIGTERM");
	} catch {
		child.kill("SIGTERM");
	}
	const forceKill = setTimeout(() => {
		if (child.exitCode !== null) return;
		try {
			if (process.platform === "win32") child.kill("SIGKILL");
			else process.kill(-child.pid!, "SIGKILL");
		} catch {
			child.kill("SIGKILL");
		}
	}, 5000);
	forceKill.unref();
}
