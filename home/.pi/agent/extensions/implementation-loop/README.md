# Implementation Loop

Runs a complete build request through an isolated implementation and review loop.

## Flow

```
IMPLEMENT
  → Implementor changes and validates the code
  → Reviewer checks code quality and coding standards
    → APPROVED: finish
    → CHANGES_REQUESTED: return blocking findings to Implementor
  → Repeat for up to three revision attempts
  → If unresolved: HUMAN_REQUIRED
```

The agents use separate context windows and the same working tree. The Reviewer does not modify files, run validation, or assess whether the original build request was fully satisfied.

## Agents

| Agent | Responsibility | Tools |
| --- | --- | --- |
| Implementor | Implements or revises the change and runs relevant validation | Pi's default coding tools |
| Reviewer | Reviews intrinsic correctness, code quality, and standards compliance | Read-only `read`, `grep`, `find`, and `ls` |

The Workflow Runner is deterministic extension code, not an agent. It validates inputs and handoffs, captures Git snapshots, applies retries and transitions, and manages subprocess cleanup.

## Skills

Both agents receive the Runner-owned `coding-standards` skill on every invocation. It covers correctness, repository conventions, simple designs, deep modules, explicit failures, clear side-effect seams, and repository-established validation.

Repository-local instructions such as `AGENTS.md` remain authoritative and are discovered by each subprocess. Other installed Pi skills remain discoverable normally; the workflow does not assign them as required role skills.

## Usage

Run with an inline or file-backed brief:

```
/implementation-loop <build brief>
/implementation-loop @docs/change-request.md
```
