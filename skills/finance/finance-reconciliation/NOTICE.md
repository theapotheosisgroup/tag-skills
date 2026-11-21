# Notice

This skill is derived from `finance/skills/reconciliation` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `reconciliation`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `finance/LICENSE`, unmodified |

## Adaptations

- Renamed `reconciliation` to `finance-reconciliation`; frontmatter rewritten (the non-specification `argument-hint` field dropped).
- Scoped the workflow to bank, control-account and subledger, and intercompany reconciliations, with every source tied to a TAG capability or a user-supplied document.
- Made the no-plug rule explicit: unreconciled differences are reported with their amount and block sign-off for the account.
- Routed proposed corrections to `finance-journal-entry-prep`; the skill never posts or clears items.
- Took escalation thresholds and aging buckets from the organization's policy; the upstream dollar thresholds stay illustrative.
