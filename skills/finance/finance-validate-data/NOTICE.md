# Notice

This skill is derived from `data/skills/validate-data` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `validate-data`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `references/objective-checks.md`, `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `data/LICENSE`, unmodified |

## Adaptations

- Renamed `validate-data` to `finance-validate-data`; frontmatter rewritten (the non-specification `argument-hint` field dropped); the `/validate-data` command renamed.
- Put objective checks first (footing, recomputation, completeness against control figures, grain, aggregation, period, units, sign, comparatives, traceability), each recorded as pass, fail with difference, or not run.
- Added a documented judgement rubric for whether conclusions follow from the evidence.
- Added handling of finance-financial-statements `report.json`, TAG capability bindings (proposed), evidence recording and review routing; removed the CONNECTORS.md pointer.
