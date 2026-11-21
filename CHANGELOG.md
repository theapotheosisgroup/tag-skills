# Changelog

All notable changes to this repository are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each skill also carries its own version in `tag-skill.json`.

## [Unreleased]

### Added

- The 24-skill catalog forked from anthropics/knowledge-work-plugins (`0e0fcacd…`) and mattpocock/skills (`abeeaf95…`), in `skills/<category>/<name>/`, each with `tag-skill.json`, `LICENSE` and `NOTICE.md`.
- tag-financial-statements as the first complete workflow: `scripts/build_statements.py` (exact decimals, ASPE or IFRS, English or French, no plugs) with six synthetic fixtures and committed example outputs.
- tag-journal-entry-prep `scripts/check_entries.py`, which validates proposed entries and emits a not-posted posting request.
- Profiles (`finance-core`, `controller`, `backoffice`, `legal`, `authoring`) and `scripts/install-profile.js`, a wrapper over the pinned Skills CLI that expands TAG skill dependencies.
- Schemas for skill metadata, profiles, the catalog, the upstream import record and the capability registry; generated `catalog.json`; `upstreams.lock.json`; `npm run upstream:check`.
- Integration contracts, a capability registry with mapped and proposed capabilities, mocked contract tests, a selection evaluation and an evaluation rubric.

### Changed

- The Skills CLI is pinned at 1.9.0 (was 1.7.6).
- The validator accepts the category layout, `tag-skill.json` and `NOTICE.md`, requires the `tag-` prefix for published skills, and checks links in every bundled Markdown file ([ADR 0003](docs/adr/0003-categories-and-tag-skill-metadata.md)).
