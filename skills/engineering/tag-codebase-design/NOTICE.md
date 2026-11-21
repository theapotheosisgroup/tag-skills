# Notice

This skill is derived from `skills/engineering/codebase-design` in [mattpocock/skills](https://github.com/mattpocock/skills) at commit `abeeaf95660ba9e8b7c753eb38f441ca707a8823` (original name `codebase-design`), Copyright (c) 2026 Matt Pocock, licensed under the MIT License. The licence text and copyright notice are in [LICENSE](LICENSE).

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under MIT unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under the MIT License.

## Files

| File | Origin |
| --- | --- |
| `SKILL.md` | Upstream SKILL.md, modified |
| `references/DEEPENING.md` | Upstream DEEPENING.md, link to SKILL.md fixed |
| `references/DESIGN-IT-TWICE.md` | Upstream DESIGN-IT-TWICE.md, modified: sequential fallback when the host cannot delegate; link fixed |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `LICENSE`, unmodified |

## Adaptations

- Renamed `codebase-design` to `tag-codebase-design`; frontmatter rewritten.
- Moved DEEPENING.md and DESIGN-IT-TWICE.md into references/ and fixed links.
- Treated TAG repository boundaries as seams that a design must not cross except through published contracts.
- Allowed sequential design alternatives where the host cannot delegate to sub-agents.
- Added context, procedure, output and missing-input sections.
- `agents/openai.yaml` (Codex UI metadata) was not copied; its invocation policy is carried in `tag-skill.json`.
