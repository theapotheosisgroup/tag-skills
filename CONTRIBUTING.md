# Contributing

Organization-wide rules for branches, pull requests, commits, reviews and testing are in [theapotheosisgroup/.github](https://github.com/theapotheosisgroup/.github/tree/main/standards), starting with [REPOSITORIES](https://github.com/theapotheosisgroup/.github/blob/main/standards/REPOSITORIES.md#branches-and-pull-requests) and [AGENTS-AND-SKILLS](https://github.com/theapotheosisgroup/.github/blob/main/standards/AGENTS-AND-SKILLS.md#skills). This file adds only what is specific to `tag-skills`.

## Before you open a pull request

```bash
npm ci
npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:smoke
```

CI runs the same commands, plus Markdown lint, offline link checking, CODEOWNERS validation and secret and dependency scanning ([README](README.md#continuous-integration)).

## Adding or changing a skill

1. Create `skills/<name>/SKILL.md`. `<name>` is lowercase kebab-case, at most 64 characters, and equals the `name` field.
2. Write a `description` (at most 1024 characters) that says what the skill does **and when to use it**: clients decide whether to load a skill from this text.
3. Name the authoritative MCP capability the skill uses, by server and tool. Never include a URL with a token, a key, a sign-in note or any other credential, and never describe a way to write a business record other than through the owning domain's tools.
4. Put long material in `references/`, executable helpers in `scripts/` (executable bit set: `git update-index --chmod=+x`) and static files in `assets/`. Nothing else goes in the skill directory except an optional `LICENSE` file, and nothing may link outside it.
5. Say which clients the skill supports, in `compatibility` or in the instructions, if it needs more than a standard client ([docs/INSTALLING.md](docs/INSTALLING.md)).
6. Add tests for every script under `tests/skills/<name>/` ([tests/README.md](tests/README.md#planned-layout-r05-proposed-but-not-implemented)).
7. If the skill is adapted from a file in another repository, add a row to [docs/PROVENANCE.md](docs/PROVENANCE.md) with the source SHA.
8. Update the component status in the [README](README.md#status) in the same pull request.

Frontmatter fields outside the Agent Skills specification are rejected. Adding one (for example a client-specific extension) is a change to the validator and needs an ADR.

## Test fixtures

Fixtures under `tests/fixtures/skills/` are for CI only and must set `metadata.internal: true` ([tests/fixtures/README.md](tests/fixtures/README.md)). Never move a fixture into `skills/`, and never add a skill to `skills/` only to make a check pass.

## Changing the tooling

The Skills CLI and every other tool are pinned in `package-lock.json` ([ADR 0002](docs/adr/0002-node-validator-and-pinned-skills-cli.md)). An upgrade is its own pull request, and the smoke test must pass with it. Do not call `npx skills` without a version in scripts or CI.
