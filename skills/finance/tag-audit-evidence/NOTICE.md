# Notice

This skill is derived from `finance/skills/audit-support` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `audit-support`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `references/evidence-index.md`, `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `finance/LICENSE`, unmodified |

## Adaptations

- Renamed `audit-support` to `tag-audit-evidence`; frontmatter rewritten (the non-specification `user-invocable` field dropped).
- Split general evidence support (evidence index, workpapers, sufficiency checks) from SOX 404 testing support, which applies only when the organization confirms it is in scope.
- Added a scope note to the upstream SOX methodology; its percentages and sample sizes are examples, not policy.
- Stated that the skill prepares evidence and does not perform or conclude an assurance engagement or classify deficiencies.
- Bound evidence retrieval to `aletia.search` and ledger capabilities, with hashes and sources recorded through `tag.evidence.attach`.
