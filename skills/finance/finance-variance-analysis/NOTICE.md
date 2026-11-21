# Notice

This skill is derived from `finance/skills/variance-analysis` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `variance-analysis`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `finance/LICENSE`, unmodified |

## Adaptations

- Renamed `variance-analysis` to `finance-variance-analysis`; frontmatter rewritten (the non-specification `argument-hint` field dropped).
- Thresholds come from the organization's configuration (`tag.policy.reporting.read`); the upstream percentages are marked as examples.
- Required every driver to trace to accounts, transactions or documents, with an explicit unexplained remainder so drivers always sum to the variance.
- Bound actuals, budgets, forecasts and detail to TAG capabilities or to identified, versioned files.
- Added review before commentary leaves the finance function.
