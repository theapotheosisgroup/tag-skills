# Notice

This skill is derived from `skills/engineering/domain-modeling` in [mattpocock/skills](https://github.com/mattpocock/skills) at commit `abeeaf95660ba9e8b7c753eb38f441ca707a8823` (original name `domain-modeling`), Copyright (c) 2026 Matt Pocock, licensed under the MIT License. The licence text and copyright notice are in [LICENSE](LICENSE).

The files were **modified by TAG** on 2026-11-20. TAG's additions are not licensed under MIT unless stated otherwise (UNLICENSED, all rights reserved); the upstream-derived portions remain under the MIT License.

## Files

| File | Origin |
| --- | --- |
| `SKILL.md` | Upstream SKILL.md, modified |
| `references/GLOSSARY-FORMAT.md` | Upstream GLOSSARY-FORMAT.md, unmodified |
| `references/ADR-FORMAT.md` | Upstream ADR-FORMAT.md, unmodified |
| `references/TAG-TERMS.md` | Written by TAG |
| `tag-skill.json` | Written by TAG |
| `LICENSE` | Upstream `LICENSE`, unmodified |

## Adaptations

- Renamed `domain-modeling` to `tag-domain-modeling`; frontmatter rewritten.
- Added references/TAG-TERMS.md with working definitions of organization, entity, person, agent, nexus, delegation, mandate, Expectation and Matter, each naming its owning repository; Matter marked proposed.
- Required organizations never to be called practice, firm or workspace.
- Preferred the repository's existing ADR format (TAG's Status, Date, Deciders, Context, Decision, Consequences, Alternatives) over the upstream minimal format.
- Moved GLOSSARY-FORMAT.md and ADR-FORMAT.md into references/ and fixed links; added context, procedure, output and missing-input sections.
- `agents/openai.yaml` (Codex UI metadata) was not copied; its invocation policy is carried in `tag-skill.json`.
