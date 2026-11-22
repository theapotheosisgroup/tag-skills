# Changelog

All notable changes to this repository are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and releases use [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each skill also carries its own version in `tag-skill.json`.

## [Unreleased]

### Added

- `mcp.json` in every package ([ADR 0006](docs/adr/0006-mcp-servers-and-agent-packages.md)): the TAG MCP and the Aletia MCP as remote Streamable HTTP servers, authorized by the client with OAuth through the TAG login. One source, `packages/mcp.json`, checked against the vendored, hash-pinned Agent Plugins 1.0.0 MCP schema; each release publishes one archive per environment (production and develop), because Agent Plugins expands no variable in a URL. The release index records each version's MCP servers and environment archives, and a server added, removed or moved is a versioned change. `tag-finance`, `tag-governance` and `tag-knowledge` move to `0.1.1`.
- Agent packages: a TAG agent as an Agent Plugins package built from skills. `tag-concierge` (the organization's back-office assistant) and `tag-due-diligence` (data rooms: raise and drive a request list, or find and file the documents that answer it), each with a TAG-original instructions skill (`governance-concierge`, `governance-due-diligence`), the task and knowledge skills it uses bundled from their home packages, and `mcp.json`. How to load one in ChatGPT, Claude or the TAG harness is in [docs/INSTALLING.md](docs/INSTALLING.md#loading-a-tag-agent-chatgpt-claude-or-the-harness).
- Seven Aletia capabilities mapped to the Aletia MCP tools `lens`, `arc`, `people`, `sends`, `expect`, `supply` and `mark`.

- Versioned skill packages in the [Agent Plugins 1.0.0](https://agent-plugins.org/specification) format ([ADR 0005](docs/adr/0005-agent-plugins-packages-and-releases.md)): `tag-finance`, `tag-governance` and `tag-knowledge` at `0.1.0`, each with a `plugin.json` recording every skill's plan tier (Foundation, Structure, Turnkey) and its own changelog under `packages/`; package versioning rules; `scripts/release.js` (check, reproducible build, verify), the vendored 1.0.0 manifest schema, the release index schema, and `.github/workflows/release.yml`, which dry-runs on pull requests and publishes `<package>@<version>` GitHub releases and the `skills-index` release index from `develop`.

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
