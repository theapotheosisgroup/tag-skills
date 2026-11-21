# Notice

This skill is derived from `data/skills/explore-data` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `explore-data`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `references/accounting-checks.md`, `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `data/LICENSE`, unmodified |

## Adaptations

- Renamed `explore-data` to `tag-explore-data`; frontmatter rewritten (the non-specification `argument-hint` field dropped); the `/explore-data` command renamed.
- Focused profiling on accounting data: required fields, duplicates, debit/credit sign conventions, period and status, unmapped accounts, currency, intercompany coding, coverage and control totals.
- Replaced the data warehouse and CONNECTORS.md references with the proposed read-only capabilities (`tag.data.query`, `tag.data.schema.read`) used through tag-sql-queries, declared as a dependency.
- Made the skill read-only: findings are reported, never corrected in the source.
