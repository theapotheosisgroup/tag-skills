# Notice

This skill is derived from `finance/skills/financial-statements` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `financial-statements`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `scripts/build_statements.py`, `references/input-format.md`, `references/report-format.md`, `references/frameworks.md`, `assets/example-input.json`, `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `finance/LICENSE`, unmodified |

## Adaptations

- Renamed `financial-statements` to `tag-financial-statements`; frontmatter rewritten (the non-specification `argument-hint` field dropped).
- Expanded the P&L-led workflow into a linked package: income statement, balance sheet, indirect cash flow statement, retained earnings or changes in equity, draft notes, exception report, traceability.
- Added `scripts/build_statements.py`: exact decimal arithmetic, no plugs, checks for trial-balance equality, mapping coverage, balance sheet, cash reconciliation, movement schedules, equity roll-forward, intercompany and comparatives.
- Made the framework explicit (ASPE or IFRS) with English and French presentation; US GAAP references kept as background only.
- Replaced the `~~erp` and `~~data warehouse` placeholders and the CONNECTORS.md pointer with TAG capability names; renamed the `/flux` command reference to `tag-variance-analysis`.
- Separated preparation from posting, approval, delivery and period locks, which follow platform authorization and review.
