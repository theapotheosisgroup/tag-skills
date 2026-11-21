# Notice

This skill is derived from `data/skills/sql-queries` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `sql-queries`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream skill |
| `references/read-only-rules.md`, `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `data/LICENSE`, unmodified |

## Adaptations

- Renamed `sql-queries` to `tag-sql-queries`; frontmatter rewritten (the non-specification `user-invocable` field dropped).
- Restricted the skill to read-only `SELECT` queries through the scoped capability `tag.data.query` over approved schema definitions (`tag.data.schema.read`); removed the Databricks `MERGE` upsert example and storage-maintenance tips from the reference.
- Added a read-only and bound-parameter checklist; user values are never concatenated into SQL.
- Added organization scoping, evidence recording and handling of missing bindings, unapproved columns and refusals.
