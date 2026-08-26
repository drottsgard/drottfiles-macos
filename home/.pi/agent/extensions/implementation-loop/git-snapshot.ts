import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { RunDiff } from "./contracts";

interface ExecResult {
	stdout: string;
	stderr: string;
	code: number;
}

export class GitSnapshots {
	private constructor(
		private readonly pi: ExtensionAPI,
		readonly repositoryRoot: string,
		private readonly temporaryDirectory: string,
		private readonly indexPath: string,
	) {}

	static async create(pi: ExtensionAPI, cwd: string, signal: AbortSignal): Promise<GitSnapshots> {
		const rootResult = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd, signal });
		if (rootResult.code !== 0) throw new Error("The current working directory is not inside a Git repository");

		const repositoryRoot = rootResult.stdout.trim();
		const temporaryDirectory = await mkdtemp(join(tmpdir(), "pi-implementation-loop-"));
		return new GitSnapshots(pi, repositoryRoot, temporaryDirectory, join(temporaryDirectory, "index"));
	}

	async capture(signal: AbortSignal): Promise<string> {
		await rm(this.indexPath, { force: true });
		const head = await this.git(["rev-parse", "--verify", "HEAD^{tree}"], signal, true);
		if (head.code === 0) await this.git(["read-tree", head.stdout.trim()], signal);
		else await this.git(["read-tree", "--empty"], signal);

		// A private index lets us include tracked changes, deletions, and untracked
		// non-ignored files without touching the user's real staging area.
		await this.git(["add", "-A", "--", "."], signal);
		return (await this.git(["write-tree"], signal)).stdout.trim();
	}

	async diff(baselineTree: string, currentTree: string, signal: AbortSignal): Promise<RunDiff> {
		const [names, patch] = await Promise.all([
			this.git(["diff-tree", "--no-commit-id", "--name-only", "-r", baselineTree, currentTree], signal),
			this.git(["diff-tree", "--no-commit-id", "-p", "--binary", "-r", baselineTree, currentTree], signal),
		]);
		return {
			changedFiles: names.stdout
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean),
			patch: patch.stdout,
		};
	}

	async cleanup(): Promise<void> {
		await rm(this.temporaryDirectory, { recursive: true, force: true });
	}

	private async git(args: string[], signal: AbortSignal, allowFailure = false): Promise<ExecResult> {
		const result = await this.pi.exec("env", [`GIT_INDEX_FILE=${this.indexPath}`, "git", ...args], {
			cwd: this.repositoryRoot,
			signal,
		});
		if (!allowFailure && result.code !== 0) {
			throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim() || `exit ${result.code}`}`);
		}
		return result;
	}
}
