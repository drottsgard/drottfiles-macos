---
name: Coding Standards
description: General coding standards for implementation and code review.
metadata:
  opencode/autoinvoke: false
---

# Coding Standards

Apply these standards to the behavior being changed. Repository-specific instructions and established conventions take precedence.

## Decision priority

1. Preserve correctness, safety, and debuggability.
2. Follow repository-specific instructions and established conventions.
3. Apply standards consistently to the behavior being changed.
4. Keep unrelated behavior unchanged.
5. Prefer the simplest correct design and least code.
6. Record only meaningful, non-obvious trade-offs.

## Principles

- Parse external data at the edge.
- Make invalid states difficult to represent.
- Keep expected failures explicit.
- Prefer a functional core with an imperative shell.
- Design deep, cohesive modules with small interfaces.
- Require every abstraction to pass the deletion test: removing it should make necessary complexity reappear rather than disappear.
- Keep dependencies and side effects at clear seams.
- Validate with the repository's established mechanisms.
- Prefer readable, direct code over cleverness.
- Avoid speculative abstractions and unrelated cleanup.
