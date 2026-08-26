import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { BorderedLoader } from "@earendil-works/pi-coding-agent";
import { PiAgentRunner } from "./agent-runner";
import { parseImplementorResult, parseReviewerResult, type TerminalOutcome } from "./contracts";
import { GitSnapshots } from "./git-snapshot";
import { runImplementationLoop } from "./workflow";

const extensionDirectory = dirname(fileURLToPath(import.meta.url));
const activeOperations = new Set<AbortController>();

export default function implementationLoopExtension(pi: ExtensionAPI) {
	pi.on("session_shutdown", () => {
		for (const controller of activeOperations) controller.abort();
	});

	pi.registerCommand("implementation-loop", {
		description: "Run an isolated implementation and coding-standards review loop",
		handler: async (args, ctx) => {
			const brief = await resolveBrief(args, ctx.cwd);
			if (!brief.ok) {
				presentOutcome(pi, ctx, { status: "FAILED", reason: brief.reason });
				return;
			}

			const controller = new AbortController();
			activeOperations.add(controller);
			let snapshots: GitSnapshots | undefined;
			try {
				snapshots = await GitSnapshots.create(pi, ctx.cwd, controller.signal);
			} catch (error) {
				presentOutcome(pi, ctx, {
					status: "FAILED",
					reason: error instanceof Error ? error.message : String(error),
				});
				activeOperations.delete(controller);
				return;
			}

			try {
				const [implementorPrompt, reviewerPrompt, codingStandards] = await Promise.all([
					readFile(resolve(extensionDirectory, "prompts/implementor.md"), "utf8"),
					readFile(resolve(extensionDirectory, "prompts/reviewer.md"), "utf8"),
					readFile(resolve(extensionDirectory, "../../skills/coding-standards/SKILL.md"), "utf8"),
				]);
				const runner = new PiAgentRunner();
				const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
				const standardsSection = `\n\n<general-coding-standards>\n${codingStandards}\n</general-coding-standards>`;
				const execute = () =>
					runImplementationLoop(brief.value, {
						signal: controller.signal,
						captureTree: () => snapshots!.capture(controller.signal),
						diffTrees: (baseline, current) => snapshots!.diff(baseline, current, controller.signal),
						invokeImplementor: async (task) => {
							const result = await runner.run({
								role: "implementor",
								cwd: ctx.cwd,
								systemPrompt: implementorPrompt + standardsSection,
								task,
								model,
								thinkingLevel: ctx.thinkingLevel,
								signal: controller.signal,
							});
							return parseImplementorResult(result.finalText);
						},
						invokeReviewer: async (task) => {
							const result = await runner.run({
								role: "reviewer",
								cwd: ctx.cwd,
								systemPrompt: reviewerPrompt + standardsSection,
								task,
								model,
								thinkingLevel: ctx.thinkingLevel,
								signal: controller.signal,
							});
							return parseReviewerResult(result.finalText);
						},
					});

				const outcome = await runWithCancellationUi(execute, controller, ctx);
				presentOutcome(pi, ctx, outcome);
			} catch (error) {
				presentOutcome(pi, ctx, {
					status: "FAILED",
					reason: error instanceof Error ? error.message : String(error),
					cancelled: controller.signal.aborted || undefined,
				});
			} finally {
				controller.abort();
				activeOperations.delete(controller);
				await snapshots.cleanup();
			}
		},
	});
}

async function resolveBrief(args: string, cwd: string): Promise<{ ok: true; value: string } | { ok: false; reason: string }> {
	const input = args.trim();
	if (!input) return { ok: false, reason: "Usage: /implementation-loop <build brief>" };
	if (!input.startsWith("@")) return { ok: true, value: input };

	const path = resolve(cwd, input.slice(1).trim());
	try {
		const value = (await readFile(path, "utf8")).trim();
		return value ? { ok: true, value } : { ok: false, reason: `Build brief is empty: ${path}` };
	} catch (error) {
		return {
			ok: false,
			reason: `Cannot read build brief ${path}: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}

async function runWithCancellationUi(
	execute: () => Promise<TerminalOutcome>,
	controller: AbortController,
	ctx: ExtensionCommandContext,
): Promise<TerminalOutcome> {
	if (ctx.mode !== "tui") return execute();
	return ctx.ui.custom<TerminalOutcome>((tui, theme, _keybindings, done) => {
		const loader = new BorderedLoader(tui, theme, "Running implementation loop (Esc to cancel)...");
		loader.onAbort = () => controller.abort();
		execute().then(done).catch((error) => {
			done({ status: "FAILED", reason: error instanceof Error ? error.message : String(error) });
		});
		return loader;
	});
}

function presentOutcome(pi: ExtensionAPI, ctx: ExtensionCommandContext, outcome: TerminalOutcome): void {
	const text = JSON.stringify(outcome, null, 2);
	pi.sendMessage({ customType: "implementation-loop", content: text, display: true });
	if (ctx.hasUI) {
		ctx.ui.notify(
			outcome.status === "APPROVED" ? "Implementation loop approved" : `Implementation loop: ${outcome.status}`,
			outcome.status === "APPROVED" ? "info" : outcome.status === "FAILED" ? "error" : "warning",
		);
	}
}
