# Notice

This skill is derived from `enterprise-search/skills/source-management` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `source-management`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `enterprise-search/LICENSE`, unmodified |

## Adaptations

- Renamed `source-management` to `governance-source-management`; frontmatter rewritten (the non-specification `user-invocable` field dropped).
- Replaced placeholders and the CONNECTORS.md pointer with TAG capabilities (`tag.sources.list`, `aletia.search`, `tag.context.overview`).
- Removed guidance to connect sources through MCP settings or `.mcp.json`: the agent never connects sources or handles credentials (tag-connectors owns provider connections and credentials; aletia owns what a nexus indexes).
- Added gap reasons (no capability, not indexed in the nexus, refused) and labelling of inferred availability.
