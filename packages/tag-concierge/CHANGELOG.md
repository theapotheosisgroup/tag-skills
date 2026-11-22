# Changelog: tag-concierge

All notable changes to the `tag-concierge` package. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) under the [package versioning rules](../README.md#versioning). Each release is tagged `tag-concierge@<version>` and published as a GitHub release.

## [Unreleased]

## [0.1.0]

### Added

- First package release, in the [Agent Plugins 1.0.0](https://agent-plugins.org/specification) format: the Concierge agent. Ships governance-concierge 0.1.0 (its instructions) with the skills it uses, bundled from their home packages: governance-task-management, governance-knowledge-synthesis, governance-search-strategy and governance-source-management, all Foundation.
- `mcp.json` declares the TAG MCP (`tag`) and the Aletia MCP (`aletia`), remote Streamable HTTP servers the client authorizes with OAuth through the TAG login. The main archive targets production; `tag-concierge-0.1.0.develop.tar.gz` targets develop.
