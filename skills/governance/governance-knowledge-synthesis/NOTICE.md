# Notice

This skill is derived from `enterprise-search/skills/knowledge-synthesis` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `knowledge-synthesis`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `enterprise-search/LICENSE`, unmodified |

## Adaptations

- Renamed `knowledge-synthesis` to `governance-knowledge-synthesis`; frontmatter rewritten (the non-specification `user-invocable` field dropped).
- Replaced `~~chat`, `~~email`, `~~cloud storage` and `~~project tracker` placeholders with TAG sources searched through `aletia.search`.
- Required source identifiers, timestamps and relevance for every claim; unattributed results are listed but never used.
- Conflicting evidence is always kept visible with sources, dates and authority, never resolved silently; added an evidence bundle and a gaps section.
