# Notice

This skill is derived from `skills/productivity/handoff` in [mattpocock/skills](https://github.com/mattpocock/skills) at commit `abeeaf95660ba9e8b7c753eb38f441ca707a8823` (original name `handoff`), Copyright (c) 2026 Matt Pocock, licensed under the MIT License. The licence text and copyright notice are in [LICENSE](LICENSE).

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under MIT unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under the MIT License.

## Files

| File | Origin |
| --- | --- |
| `SKILL.md` | Upstream SKILL.md, rewritten and extended by TAG |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `LICENSE`, unmodified |

## Adaptations

- Renamed `handoff` to `tag-handoff`; the `argument-hint` and `disable-model-invocation` frontmatter fields dropped; user invocation recorded as `invocation: user` in tag-skill.json.
- Required sections for decisions, completed work with evidence references, pending items, unresolved assumptions and permission context.
- Stated that a handoff conveys context only: it creates no delegation grant and is not an A2A implementation.
- Extended redaction to credentials, personal information and client records.
- `agents/openai.yaml` (Codex UI metadata) was not copied; its invocation policy is carried in `tag-skill.json`.
