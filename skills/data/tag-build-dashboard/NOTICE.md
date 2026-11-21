# Notice

This skill is derived from `data/skills/build-dashboard` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `build-dashboard`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `references/metric-definitions.md`, `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `data/LICENSE`, unmodified |

## Adaptations

- Renamed `build-dashboard` to `tag-build-dashboard`; frontmatter rewritten (the non-specification `argument-hint` field dropped); the `/build-dashboard` command renamed.
- Restricted inputs to verified report data (tag-financial-statements `report.json` or results validated by tag-validate-data, a declared dependency) and declared metric definitions; removed the instruction to generate realistic sample data.
- Made a no-dependency HTML output (inline CSS and SVG) the default; the upstream Chart.js CDN template is kept as an optional, declared runtime dependency.
- Added source traceability, exception display, evidence recording and review routing; replaced the data warehouse and CONNECTORS.md references with TAG capability names.
