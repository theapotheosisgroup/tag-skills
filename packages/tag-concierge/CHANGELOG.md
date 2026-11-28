# Changelog: tag-concierge

All notable changes to the `tag-concierge` package. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) under the [package versioning rules](../README.md#versioning). Each release is tagged `tag-concierge@<version>` and published as a GitHub release.

## [Unreleased]

### Changed

- governance-concierge 0.1.2: the Concierge is the person's front door. It keeps routine work (what is waiting on them, what was sent to them, where a document is, their skills), breaks specialist work into one piece per assistant and hands each to the matching assistant where the client allows sub-agents (in the TAG Harness, its finance, governance and knowledge assistants and the organization's own agents), else does it with the matching skill. Work for TAG or another organization goes only through the shared workspace as a request (`tag.request.ask`, the TAG connector's `ask` or `assistants`), never from one organization's Concierge to another's.

## [0.1.1]

### Changed

- One default agent for asking for work and doing it: the TAG Harness folded its Organization assistant into the Concierge, and this package now carries the same single instruction set. governance-concierge 0.1.1 asks for work (what is waiting on the person, what was sent to them, asking TAG or another organization to get something done) and does the organization's own back-office work as drafts, with the matching skill of `tag-finance` or `tag-governance` when the client has it loaded, organization to organization. In the TAG Harness the person's skill profile decides which skills are on by default; access stays aletia's check.

## [0.1.0]

### Added

- First package release, in the [Agent Plugins 1.0.0](https://agent-plugins.org/specification) format: the Concierge agent. Ships governance-concierge 0.1.0 (its instructions) with the skills it uses, bundled from their home packages: governance-task-management, governance-knowledge-synthesis, governance-search-strategy and governance-source-management, all Foundation.
- `mcp.json` declares the TAG MCP (`tag`) and the Aletia MCP (`aletia`), remote Streamable HTTP servers the client authorizes with OAuth through the TAG login. The main archive targets production; `tag-concierge-0.1.0.develop.tar.gz` targets develop.
