---
name: pull-request-descriptions
description: Write concise, scope-first pull request descriptions. Use when the user asks to draft, simplify, or revise a PR description from a branch, diff, or stated changes.
---

# Pull Request Descriptions

A pull request description is a concise scope map: what changed, useful review evidence, and relevant work intentionally left for follow-up.

## Process

If the user provides their own draft, treat its vocabulary and level of detail as the primary style guide. Revise it lightly for accuracy, consistency, and grammar instead of rewriting it from scratch.

Prefer the shortest accurate scope summary over a detailed explanation. Name the feature or capability first and omit conditions, states, and implementation qualifiers unless they are necessary to understand the scope. Supporting behavior such as loading, authorization, and error handling may be included as a broad scope area when it represents a meaningful part of the completed work.

1. Identify the PR's base and inspect the commits and complete diff against it. Follow repository instructions and use context supplied by the user. This step is complete when every statement can be supported by the change or conversation.
2. Group the diff and commits into distinct completed scope areas. Include meaningful foundation work such as loading or authorization, but combine conditional branches of one capability rather than presenting each state as a separate outcome. Describe each area at the simplest useful level, using product language where natural but retaining technical terms the user already uses. Do not introduce more specific domain language than the diff or user supplied. This step is complete when every meaningful scope area is represented once.
3. Draft a `## What was done` heading followed by one to four short bullets. Start with the broadest wording that remains accurate, such as `Added the [feature] page` or `Added [capability] support`. Add a qualifier only when removing it would make the claim misleading or hide a material boundary. State only what now exists, works, or behaves differently. This step is complete when a reviewer can understand the implemented scope without reading implementation detail, rationale, or process narration.
4. Resolve review evidence. If the user supplied an evidence plan, use it; if they explicitly declined attachments, omit it. Otherwise, propose one or two concrete screenshots or GIF flows based on the changed behavior and ask whether they will add one. Offer to work out the manual verification and recording steps. Never claim that evidence is attached. This step is complete when the user has chosen an attachment, chosen different evidence, or declined attachments.
5. If the user wants manual verification help, inspect the relevant routes, feature flags, authentication state, and test-data requirements. Give concise setup, starting state, actions, expected result, and useful recording boundaries. Ask for unavailable credentials, tokens, or environment details rather than inventing them. This step is complete when the user can reproduce the behavior and knows what to capture.
6. Resolve follow-ups. If the user supplied relevant tickets, use them; if they explicitly said there are none, omit the section. Otherwise, ask whether visible or adjacent behavior belongs to another ticket, accepting `no follow-ups` as a complete answer. Never invent ticket references. This step is complete when every included ticket clarifies a likely scope misunderstanding and the user has confirmed there are no others to add.
7. Finalize and prune the description. Remove tests, file lists, incidental refactors, low-level implementation details, unrelated tickets, and evidence that does not help review the behavior. Keep internal behavior when it materially defines the PR scope, such as authorization, loading, migration, or compatibility handling. Merge overlapping bullets and remove claims implied by stronger ones. This step is complete when every remaining item communicates a completed change, demonstrates it, or clarifies its boundary.

When evidence and follow-ups are both unresolved, ask about them together rather than making the user answer two rounds of questions.

## Output

- Use `## What was done` for the change summary.
- If the user confirms an attachment, provide a factual one-sentence caption and say where to insert the media in Bitbucket. Keep that instruction outside the ready-to-paste description.
- Add `## Follow-ups` only when relevant follow-up work has been provided.
- Return the ready-to-paste description after the evidence and follow-up branches are resolved.

## Style

- Use plain, concrete language and past tense.
- Prefer simple feature names and user purpose over internal states or technical mechanisms.
- Match the simplicity of any wording supplied by the user.
- Prefer familiar constructions such as “Added…” over elaborate outcome wording.
- Do not expand a simple claim into several inferred behaviors.
- Preserve accurate user-written bullets unless changing them clearly improves correctness or readability.
- Use one idea per bullet and avoid unnecessary qualifiers.
- Avoid adjectives such as `responsive` and state labels such as `limited session` or `upgraded session` unless they define an important scope boundary.
- Use broad engineering terms such as `loading and authorization handling` when that work is a meaningful scope area; do not enumerate its internal states.
- When the diff clearly states why a capability exists, prefer that purpose over its mechanism, such as `sign-in support for recovering previous answers` rather than `session upgrade support`.
- Before finalizing, remove each modifier in turn and keep it only if the description becomes inaccurate without it.
- Keep each bullet to one sentence.
- Match the change's actual scope; do not infer intent from ticket names alone.
- Clearly distinguish implemented behavior from future work.
- Keep evidence captions factual: describe the demonstrated path and outcome.
- Mention follow-up tickets only when they clarify what the PR does not include.
