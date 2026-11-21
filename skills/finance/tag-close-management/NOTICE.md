# Notice

This skill is derived from `finance/skills/close-management` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `close-management`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `finance/LICENSE`, unmodified |

## Adaptations

- Renamed `close-management` to `tag-close-management`; frontmatter rewritten (the non-specification `user-invocable` field dropped).
- Bound status tracking to TAG work (`tag.work.status`) and TAG's month-end run (`tag.finance.run_month_end`, Back Office MCP `finance_run_month_end`).
- Added period-lock readiness and made the lock a separately authorized operation (`tag.ledger.period_lock.set`), requested only after sign-off.
- Declared dependencies on `tag-reconciliation`, `tag-journal-entry-prep` and `tag-financial-statements`, which perform the close tasks.
- Kept unresolved items visible with owners; the upstream 5-day calendar is a template, not the organization's policy.
