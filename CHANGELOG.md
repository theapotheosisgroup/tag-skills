# Changelog

All notable changes to this repository are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each skill also carries its own version in `tag-skill.json`.

## [Unreleased]

### Added

- The 16-skill back-office G&A catalog forked from anthropics/knowledge-work-plugins (`0e0fcacd…`), in `skills/<pillar>/<pillar>-<name>/` (9 `finance-`, 7 `governance-`), each with `tag-skill.json`, `LICENSE` and `NOTICE.md`.
- finance-financial-statements as the first complete workflow: `scripts/build_statements.py` (exact decimals, ASPE or IFRS, English or French, no plugs) with six synthetic fixtures and committed example outputs.
- finance-journal-entry-prep `scripts/check_entries.py`, which validates proposed entries and emits a not-posted posting request.
- Profiles (`finance`, `governance`, `backoffice`) and `scripts/install-profile.js`, a wrapper over the pinned Skills CLI that expands TAG skill dependencies.
- Schemas for skill metadata, profiles, the catalog, the upstream import record and the capability registry; generated `catalog.json`; `upstreams.lock.json`; `npm run upstream:check`.
- Integration contracts, a capability registry with mapped and proposed capabilities, mocked contract tests, a selection evaluation and an evaluation rubric.

### Changed

- The Skills CLI is pinned at 1.9.0 (was 1.7.6).
- The validator accepts the category layout, `tag-skill.json` and `NOTICE.md`, and checks links in every bundled Markdown file ([ADR 0003](docs/adr/0003-categories-and-tag-skill-metadata.md)).
- Categories are TAG's service pillars (`finance`, `people`, `governance`) and every published skill is prefixed with its pillar instead of `tag-`; the validator rejects a prefix that differs from the skill's pillar directory ([ADR 0004](docs/adr/0004-pillar-categories-and-prefixes.md)). The `finance-core`, `controller` and `legal` profiles became `finance` and `governance`; `backoffice` is now the whole catalog.

### Removed

- The engineering skills (`tag-tdd`, `tag-diagnosing-bugs`, `tag-codebase-design`, `tag-code-review`, `tag-domain-modeling`), the productivity skills (`tag-writing-for-agents`, `tag-handoff`), `tag-sql-queries` and the `authoring` profile: the catalog is back-office G&A work only. Their provenance stays in `upstreams.lock.json` as `removed` records.
