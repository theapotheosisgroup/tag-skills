# Notice

This skill is derived from `skills/engineering/code-review` in [mattpocock/skills](https://github.com/mattpocock/skills) at commit `abeeaf95660ba9e8b7c753eb38f441ca707a8823` (original name `code-review`), Copyright (c) 2026 Matt Pocock, licensed under the MIT License. The licence text and copyright notice are in [LICENSE](LICENSE).

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under MIT unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under the MIT License.

## Files

| File | Origin |
| --- | --- |
| `SKILL.md` | Upstream SKILL.md, modified |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `LICENSE`, unmodified |

## Adaptations

- Renamed `code-review` to `tag-code-review`; frontmatter rewritten.
- Replaced the `/setup-matt-pocock-skills` tracker document with the repository's own forge, read through the host's GitHub tools; never file issues in an upstream repository.
- Allowed sequential reviews where the host lacks delegation, keeping the Standards and Spec reviews separate and reported side by side.
- Pointed the Standards axis at AGENTS.md, CONTRIBUTING.md, ARCHITECTURE.md, ADRs and the linked organization standards.
- Added context, completion criterion and missing-input sections; private reporting of security findings; the review never approves or merges.
- `agents/openai.yaml` (Codex UI metadata) was not copied; its invocation policy is carried in `tag-skill.json`.
