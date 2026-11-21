---
name: tag-domain-modeling
description: Build and sharpen a TAG project's domain model - challenge terms, stress-test them with scenarios, and keep GLOSSARY.md and ADRs current, with precise meanings for organization, entity, agent, nexus, delegation, mandate, Matter and Expectation. Use when discussing codebase terminology, writing or editing a glossary, or recording or editing an ADR.
license: MIT (upstream, see LICENSE and NOTICE.md); TAG additions UNLICENSED.
---

# Domain modeling (TAG)

Actively build and sharpen the project's domain model as you design. This is the *active* discipline: challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `GLOSSARY.md` for vocabulary is not this skill: that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## Context you need, and where it comes from

- **The repository's existing glossary and ADRs**: `GLOSSARY.md` (or `GLOSSARY-MAP.md`, or a `CONTEXT.md` as aletia uses) and `docs/adr/`.
- **TAG's shared terms**: [references/TAG-TERMS.md](references/TAG-TERMS.md) holds working definitions of organization, entity, person, agent, nexus, delegation, mandate, Expectation and Matter, each with the repository that owns the concept. The owning repository's documentation wins over that file; when they disagree, raise it.
- **The code**, to cross-check what the user says.

Capability bindings: none.

## File structure

Most repos have a single context:

```text
/
├── GLOSSARY.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `GLOSSARY-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```text
/
├── GLOSSARY-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── GLOSSARY.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── GLOSSARY.md
│       └── docs/adr/
```

Create files lazily: only when you have something to write. If no `GLOSSARY.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Hold TAG's terms precisely

TAG's core terms are easy to blur: an **organization** is not an **entity**, a **mandate** is a specific delegation and not an agent's general permissions, and an **Expectation** is a recorded obligation, not a task. Never call an organization a "practice", "firm" or "workspace": list those under `_Avoid_`. **Matter** is not yet an implemented model in any TAG repository; mark any definition of it *proposed* until its owner implements it.

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `GLOSSARY.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account': do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"

### Update GLOSSARY.md inline

When a term is resolved, update `GLOSSARY.md` right there. Don't batch these up: capture them as they happen. Use the format in [references/GLOSSARY-FORMAT.md](references/GLOSSARY-FORMAT.md).

`GLOSSARY.md` should be totally devoid of implementation details. Do not treat `GLOSSARY.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Follow the repository's existing ADR format when it has one (TAG repositories use Status, Date, Deciders, Context, Decision, Consequences and Alternatives considered); otherwise use [references/ADR-FORMAT.md](references/ADR-FORMAT.md).

## Procedure

1. **Read the current model**: glossary, ADRs and TAG-TERMS.md. Completion: you know which terms already exist.
2. **Challenge and sharpen** as the conversation goes (above). Completion: every term the user relied on is either in the glossary or flagged as unresolved.
3. **Write as terms resolve**, one edit per resolved term, and an ADR only when the three tests pass.
4. **Report** at the end of the session.

## Output

Edits to `GLOSSARY.md` and `docs/adr/` in the working tree, and a short list: terms added or changed, terms still unresolved, contradictions found between the user, the code and the owning repositories.

## When something is missing

- **The concept belongs to another repository** (for example organizations and delegation in aletia, Expectations on the TRUSS ledger): record the definition here only as a pointer to the owner; propose changes to the owner, do not redefine it.
- **The user is unsure:** leave the term unresolved and say what scenario would settle it, rather than guessing.
- **Review:** glossary and ADR changes go through the repository's pull request review like code.
