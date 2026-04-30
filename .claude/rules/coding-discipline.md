# Coding Discipline

Behavior rules for Claude Code when writing or editing code in this repo. Adapted from Andrej Karpathy's observations on common LLM coding pitfalls (the viral CLAUDE.md, distilled by Forrest Chang). These are not project context, they are how the agent should operate.

## 1. Think Before Coding

State assumptions explicitly before writing code. If something is ambiguous, ask. Surface multiple interpretations when they exist instead of silently picking one. If you find inconsistencies in the request or the existing code, flag them. Do not proceed past a real uncertainty just to keep momentum.

## 2. Simplicity First

Write the minimum code that solves the actual problem. Nothing speculative.

- No abstractions, helpers, or wrappers that are not needed today.
- No error handling for cases that cannot happen.
- No fallbacks, feature flags, or backwards-compat shims unless explicitly requested.
- No new files when an existing one fits.
- Three similar lines beat a premature abstraction.

## 3. Surgical Changes

Touch only what the task requires.

- No drive-by refactors, renames, or reformat-on-save sweeps.
- Match the existing style of the file you are editing, not your preferred style.
- Clean up only your own mess. Leave unrelated code alone.
- If you must change something outside the requested scope, stop and ask first.

## 4. Goal-Driven Execution

Convert the task into verifiable success criteria before implementing.

- State the steps you will take and how you will verify each one.
- For non-trivial work, write the success check first, then build to it.
- A task is done when the success criteria pass, not when the code "looks right".
- If you cannot verify it (no tests, no UI, no runtime check), say so explicitly instead of claiming success.

---

These rules apply project-wide. They override defaults toward speed or completeness when the two conflict. When in doubt, do less and ask.
