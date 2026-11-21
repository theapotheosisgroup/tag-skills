# 0003. Category directories, TAG skill metadata and provenance inside each skill

- **Status:** Accepted; the category list and the `tag-` prefix are superseded by [ADR 0004](0004-pillar-categories-and-prefixes.md)
- **Date:** 2026-11-20
- **Deciders:** the mission lead (TAG Skills implementation brief, 2026-11-20), the tag-skills maintainers (CODEOWNERS)

## Context

ADR 0001 and the organization standard ([AGENTS-AND-SKILLS](https://github.com/theapotheosisgroup/.github/blob/main/standards/AGENTS-AND-SKILLS.md#format)) describe one flat directory per skill under `skills/`, with only `SKILL.md`, an optional `LICENSE` and `references/`, `scripts/`, `assets/`. The TAG Skills brief asks for a 24-skill catalog forked from two upstream repositories, organized like Matt Pocock's `skills/<category>/<name>/`, with TAG metadata, upstream licence and notice material inside every installable folder, profiles that expand dependencies, and a provenance record.

The pinned Vercel Skills CLI (1.9.0) discovers `skills/<category>/<name>/SKILL.md` and copies every file in a skill folder, including extra top-level files; this was verified before the change and is tested in CI.

## Decision

- Published skills live in `skills/<category>/<name>/`. Categories are fixed in the validator: finance, data, legal, knowledge, operations, engineering, productivity. Skill names stay unique across categories and start with `tag-`. The repository root has no `SKILL.md`, which would shadow nested discovery.
- Two files are added to the allowed skill layout: `tag-skill.json` (required for published skills; schema `schemas/tag-skill.schema.json`) and `NOTICE.md` (required when the skill is derived from an upstream source). `LICENSE` is required in that case and must equal the upstream licence file recorded in `upstreams.lock.json`.
- SKILL.md frontmatter stays limited to Agent Skills specification fields. TAG-specific data (version, domain, audiences, invocation mode, capabilities, inputs, outputs, dependencies, side effects, review conditions, provenance) goes in `tag-skill.json`, so the frontmatter rule in CONTRIBUTING.md is unchanged.
- Capabilities named in `tag-skill.json` must exist in `docs/integration/capabilities.json` and be named in the SKILL.md body.
- `upstreams.lock.json` is TAG's import record (separate from the CLI's consumer `skills-lock.json`); `catalog.json` is generated and checked.
- Links are checked in every bundled Markdown file, not only `SKILL.md`, because installed references are read too.

## Consequences

- The organization standard's "flat" wording no longer matches this repository. Updating `.github` `standards/AGENTS-AND-SKILLS.md` to allow category directories is an external dependency (recorded in [docs/integration/README.md](../integration/README.md#dependencies-on-other-repositories)); until then this ADR is the repository exception.
- Invocation mode (`user` for tag-handoff) is recorded in `tag-skill.json`. Clients that read only `SKILL.md` do not see it; the harness applies it.
- Clients that install one skill get its licence and notices with it.

## Alternatives considered

- **Keep the flat layout.** Rejected: the brief prescribes Matt's category pattern, and categories keep the business and authoring catalogs visibly apart.
- **Put TAG metadata in SKILL.md frontmatter (`metadata` strings).** Rejected: the specification limits `metadata` to string values, and nested contracts would be unreadable there.
- **A repository-level licence only.** Rejected: a skill installed alone must keep its upstream notice.
