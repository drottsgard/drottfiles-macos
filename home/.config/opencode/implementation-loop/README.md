# Implementation Loop

Runs a build request through OpenCode V2 implementation and review subagents.

## Flow

```text
ORCHESTRATE
  -> Implementor changes and validates the code
  -> Reviewer checks intrinsic correctness and coding standards
    -> APPROVED: finish
    -> CHANGES_REQUESTED: return blocking findings to a fresh Implementor
    -> BLOCKED: HUMAN_REQUIRED without consuming a revision
  -> Repeat for up to three revision attempts
  -> If unresolved: HUMAN_REQUIRED
```

The Orchestrator is a primary agent. It launches each role as a foreground
subagent, so every role gets a fresh context while sharing the active working
tree. The Orchestrator cannot edit files, run shell commands, review code, or
launch agents outside this workflow.

## Agents

| Agent | Responsibility | Access |
| --- | --- | --- |
| Orchestrator | Resolves the brief, sequences roles, validates handoffs, and applies retry and revision limits | Read briefs and launch the two workflow subagents |
| Implementor | Implements or revises the change and runs relevant validation | Coding tools, without questions or nested subagents |
| Reviewer | Reviews intrinsic correctness, regressions, validation evidence, and standards compliance | Read/search tools and read-only `git status`/`git diff` |

The Reviewer does not modify files, run validation, assess product intent, or
decide whether the original build request was fully satisfied.

## Skills

Both worker agents must load the global `coding-standards` skill before doing
their role-specific work. Repository-local instructions such as `AGENTS.md` and
established conventions remain authoritative.

If the skill cannot be found or loaded, the worker stops without doing its
role-specific work. An Implementor reports BLOCKED. A Reviewer reports BLOCKED,
and the Orchestrator returns HUMAN_REQUIRED without consuming a revision.

## Usage

Run with an inline brief or a path relative to the active working directory:

```text
/implementation-loop <build brief>
/implementation-loop @docs/change-request.md
```

OpenCode V2 command templates do not attach `@path` automatically. The
Orchestrator recognizes that syntax and reads the file before launching the
Implementor.

## Native-loop limitations

This workflow is coordinated by an agent rather than deterministic extension
code. Retry limits, revision limits, and JSON contracts are prompt-enforced.
OpenCode permissions enforce the role boundaries, but no runtime schema parser
validates handoffs.

There is no private Git baseline snapshot. The Implementor reports its changed
files, while the Reviewer can inspect the current working-tree status and diff.
Pre-existing changes may therefore appear in the review, and the changed-file
handoff is not independently verified. Cancellation, progress display, and
child-session cleanup use OpenCode's normal session behavior.
