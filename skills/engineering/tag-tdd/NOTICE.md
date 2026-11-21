# Notice

This skill is derived from `skills/engineering/tdd` in [mattpocock/skills](https://github.com/mattpocock/skills) at commit `abeeaf95660ba9e8b7c753eb38f441ca707a8823` (original name `tdd`), Copyright (c) 2026 Matt Pocock, licensed under the MIT License. The licence text and copyright notice are in [LICENSE](LICENSE).

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under MIT unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under the MIT License.

## Files

| File | Origin |
| --- | --- |
| `SKILL.md` | Upstream SKILL.md, modified |
| `references/tests.md` | Upstream tests.md, unmodified |
| `references/mocking.md` | Upstream mocking.md, modified: two bold pseudo-headings made headings and a list spacing fix (Markdown lint) |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `LICENSE`, unmodified |

## Adaptations

- Renamed `tdd` to `tag-tdd`; frontmatter rewritten with a TAG-specific description.
- Moved tests.md and mocking.md into references/ and updated links.
- Added context, procedure with completion criteria, output and missing-input sections; pointed at the repository's AGENTS.md and TAG's TESTING standard (synthetic data, PASS/FAIL/BLOCKED reporting).
- Replaced the upstream skill names `codebase-design` and `code-review` with `tag-codebase-design` and `tag-code-review`.
- `agents/openai.yaml` (Codex UI metadata) was not copied; its invocation policy is carried in `tag-skill.json`.
