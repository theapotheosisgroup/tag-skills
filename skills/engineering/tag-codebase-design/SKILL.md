---
name: tag-codebase-design
description: Shared vocabulary and principles for designing deep modules with small public interfaces and clear boundaries in TAG code. Use when designing or improving a module's interface, finding deepening opportunities, deciding where a seam goes, making code more testable, or when another skill needs the module, interface, seam and adapter vocabulary.
license: MIT (upstream, see LICENSE and NOTICE.md); TAG additions UNLICENSED.
---

# Codebase design (TAG)

Design **deep modules**: a lot of behaviour behind a small interface, placed at a clean seam, testable through that interface. Use this language and these principles wherever code is being designed or restructured. The aim is leverage for callers, locality for maintainers, and testability for everyone.

This is reference, not a session: other skills (`tag-tdd`, `tag-code-review`, `tag-diagnosing-bugs`) consult it for vocabulary.

## Context you need, and where it comes from

- **The code in question** and its callers, read in the local checkout.
- **The repository's boundaries**: its `ARCHITECTURE.md` ("owns", "does not own", forbidden dependencies), `AGENTS.md` invariants and ADRs. In TAG, repository boundaries are themselves seams: a module never reaches across them except through the owning repository's published contract (an API, MCP tool or package), so a deepening that would move logic into the wrong repository is the wrong design.
- **The domain language**: `GLOSSARY.md` if it exists.

Capability bindings: none.

## Glossary

Use these terms exactly: don't substitute "component," "service," "API," or "boundary." Consistent language is the whole point.

**Module**: anything with an interface and an implementation. Deliberately scale-agnostic: a function, class, package, or tier-spanning slice. _Avoid_: unit, component, service.

**Interface**: everything a caller must know to use the module correctly: the type signature, but also invariants, ordering constraints, error modes, required configuration, and performance characteristics. _Avoid_: API, signature (too narrow, they refer only to the type-level surface).

**Implementation**: what's inside a module, its body of code. Distinct from **Adapter**: a thing can be a small adapter with a large implementation (a Postgres repo) or a large adapter with a small implementation (an in-memory fake). Reach for "adapter" when the seam is the topic; "implementation" otherwise.

**Depth**: leverage at the interface. The amount of behaviour a caller (or test) can exercise per unit of interface they have to learn. A module is **deep** when a large amount of behaviour sits behind a small interface, **shallow** when the interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_: a place where you can alter behaviour without editing in that place; the _location_ at which a module's interface lives. Where to put the seam is its own design decision, distinct from what goes behind it. _Avoid_: boundary (overloaded with DDD's bounded context).

**Adapter**: a concrete thing that satisfies an interface at a seam. Describes _role_ (what slot it fills), not substance (what's inside).

**Leverage**: what callers get from depth. More capability per unit of interface they learn. One implementation pays back across N call sites and M tests.

**Locality**: what maintainers get from depth. Change, bugs, knowledge, and verification concentrate in one place rather than spreading across callers. Fix once, fixed everywhere.

## Deep vs shallow

**Deep module** = small interface + lots of implementation:

```text
┌─────────────────────┐
│   Small Interface   │  ← Few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← Complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid):

```text
┌─────────────────────────────────┐
│       Large Interface           │  ← Many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← Just passes through
└─────────────────────────────────┘
```

When designing an interface, ask:

- Can I reduce the number of methods?
- Can I simplify the parameters?
- Can I hide more complexity inside?

## Principles

- **Depth is a property of the interface, not the implementation.** A deep module can be internally composed of small, mockable, swappable parts; they just aren't part of the interface. A module can have **internal seams** (private to its implementation, used by its own tests) as well as the **external seam** at its interface.
- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a pass-through. If complexity reappears across N callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. If you want to test _past_ the interface, the module is probably the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.** Don't introduce a seam unless something actually varies across it.

## Designing for testability

Good interfaces make testing natural:

1. **Accept dependencies, don't create them.**

   ```typescript
   // Testable
   function processOrder(order, paymentGateway) {}

   // Hard to test
   function processOrder(order) {
     const gateway = new StripeGateway();
   }
   ```

2. **Return results, don't produce side effects.**

   ```typescript
   // Testable
   function calculateDiscount(cart): Discount {}

   // Hard to test
   function applyDiscount(cart): void {
     cart.total -= discount;
   }
   ```

3. **Small surface area.** Fewer methods = fewer tests needed. Fewer params = simpler test setup.

## Relationships

- A **Module** has exactly one **Interface** (the surface it presents to callers and tests).
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- **Depth as ratio of implementation-lines to interface-lines** (Ousterhout): rewards padding the implementation. We use depth-as-leverage instead.
- **"Interface" as the TypeScript `interface` keyword or a class's public methods**: too narrow: interface here includes every fact a caller must know.
- **"Boundary"**: overloaded with DDD's bounded context. Say **seam** or **interface**.

## Going deeper

- **Deepening a cluster given its dependencies**, see [references/DEEPENING.md](references/DEEPENING.md): dependency categories, seam discipline, and replace-don't-layer testing.
- **Exploring alternative interfaces**, see [references/DESIGN-IT-TWICE.md](references/DESIGN-IT-TWICE.md): design the interface several radically different ways (in parallel sub-agents where the host allows delegation, otherwise one after another), then compare on depth, locality, and seam placement.

## Procedure, when asked to design or improve a module

1. **Map the module**: its interface (everything a caller must know), its callers and its dependencies. Completion: you can state the interface in a few lines.
2. **Apply the deletion test** and look for pass-throughs, shallow wrappers and leaked internals. Completion: each candidate has a one-line reason.
3. **Propose** the deepening or the new seam in the glossary's terms, with the dependency strategy from DEEPENING.md, and confirm with the user before restructuring. Completion: the user has picked a direction, or you have stated one and why.
4. **Change it test-first** through the new interface (`tag-tdd`), replacing old tests rather than layering new ones.

## Output

A proposal (interface sketch, seam placement, what moves where, the tests that change) or the restructured code with its tests and the repository's checks run.

## When something is missing

- **No tests around the module:** add characterization tests at the interface first, or say the change is unprotected.
- **The right home is another repository:** record it as a dependency for that repository's owners rather than editing it.
- **A decision is hard to reverse:** offer an ADR (see `tag-domain-modeling`).
