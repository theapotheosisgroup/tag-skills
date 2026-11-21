---
name: tag-tdd
description: Test-driven development for TAG engineering changes, with behavior-focused tests at agreed seams. Use when building a feature or fixing a bug test-first, when the user mentions red-green-refactor, or asks for integration tests. Not for client bookkeeping or reporting work.
license: MIT (upstream, see LICENSE and NOTICE.md); TAG additions UNLICENSED.
---

# Test-driven development (TAG)

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle: consult them before and during the loop, not after.

## Context you need, and where it comes from

- **The repository's test commands and conventions**: its `AGENTS.md` (or `CLAUDE.md`), `CONTRIBUTING.md` and the organization standards they link (in TAG, `standards/TESTING.md` in theapotheosisgroup/.github: tests block merges, synthetic data only, results reported as PASS, FAIL or BLOCKED with evidence).
- **The domain language**: `GLOSSARY.md` if it exists, so test names and interface vocabulary match the project's terms, and the ADRs in the area you are touching.
- **The behavior wanted**: the issue, spec or user request.

Capability bindings: none. The skill works in the local checkout with the host's own tools.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification: "user can checkout with valid cart" tells you exactly what capability exists, and it survives refactors because it doesn't care about internal structure.

See [references/tests.md](references/tests.md) for examples and [references/mocking.md](references/mocking.md) for mocking guidelines.

## Seams: where tests go

A **seam** is the public boundary you test at: the interface where you observe behavior without reaching inside. Tests live at seams, never against internals.

**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam. You can't test everything, so agreeing the seams up front is how testing effort lands on the critical paths and complex logic instead of every edge case.

Ask: "What's the public interface, and which seams should we test?" Give each proposed seam a one-line note on what it catches and what it misses. If the user is unavailable and the seam is obvious from an existing test suite, state your choice and proceed.

When the shape of that interface is itself in question (how deep the module is, where the seam belongs, what the interface should expose), use the `tag-codebase-design` skill for the vocabulary: module, interface, depth, seam, adapter, leverage, locality. It is a reference to consult, not a session to run.

## Anti-patterns

- **Implementation-coupled**: mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of using the interface). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological**: the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth: a known-good literal, a worked example, the spec. For financial calculations, an independently worked fixture.
- **Horizontal slicing**: writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior. Work in **vertical slices** instead: one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Procedure

1. **Agree the seams.** Completion: the seams are written down and confirmed (or stated, if the user is away).
2. **Red.** Write one failing test at one seam and run it. Completion: you have seen it fail for the expected reason.
3. **Green.** Write only enough code to pass it; don't anticipate future tests or add speculative features. Completion: the test passes and the rest of the suite still passes.
4. **Repeat** one slice at a time until the agreed behavior is covered.
5. **Hand off to review.** Refactoring is not part of the loop; it belongs to the review stage (`tag-code-review`). Completion: the repository's full check commands (from `AGENTS.md`) pass locally.

## Output

The tests and code in the working tree, and a short report: seams tested, commands run with their exit codes and test counts, and anything left untested and why.

## When something is missing

- **No test runner or no command in `AGENTS.md`:** look in `package.json`, `pyproject.toml` or the CI workflow; if none exists, ask before adding test tooling.
- **Behavior unclear:** ask for the spec rather than test an imagined behavior.
- **A test cannot run here** (needs credentials, a live provider or production data): never fake a pass. Report it as BLOCKED, and use synthetic fixtures or a local adapter where the repository's standards allow.
- **Review:** changes go through the repository's pull request review; this skill never merges.
