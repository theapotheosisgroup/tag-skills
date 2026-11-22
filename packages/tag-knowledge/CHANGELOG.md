# Changelog: tag-knowledge

All notable changes to the `tag-knowledge` package. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) under the [package versioning rules](../README.md#versioning). Each release is tagged `tag-knowledge@<version>` and published as a GitHub release.

## [Unreleased]

## [0.1.1]

### Added

- `mcp.json` declares the TAG MCP (`tag`) and the Aletia MCP (`aletia`), remote Streamable HTTP servers the client authorizes with OAuth through the TAG login, so loading the package wires up the tools the skills name. The main archive targets production; `tag-knowledge-0.1.1.develop.tar.gz` targets develop. No skill changed.

## [0.1.0]

### Added

- First package release, in the [Agent Plugins 1.0.0](https://agent-plugins.org/specification) format, with the 3 shared knowledge skills at version 0.1.0, all in Foundation: governance-knowledge-synthesis, governance-search-strategy, governance-source-management.
