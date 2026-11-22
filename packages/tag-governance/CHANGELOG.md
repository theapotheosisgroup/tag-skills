# Changelog: tag-governance

All notable changes to the `tag-governance` package. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) under the [package versioning rules](../README.md#versioning). Each release is tagged `tag-governance@<version>` and published as a GitHub release.

## [Unreleased]

## [0.1.1]

### Added

- `mcp.json` declares the TAG MCP (`tag`) and the Aletia MCP (`aletia`), remote Streamable HTTP servers the client authorizes with OAuth through the TAG login, so loading the package wires up the tools the skills name. The main archive targets production; `tag-governance-0.1.1.develop.tar.gz` targets develop. No skill changed.

## [0.1.0]

### Added

- First package release, in the [Agent Plugins 1.0.0](https://agent-plugins.org/specification) format, with 4 Governance skills at version 0.1.0. Foundation: governance-task-management. Structure adds governance-triage-nda and governance-vendor-check. Turnkey adds governance-review-contract. Requires `tag-knowledge` for the knowledge skills that vendor checks and contract review depend on.
