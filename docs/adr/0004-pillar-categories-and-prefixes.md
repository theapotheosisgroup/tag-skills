# 0004. Pillar categories and pillar prefixes; a back-office G&A catalog only

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** the mission lead (catalog review, 2026-11-21), the tag-skills maintainers (CODEOWNERS)

## Context

The first catalog ([ADR 0003](0003-categories-and-tag-skill-metadata.md)) shipped 24 skills under seven upstream-style categories (finance, data, legal, knowledge, operations, engineering, productivity), every name prefixed `tag-`. The TAG Harness installs every skill by default on every agent.

On review the mission lead questioned the `tag-` prefix and asked that the engineering skills (such as tdd) and SQL be removed: the catalog should be back-office G&A skills, possibly prefixed by TAG's service pillars, Finance, People and Governance.

The [Agent Skills specification](https://agentskills.io/specification#name-field) constrains a name to 1-64 lowercase letters, digits and single hyphens, equal to its folder; it does not require or suggest a prefix. Clients install skills from every source into one flat directory per agent (for example `.claude/skills/<name>/`), so two collections that both ship `reconciliation` collide, and the model chooses among installed skills by name and description.

## Decision

- The catalog holds back-office G&A skills only. The engineering skills (`tdd`, `diagnosing-bugs`, `codebase-design`, `code-review`, `domain-modeling`), the productivity skills (`writing-for-agents`, `handoff`) and `sql-queries` are removed, with the `authoring` profile. Their import history stays in `upstreams.lock.json` as `blocked` entries with status `removed`.
- Categories are the pillars: `finance`, `people`, `governance` (fixed in [scripts/lib/validate.js](../../scripts/lib/validate.js)). A pillar directory exists only once it holds a skill; People has none yet and is planned in the [roadmap](../roadmap.md#people-pillar-proposed-not-implemented).
- A published skill's name is `<pillar>-<name>` and lives in `skills/<pillar>/<pillar>-<name>/`. The validator rejects a name whose prefix differs from its pillar directory; the schemas restrict names and profile entries to the three prefixes.
- Upstream categories map by the service they support: finance and data (accounting data exploration, validation, dashboards) become `finance-`; legal, enterprise search (knowledge) and task management become `governance-`.
- Profiles follow the pillars: `finance`, `governance`, and `backoffice` (all pillars). `finance-core` and `controller` map to `finance`, `legal` to `governance`.
- Data-format identifiers inside skills (`tag.financial-statements.input/v1`, `tag.journal-entry-prep.batch/v1` and the like) and capability names (`tag.*`) are unchanged: they are versioned contracts, not skill names.

## Consequences

- Every installed name changes. Consumers that pin a tag-skills commit (the TAG Harness) keep the old names until they move their pin, and then must update any reference to a `tag-` skill name.
- `explore-data`, `validate-data` and `build-dashboard` no longer depend on a SQL skill; they state their read-only use of `tag.data.query` themselves.
- A prefix still namespaces TAG's skills against other installed collections, and now also says which service line a skill belongs to.

## Alternatives considered

- **No prefix.** Rejected: bare names such as `reconciliation` or `review-contract` are likely to collide with other collections installed beside TAG's.
- **Keep `tag-`.** Rejected: it namespaces but says nothing about the work, and the mission lead asked for pillar grouping.
- **`tag-<pillar>-<name>`.** Rejected: longer names for no gain inside TAG-managed installs; the pillar prefix is distinctive enough.
