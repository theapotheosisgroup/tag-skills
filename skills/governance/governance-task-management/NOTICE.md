# Notice

This skill is derived from `productivity/skills/task-management` in [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571` (original name `task-management`), licensed under the Apache License, Version 2.0. The licence text is in [LICENSE](LICENSE). The upstream repository has no NOTICE file at that commit.

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under Apache-2.0 unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under Apache-2.0.

## Files

| File | Origin |
| --- | --- |
| `references/upstream-guide.md` | Upstream `SKILL.md` body, modified (see below) |
| `SKILL.md` | Written by TAG, drawing on the upstream workflow |
| `references/state-mapping.md`, `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `productivity/LICENSE`, unmodified |

## Adaptations

- Renamed `task-management` to `governance-task-management`; frontmatter rewritten (the non-specification `user-invocable` field dropped).
- Replaced the `TASKS.md` file as system of record with TAG expectations and work, read through `tag_overview`, `work_status` and the proposed `tag.expectations.read`; a local `TASKS.md` remains only as a personal, non-authoritative scratch list.
- Filing a task became a confirmed `ask_tag` request (`tag.request.ask`) with an idempotency key; deciding obligations stays a separate authorized operation.
- Added a proposed mapping from the upstream task views to expectation and work states, and an explicitly proposed Matter grouping (no Matter model exists yet).
- Removed the instructions to copy the plugin's `dashboard.html` and to run `/productivity:start`, which are outside the selected folder and not shipped.
