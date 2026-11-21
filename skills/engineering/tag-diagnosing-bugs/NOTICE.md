# Notice

This skill is derived from `skills/engineering/diagnosing-bugs` in [mattpocock/skills](https://github.com/mattpocock/skills) at commit `abeeaf95660ba9e8b7c753eb38f441ca707a8823` (original name `diagnosing-bugs`), Copyright (c) 2026 Matt Pocock, licensed under the MIT License. The licence text and copyright notice are in [LICENSE](LICENSE).

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under MIT unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under the MIT License.

## Files

| File | Origin |
| --- | --- |
| `SKILL.md` | Upstream SKILL.md, modified |
| `scripts/hitl-loop.template.sh` | Upstream script, unmodified (executable bit set) |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `LICENSE`, unmodified |

## Adaptations

- Renamed `diagnosing-bugs` to `tag-diagnosing-bugs`; frontmatter rewritten.
- Added context, output and missing-input sections; forbade reproducing against a client's live ledger or credentials and widening access to get a repro.
- Linked scripts/hitl-loop.template.sh with its relative path and declared bash as a runtime dependency.
- `agents/openai.yaml` (Codex UI metadata) was not copied; its invocation policy is carried in `tag-skill.json`.
