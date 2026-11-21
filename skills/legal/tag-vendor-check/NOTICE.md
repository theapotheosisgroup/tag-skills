# Notice

This skill is derived from `legal/skills/vendor-check` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `vendor-check`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `legal/LICENSE`, unmodified |

## Adaptations

- Renamed `vendor-check` to `tag-vendor-check`; frontmatter rewritten (the non-specification `argument-hint` field dropped) and the `/vendor-check` command reference renamed.
- Replaced connected CLM, CRM, email, document and chat systems with TAG sources: the agreement registry (`tag.contracts.registry.read`, proposed) and nexus search (`aletia.search`); CRM noted as having no TAG capability.
- Search planning and combination delegated to `tag-search-strategy` and `tag-knowledge-synthesis`; conflicting records kept visible with sources.
- The upstream expected-agreement list is an example only; the organization's policy decides which agreements are expected.
- Removed the CONNECTORS.md pointer.
