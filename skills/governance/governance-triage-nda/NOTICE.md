# Notice

This skill is derived from `legal/skills/triage-nda` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `triage-nda`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `legal/LICENSE`, unmodified |

## Adaptations

- Renamed `triage-nda` to `governance-triage-nda`; frontmatter rewritten (the non-specification `argument-hint` field dropped) and the `/triage-nda` command reference renamed.
- Screening criteria and delegation rules come from the organization's approved NDA playbook (`tag.policy.legal_playbook.read`, proposed) instead of a local settings file.
- Without an approved playbook the NDA is reported unclassified and sent for review; the upstream market-standard defaults are kept as reference only and no longer applied.
- GREEN routing goes to the approver named by the delegation rules instead of straight to signature; the agent never approves or signs.
- Removed the CONNECTORS.md pointer.
