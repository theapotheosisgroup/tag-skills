# Notice

This skill is derived from `legal/skills/review-contract` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `review-contract`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `legal/LICENSE`, unmodified |

## Adaptations

- Renamed `review-contract` to `governance-review-contract`; frontmatter rewritten (the non-specification `argument-hint` field dropped) and the `/review-contract` command reference renamed.
- Playbook comes from the organization's approved, jurisdiction-specific playbook (`tag.policy.legal_playbook.read`, proposed) instead of a local settings file.
- Without an approved playbook the skill stops at a neutral issues list; the upstream fallback to generic commercial standards was removed so defaults cannot silently become Canadian or other legal policy.
- Separated document analysis, review routing (`tag.review.request`), signature requests (`tag.signature.request`) and signing, which the agent never does; the CLM routing step was rewritten as review routing under delegation rules.
- Removed the CONNECTORS.md pointer; added the not-legal-advice statement to the closing reminder.
