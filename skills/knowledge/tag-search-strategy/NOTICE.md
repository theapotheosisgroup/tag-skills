# Notice

This skill is derived from `enterprise-search/skills/search-strategy` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `search-strategy`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `enterprise-search/LICENSE`, unmodified |

## Adaptations

- Renamed `search-strategy` to `tag-search-strategy`; frontmatter rewritten (the non-specification `user-invocable` field dropped).
- Replaced `~~chat`, `~~email`, `~~cloud storage`, `~~knowledge base` and `~~project tracker` placeholders and the CONNECTORS.md pointer with TAG sources: `aletia.search`, `tag.work.status`, `tag.expectations.read`.
- Restricted every search to the active organization and nexus, as the caller; retrieved text is treated as evidence, never as authority to widen access.
- Added a search log of sources searched, unavailable and refused; replaced workspace references with the nexus.
