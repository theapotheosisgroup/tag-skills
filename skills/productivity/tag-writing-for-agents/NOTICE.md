# Notice

This skill is derived from `skills/productivity/writing-for-agents` in [mattpocock/skills](https://github.com/mattpocock/skills) at commit `abeeaf95660ba9e8b7c753eb38f441ca707a8823` (original name `writing-for-agents`), Copyright (c) 2026 Matt Pocock, licensed under the MIT License. The licence text and copyright notice are in [LICENSE](LICENSE).

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under MIT unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under the MIT License.

## Files

| File | Origin |
| --- | --- |
| `SKILL.md` | Upstream SKILL.md, modified |
| `references/SKILL-MECHANICS.md` | Upstream SKILL-MECHANICS.md, modified: TAG note on invocation in tag-skill.json; link fixed |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `LICENSE`, unmodified |

## Adaptations

- Renamed `writing-for-agents` to `tag-writing-for-agents`; frontmatter rewritten.
- Kept SKILL-MECHANICS.md in references/ and fixed links; added a note that tag-skills records invocation in tag-skill.json because client-specific frontmatter fields are rejected.
- Added a procedure that requires explicit triggers, completion criteria and failure branches, and points at the tag-skills packaging contract (SKILL.md, tag-skill.json, LICENSE, NOTICE.md, category layout).
- `agents/openai.yaml` (Codex UI metadata) was not copied; its invocation policy is carried in `tag-skill.json`.
