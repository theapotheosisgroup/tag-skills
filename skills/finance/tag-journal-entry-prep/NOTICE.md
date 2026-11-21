# Notice

This skill is derived from `finance/skills/journal-entry-prep` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `journal-entry-prep`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `scripts/check_entries.py`, `references/batch-format.md`, `assets/example-entries.json`, `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `finance/LICENSE`, unmodified |

## Adaptations

- Renamed `journal-entry-prep` to `tag-journal-entry-prep`; frontmatter rewritten (the non-specification `user-invocable` field dropped; invocation mode is in tag-skill.json).
- Separated preparation from posting: the skill emits a posting request (`not_posted`, requiring `tag.ledger.journal_entry.post`) and never posts, approves or changes period status.
- Added `scripts/check_entries.py`: exact decimal checks for balance, chart accounts, open periods, supporting references and approval state.
- Marked the upstream approval matrix as illustrative; the organization's delegation-of-authority rules govern.
- Bound inputs to TAG capabilities (chart of accounts, transactions, period status, supporting documents through `aletia.search`).
