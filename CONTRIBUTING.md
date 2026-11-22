# Contributing

Organization-wide rules for branches, pull requests, commits, reviews and testing are in [theapotheosisgroup/.github](https://github.com/theapotheosisgroup/.github/tree/main/standards), starting with [REPOSITORIES](https://github.com/theapotheosisgroup/.github/blob/main/standards/REPOSITORIES.md#branches-and-pull-requests) and [AGENTS-AND-SKILLS](https://github.com/theapotheosisgroup/.github/blob/main/standards/AGENTS-AND-SKILLS.md#skills). This file adds only what is specific to `tag-skills`.

Branch from `develop` and open pull requests against `develop` (the default branch); `main` is frozen.

## Before you open a pull request

```bash
npm ci
npm run format:check && npm run lint && npm run typecheck && npm test && npm run test:smoke
```

CI runs the same commands, plus Python 3.10 script tests, Markdown lint, offline link checking, CODEOWNERS validation and secret and dependency scanning ([README](README.md#continuous-integration)).

## Naming and layout

- The catalog holds back-office G&A skills only. Engineering, authoring and general productivity skills do not belong here.
- A skill lives in `skills/<pillar>/<pillar>-<name>/`. Pillars are TAG's service lines: `finance`, `people`, `governance` ([ADR 0004](docs/adr/0004-pillar-categories-and-prefixes.md)). A pillar directory exists only once it holds a skill.
- The name follows the [Agent Skills naming rules](https://agentskills.io/specification#name-field): 1-64 characters, lowercase letters, digits and single hyphens, no leading or trailing hyphen, equal to the folder name and the `name` field. TAG adds the pillar prefix (`finance-`, `people-`, `governance-`) to namespace its skills against others installed beside them; the specification does not require a prefix. Names are unique across pillars.
- A fork keeps the upstream name after the prefix unless the TAG scope differs (for example `audit-support` became `finance-audit-evidence`). Pick the pillar by the service the work belongs to, not by the upstream collection (for example the upstream `legal` and `enterprise-search` skills are `governance-`).
- A skill folder holds `SKILL.md`, `tag-skill.json`, `LICENSE` and `NOTICE.md` (for forks), and only the `references/`, `scripts/` and `assets/` it needs. Nothing links outside the folder.

## Adding or changing a skill

1. **SKILL.md.** Frontmatter: `name`, a `description` (at most 1024 characters) that says what the skill does **and when to use it** (and, where useful, when not to), optional `license` and `compatibility`. Fields outside the Agent Skills specification are rejected. The body explains the context the skill needs and where it comes from, its capability bindings, an ordered procedure with completion conditions, the output and evidence references, and how it handles missing inputs, unresolved differences, unavailable tools and required review. Keep it focused; long material goes in `references/`.
2. **tag-skill.json.** Fill in every field of [the schema](schemas/tag-skill.schema.json). Capabilities must exist in [docs/integration/capabilities.json](docs/integration/capabilities.json) and be named in backticks in SKILL.md; mark proposed ones as proposed. Skill dependencies must be named in SKILL.md so a single-skill install explains its prerequisites. Bump `version` (SemVer) when you change a published skill, as breaking when the [package versioning rules](packages/README.md#versioning) say so.
3. **No credentials, no direct writes.** Never include a URL with a token, a key or a sign-in note. Never describe or script a way to write a business record, post, approve, lock a period, sign or send, other than through an authorized capability after review.
4. **Scripts** are portable, use only declared dependencies (standard-library Python 3.10+ is the default), are executable (`git update-index --chmod=+x`), and have tests under `tests/skills/<name>/`. Numerical scripts use exact decimal arithmetic, never plug a difference, and have fixtures with independently established expected results.
5. **Profiles and packages.** If the skill belongs in a profile, add it to `profiles/<name>.json`. Every skill has exactly one home package: add a new skill to a `packages/<name>/plugin.json` with its tier, and record the change under `## [Unreleased]` in that package's `CHANGELOG.md`. An agent package that uses the skill bundles it too (`"from": "<home package>"`), and every package that ships a changed bundled skill releases with its home package ([agent packages](packages/README.md#agent-packages)). To release, bump the package version ([releasing](packages/README.md#releasing)).
6. Run `npm run catalog:generate` and commit `catalog.json`.
7. Update the [README](README.md#catalog) catalog and status in the same pull request. The tests check that every skill and profile appears there.

## Forking an upstream skill

1. Check the licence of the **exact folder** at the **exact commit**, including any licence file in a parent directory and any NOTICE file. If the licence is missing or unclear, do not copy: add a `blocked` entry to `upstreams.lock.json` and say why.
2. Copy the complete folder, including supporting files, from the pinned commit. Copy the applicable licence file to the skill's `LICENSE` unmodified.
3. Adapt: rename to the TAG name; replace tool placeholders and upstream command names with TAG capabilities and skill names; remove defaults that would silently become the organization's policy (jurisdiction, thresholds, playbooks); add the TAG contract sections. Keep upstream reference material in `references/`, with a comment marking it modified.
4. Write `NOTICE.md`: source URL, commit, original name, licence, copyright line if any, which files came from upstream and which are TAG's, that the files were modified by TAG and when, and an `## Adaptations` list.
5. Add the import to `upstreams.lock.json`: per-file SHA-256 and the folder hash (format in [scripts/lib/hash.js](scripts/lib/hash.js)), dependency paths (licence file, any file the upstream skill references from outside its folder), the adaptations. `npm run upstream:check` verifies the record against the upstream repository.
6. Preserve the provenance of any supporting content imported from outside the selected folder by listing it in `dependencyPaths`.

Updating a fork from upstream is described in the [maintenance guide](docs/maintenance.md).

## Review requirements

- A code owner reviews every change to `skills/`, `packages/`, `profiles/`, `schemas/`, `scripts/`, `upstreams.lock.json` and the licence files.
- A reviewer checks: the skill calls only named capabilities and carries nothing secret; writes stay behind authorized capabilities and review; the description triggers on the right requests and not on unrelated ones (add a case to [tests/selection/cases.json](tests/selection/cases.json)); provenance and notices are complete; narrative quality against the [evaluation rubric](docs/evaluation-rubric.md).
- A schema pass alone is not proof that a skill works: numerical and packaging behaviour needs tests with objective pass criteria.

## Test fixtures

Fixtures under `tests/fixtures/skills/` are for CI only and must set `metadata.internal: true` ([tests/fixtures/README.md](tests/fixtures/README.md)). Never move a fixture into `skills/`, and never add a skill to `skills/` only to make a check pass. Finance fixtures under `tests/fixtures/finance/` are synthetic; never use real client data.

## Changing the tooling

The Skills CLI and every other tool are pinned in `package-lock.json` ([ADR 0002](docs/adr/0002-node-validator-and-pinned-skills-cli.md)). An upgrade is its own pull request, and `npm run test:install` must pass with it. Do not call `npx skills` without a version in scripts or CI. Changing what the validator accepts needs an ADR.
