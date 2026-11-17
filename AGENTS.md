# tag-skills: agent instructions

Organization standards apply and are not repeated here: [theapotheosisgroup/.github standards](https://github.com/theapotheosisgroup/.github/tree/main/standards), especially [AGENTS-AND-SKILLS](https://github.com/theapotheosisgroup/.github/blob/main/standards/AGENTS-AND-SKILLS.md). The repository contract is in [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Commands

`npm ci`, then `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:smoke`. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the same.

## Invariants

- Published skills live only in `skills/<name>/`; the validator ([`scripts/lib/validate.js`](scripts/lib/validate.js)) defines what is valid. Never add a skill, or loosen the validator, to make CI pass.
- Test fixtures live only in `tests/fixtures/skills/` and must keep `metadata.internal: true`; without it the Skills CLI offers them to anyone installing from the repository root (it falls back to a recursive search when `skills/` is empty).
- Skills contain no credentials, no MCP URLs with tokens, and no direct write path to a business record.
- Use the Skills CLI from `node_modules/.bin/skills` (pinned in `package-lock.json`), never an unversioned `npx skills`.
- `skills` in tag-backoffice (`agents/pillars/skills.py`) are Python domain handlers, not Agent Skills; they stay there.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
