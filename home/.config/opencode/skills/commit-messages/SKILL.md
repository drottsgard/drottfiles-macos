---
name: commit-messages
description: Write problem-first Git commit messages. Use when the user asks to draft, revise, explain, or create a commit message, or asks to commit changes.
---

# Commit Messages

A commit message is a compact engineering decision record: explain why the change exists, then record the decisions that would otherwise be lost in the diff.

## Process

1. Read the repository's commit-message instructions and recent history. Inspect the exact staged diff when committing; otherwise inspect the diff the user identifies. This step is complete when the message's conventions and every claim are supported by the repository or the conversation.
2. Identify the root problem or constraint. Distinguish it from the visible symptom and from the implementation. This step is complete when one plain-language sentence explains why the old behavior was wrong or why the change was necessary.
3. Identify the consequential decisions: why this approach was chosen, important constraints, deliberate reuse, tradeoffs, and future migration seams. Include only decisions a reader cannot recover easily from the diff. This step is complete when every included decision helps explain or maintain the change.
4. Write the message and test it against the diff. Remove file lists, code narration, unsupported intent, and repeated ideas. This step is complete when the title accurately summarizes the outcome and the body explains the problem and decisions without requiring the ticket or chat for context.

## Shape

- Follow repository conventions first, including ticket prefixes and line wrapping.
- Use an imperative title that describes the outcome, not the act of editing.
- Lead the body with the root problem, mistaken assumption, or user-facing constraint.
- Follow with the chosen approach and the reasons behind decisions that matter.
- Use plain language and concrete nouns.
- Keep the message proportional: omit the body when the title fully preserves the rationale.

## Quality check

Before presenting or using the message, verify:

- The problem is not merely a symptom.
- The message says why, rather than inventorying what changed.
- Every claim matches the diff and known context.
- The title and body add different information.
- The message will still make sense to someone reading history months later.

When revising a message, fix the underlying framing instead of replacing one sentence locally while preserving a misleading premise elsewhere.
