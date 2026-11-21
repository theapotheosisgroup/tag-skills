# tag-skills: agent instructions

Organization standards apply and are not repeated here: [theapotheosisgroup/.github standards](https://github.com/theapotheosisgroup/.github/tree/main/standards), especially [AGENTS-AND-SKILLS](https://github.com/theapotheosisgroup/.github/blob/main/standards/AGENTS-AND-SKILLS.md). The repository contract is in [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).

## Commands

`npm ci`, then `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:smoke`. CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs the same, plus the skill-script tests on Python 3.10. Needs Node from `.nvmrc` and `python3` ≥ 3.10.

## Invariants

- Published skills are back-office G&A only and live in `skills/<pillar>/<pillar>-<name>/`, pillars `finance`, `people`, `governance` ([ADR 0004](docs/adr/0004-pillar-categories-and-prefixes.md); naming in [CONTRIBUTING](CONTRIBUTING.md#naming-and-layout)); no engineering or authoring skills. [`scripts/lib/validate.js`](scripts/lib/validate.js) and [`scripts/lib/repository.js`](scripts/lib/repository.js) define what is valid. Never add a skill, or loosen the validator, to make CI pass.
- After changing anything under `skills/` or `profiles/`, run `npm run catalog:generate` and commit `catalog.json`; CI fails on a stale catalog. When the statement script's output changes on purpose, regenerate `docs/finance/examples/` (command in its test).
- Forked skills keep their upstream `LICENSE` byte-for-byte and a `NOTICE.md`; provenance and hashes live in `upstreams.lock.json` ([maintenance guide](docs/maintenance.md)). Never `npx skills add` an upstream collection into `skills/`.
- Capabilities a skill names must exist in `docs/integration/capabilities.json`; mark unbound ones proposed and never describe a mocked contract as a live binding.
- Finance scripts use exact `Decimal` arithmetic and never plug a difference; fixture expectations in `tests/fixtures/finance/` are derived by hand, not from script output.
- Never call an organization a "practice", "firm" or "workspace" in user-facing text (workspaces are aletia "nexuses").
- Test fixture skills live only in `tests/fixtures/skills/` and must keep `metadata.internal: true`; without it the Skills CLI offers them to anyone installing from the repository root (it falls back to a recursive search when `skills/` is empty).
- Skills contain no credentials, no MCP URLs with tokens, and no direct write path to a business record.
- Use the Skills CLI from `node_modules/.bin/skills` (pinned in `package-lock.json`), never an unversioned `npx skills`.
- `skills` in tag-backoffice (`agents/pillars/skills.py`) are Python domain handlers, not Agent Skills; they stay there.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
