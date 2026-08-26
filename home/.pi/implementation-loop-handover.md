# Implementation Loop — Implementation Handover

## Purpose

Build a non-interactive Pi extension that receives a complete build brief and runs an isolated implementation/review loop in the current repository.

The extension coordinates work mechanically. It does not interpret findings, contribute technical opinions, or ask the human questions after execution starts.

## Deliverables

```text
home/.pi/
├── agent/
│   ├── extensions/
│   │   └── implementation-loop/
│   │       ├── index.ts
│   │       ├── README.md
│   │       ├── workflow.ts
│   │       ├── agent-runner.ts
│   │       ├── git-snapshot.ts
│   │       ├── contracts.ts
│   │       └── prompts/
│   │           ├── implementor.md
│   │           └── reviewer.md
│   └── skills/
│       └── coding-standards/
│           └── SKILL.md
└── implementation-loop-handover.md
```

This is a starting decomposition, not a requirement to create shallow pass-through modules. Combine files when a proposed module hides no meaningful complexity.

A dedicated `package.json` and `tsconfig.json` are not required initially. Pi loads TypeScript extensions through `jiti` and provides Node built-ins, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, `@earendil-works/pi-tui`, and `typebox` to extensions. Add package metadata only if a genuine third-party runtime dependency is introduced.

## Roles

### Workflow Runner

The Pi extension is the Workflow Runner. It is deterministic code, not an LLM role.

It:

- validates invocation input;
- captures repository snapshots;
- starts isolated Pi subprocesses;
- supplies explicit handoffs;
- parses and validates structured results;
- applies retry and transition rules;
- tracks review revisions;
- returns the terminal result; and
- cleans up child processes and temporary resources.

It must not judge findings, edit code, reinterpret verdicts, or decide that a blocking finding is unimportant.

### Implementor

The Implementor:

- receives the original build brief on every invocation;
- inspects repository-local instructions and conventions;
- implements or revises the change in the shared working tree;
- runs all relevant validation;
- fixes validation failures caused by its work where possible; and
- returns a structured `COMPLETED` or `BLOCKED` handoff.

The Implementor is the only role permitted to edit files or run validation commands.

### Reviewer

The Reviewer:

- runs in a fresh, isolated context;
- receives the produced change set, applicable coding standards, repository context, and the Implementor's validation handoff;
- inspects intrinsic code correctness, code quality, and coding-standards compliance;
- distinguishes blocking findings from advisory notes; and
- returns a structured `APPROVED` or `CHANGES_REQUESTED` verdict.

The Reviewer does **not**:

- assess whether the implementation fulfills the original build brief;
- receive authority to reinterpret the requested behavior;
- edit files; or
- run tests, linters, builds, type checks, or other validation commands.

The Reviewer may identify an obvious intrinsic defect without comparing the code to the build brief. It may also issue a blocking finding when applicable standards require validation that the Implementor omitted.

## Invocation

Register this command:

```text
/implementation-loop <build brief>
```

Support a file-backed brief:

```text
/implementation-loop @docs/change-request.md
```

Rules:

- Treat the supplied brief as complete.
- Begin without asking clarifying questions.
- Resolve a referenced file relative to the current working directory.
- A missing, empty, or unreadable brief is `FAILED`.
- Running outside a Git repository is `FAILED`.
- Once execution begins, never prompt for human input.

## Agent isolation

Follow Pi's bundled subagent example as the process-integration reference:

```text
@earendil-works/pi-coding-agent/examples/extensions/subagent/
```

Each agent invocation must:

- spawn a separate Pi process;
- use `pi --mode json -p --no-session`;
- run in the invoking repository's working directory;
- inherit the invoking session's model and thinking level initially;
- receive its Runner-owned role prompt;
- stream or capture structured Pi events rather than scraping terminal formatting; and
- be terminated when the parent operation is cancelled.

Every Implementor and Reviewer invocation starts with a fresh context. The shared filesystem carries code state; explicit handoffs carry intent and findings. Do not depend on prior agent conversation state.

Keep role prompts under the extension's own `prompts/` directory. Project-local agent definitions must not override these prompts. Normal trusted repository context such as `AGENTS.md` should still be discovered by each Pi subprocess.

## Workflow

```text
START
  |
  v
Capture baseline repository tree
  |
  v
IMPLEMENT
  |-- BLOCKED ------------------------------> HUMAN_REQUIRED
  |
  `-- COMPLETED
        |
        v
      Capture current tree and derive run diff
        |
        v
      REVIEW
        |-- APPROVED ------------------------> APPROVED
        |
        `-- CHANGES_REQUESTED
              |
              | reviewRevisionCount < 3
              v
            REVISE + VALIDATE
              |
              `--------------------------------> REVIEW

After the third revision, perform one final review:

  final APPROVED --------------------------------> APPROVED
  final CHANGES_REQUESTED ------------------------> HUMAN_REQUIRED
```

`maxReviewRevisions` defaults to `3`. This means the Implementor receives up to three opportunities to address Reviewer findings. It does not mean stopping before the third set of findings can be addressed.

Every revision handoff must include:

- the original build brief;
- the latest blocking findings;
- the current shared-worktree state; and
- an instruction to implement the required changes and rerun validation.

Do not send advisory notes to the Implementor. Advisory notes are explicitly non-blocking and must not be converted into requirements by the Runner.

## Failure and retry policy

Infrastructure and protocol failures are not review change requests and do not consume `maxReviewRevisions`.

Examples include:

- child-process startup or abnormal exit;
- model/provider failure;
- timeout;
- malformed structured output; and
- output that fails schema validation.

Retry a failed agent invocation once with the same logical input and a fresh process. If the retry also fails, return `HUMAN_REQUIRED` with diagnostics.

Cancellation should terminate active child processes, clean temporary resources, and return a cancelled failure result appropriate to Pi's command lifecycle. It must not leave a background agent running.

## Structured contracts

Use runtime validation at the subprocess-output seam. Do not infer state transitions from prose.

### Implementor result

Completed example:

```json
{
  "status": "COMPLETED",
  "summary": [
    "Added an idempotency guard around the package installation"
  ],
  "validation": [
    {
      "command": "bash -n bootstrap/install/example.sh",
      "status": "PASSED",
      "summary": "Shell syntax is valid"
    }
  ],
  "notes": []
}
```

Blocked example:

```json
{
  "status": "BLOCKED",
  "summary": [],
  "validation": [],
  "notes": [
    "Validation requires credentials that are unavailable in this environment"
  ]
}
```

The Implementor must not return `COMPLETED` while known validation failures caused by its changes remain. If it cannot resolve such failures, it returns `BLOCKED`.

The validation list records every relevant command run, its status, and a concise result summary. When the repository has no applicable automated command, the handoff should say so explicitly rather than inventing one.

### Reviewer result

Approval example:

```json
{
  "verdict": "APPROVED",
  "blockingFindings": [],
  "advisoryNotes": [
    {
      "summary": "Consider extracting the repeated conversion if it gains another caller",
      "location": "src/example.ts:42",
      "rationale": "This may improve locality later but does not currently justify another abstraction"
    }
  ]
}
```

Changes-requested example:

```json
{
  "verdict": "CHANGES_REQUESTED",
  "blockingFindings": [
    {
      "standard": "Repository scripts must be idempotent",
      "location": "bootstrap/install/example.sh:12",
      "problem": "The command runs unconditionally",
      "requiredChange": "Guard the operation before executing it"
    }
  ],
  "advisoryNotes": []
}
```

Contract invariants:

- `APPROVED` requires an empty `blockingFindings` array.
- `CHANGES_REQUESTED` requires at least one blocking finding.
- A blocking finding must identify the applicable standard, location, concrete problem, and required correction.
- Advisory notes may accompany either verdict.
- Optional improvements alone must not produce `CHANGES_REQUESTED`.
- Final agent output should be exactly one JSON object with no surrounding prose so parsing remains deterministic.

## Repository snapshots and review scope

Invocation may start from a dirty working tree. Review only the filesystem delta produced during this run, not unrelated pre-existing work.

Use Git trees created through a temporary index:

1. Create a temporary index without replacing or modifying the user's real index.
2. Seed it from `HEAD`, or an empty tree for an unborn repository.
3. Stage the current working-tree state into the temporary index, including tracked changes, deletions, and untracked non-ignored files.
4. Write the baseline tree.
5. Repeat after each Implementor handoff to produce the current tree.
6. Diff the baseline tree against the current tree for Reviewer scope and final reporting.

Requirements:

- Do not change the user's index, refs, commits, or branches.
- Do not stash, reset, checkout, or commit user work.
- Include untracked non-ignored files created by the loop.
- Preserve the actual shared working tree for the human when the workflow ends.
- Clean temporary indexes and prompt files in `finally` paths.

## Coding standards

Create a concise, general coding-standards skill. Do not copy the reference skill's Effect-, Cloudflare-, persistence-, or organization-specific material.

Repository-specific instructions take precedence over general standards.

### Decision priority

1. Preserve correctness, safety, and debuggability.
2. Follow repository-specific instructions and established conventions.
3. Apply standards consistently to the behavior being changed.
4. Keep unrelated behavior unchanged.
5. Prefer the simplest correct design and least code.
6. Record only meaningful, non-obvious trade-offs.

### Core principles

- Parse external data at the edge.
- Make invalid states difficult to represent.
- Keep expected failures explicit.
- Prefer a functional core with an imperative shell.
- Design deep, cohesive modules with small interfaces.
- Require every abstraction to pass the deletion test.
- Keep dependencies and side effects at clear seams.
- Validate using the repository's established mechanisms.
- Prefer readable, direct code over cleverness.
- Avoid speculative abstractions and unrelated cleanup.

The Runner must ensure both roles receive these standards in a deterministic way; do not rely on an agent spontaneously deciding to invoke the skill. Repository-local instructions discovered by Pi remain authoritative when rules conflict.

## Clean-code requirements

Expose one deep workflow interface and keep Pi-specific command registration thin.

- Keep `index.ts` limited to command registration, presentation, and dependency wiring.
- Put transition policy in a deterministic workflow module, not scattered event-handler branches.
- Model workflow states and role results with discriminated unions.
- Centralize contract parsing and runtime validation.
- Keep subprocess management and Git operations out of workflow policy.
- Accept dependencies at the workflow seam rather than constructing them inside policy code.
- Centralize retry and review-limit semantics.
- Use domain names such as `reviewRevisionCount`, not generic names such as `attempts`.
- Keep functions focused while avoiding shallow pass-through wrappers.
- Add comments only for invariants, non-obvious Git behavior, and Pi lifecycle constraints.
- Return structured outcomes rather than communicating through hidden side effects.
- Keep rendering, process execution, state transitions, and Git operations separate.
- Clean child processes and temporary files on success, failure, timeout, and cancellation.

Do not add automated tests or test files for this initial implementation.

## Terminal results

The command returns one structured terminal outcome.

### `APPROVED`

Include:

- number of completed review revisions;
- changed files from the run diff;
- Implementor summary;
- validation evidence; and
- Reviewer advisory notes.

### `HUMAN_REQUIRED`

Use when:

- the final review still requests changes after three revisions;
- the Implementor returns `BLOCKED`; or
- an infrastructure/protocol invocation fails twice.

Include the reason, current changed files, latest Implementor handoff, latest Reviewer findings when available, and actionable failure diagnostics. Do not prompt interactively.

### `FAILED`

Use when execution cannot begin, including missing input, unreadable referenced input, or invocation outside a Git repository.

## Human-facing README

Keep `README.md` short and operational. It should contain approximately this level of detail:

```markdown
# Implementation Loop

Runs a complete build request through an isolated implementation and review loop.

## Flow

IMPLEMENT
  → Implementor changes and validates the code
  → Reviewer checks code quality and coding standards
    → APPROVED: finish
    → CHANGES_REQUESTED: return blocking findings to Implementor
  → Repeat for up to three revision attempts
  → If unresolved: HUMAN_REQUIRED

The agents use separate context windows and the same working tree.
The Reviewer does not modify files, run validation, or assess whether the
original build request was fully satisfied.
```

## Manual acceptance checks

Do not add an automated test suite. The Implementor should still validate the extension manually and report the commands/results in its structured handoff.

At minimum, confirm that:

- Pi discovers and loads the extension without import/runtime errors;
- `/implementation-loop` appears and rejects missing input cleanly;
- file-backed briefs resolve correctly;
- an Implementor and Reviewer run in separate Pi subprocesses;
- subprocess cancellation terminates the child;
- structured outputs are validated;
- malformed output receives one retry;
- a review change request returns to a fresh Implementor context;
- three revisions permit one final review;
- terminal outcomes contain the required information; and
- temporary files and indexes are removed.

Use a disposable Git repository for destructive or stateful manual scenarios. Do not run workflow acceptance scenarios against valuable uncommitted work.

## Out of scope

- Specification or change-request fidelity review
- Interactive questions during execution
- Reviewer file edits or validation execution
- A separate Validator role
- Parallel Implementor/Reviewer execution
- Project-local replacement of Runner-owned role prompts
- Per-role model configuration in the initial version
- Non-Git repositories
- Automated tests or test infrastructure
- Effect- or Cloudflare-specific coding standards
