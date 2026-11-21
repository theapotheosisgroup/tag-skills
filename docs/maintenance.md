# Maintenance guide

How to keep the catalog current without losing TAG's adaptations.

## Checking upstream for changes

```bash
npm run upstream:check                                   # verify every record and compare with upstream HEAD
npm run upstream:check -- --ref <tag-or-commit> --diff-dir /tmp/upstream-diffs
npm run upstream:check -- --source mattpocock/skills --fail-on-change
```

The command fetches each source at the recorded commit, verifies that every imported folder still hashes to `sourceHash` in [upstreams.lock.json](../upstreams.lock.json), and reports which folders changed at the compared ref. With `--diff-dir`, it writes one patch per changed skill: the upstream change only, not a patch to apply blindly. It needs git and network access to GitHub; CI runs only its offline test.

## Applying an upstream change

1. Read the patch. Decide what to take: fixes and improvements usually; anything that reintroduces placeholders, US-specific defaults as policy, tracker conventions or write paths, not.
2. Apply it by hand to the TAG folder (`references/upstream-guide.md` for Anthropic skills, `SKILL.md` and `references/` for Matt Pocock's), keeping the TAG adaptations listed in the skill's `NOTICE.md`.
3. Update the lock entry: the new `commit` for the source, the new `files` and `sourceHash` for the skill, the `importDate`, and the adaptations list if it changed. Update `NOTICE.md` to match.
4. Bump the skill's `version` in `tag-skill.json` (SemVer: PATCH for fixes, MINOR for compatible additions, MAJOR when inputs, outputs or behaviour change incompatibly).
5. Run `npm run catalog:generate`, then every check (`npm run validate`, `npm test`, `npm run test:install`) and the skill's own evaluations. For a finance skill with a script, the fixture evaluations must still pass with their hand-derived results.
6. Open a pull request that names the upstream commit range.

Never run `npx skills add` from an upstream repository into this repository's `skills/`: it would overwrite the maintained TAG folders.

## Adding a fork

Follow [CONTRIBUTING.md](../CONTRIBUTING.md#forking-an-upstream-skill). Check the licence of the exact folder at the exact commit first; if it is unclear, record a `blocked` entry in the lock instead of importing.

## Upgrading the Skills CLI

The CLI is pinned in `package.json` and `package-lock.json` (currently `1.9.0`, published 2026-11-16, engine `node >=22.20.0`). An upgrade is its own pull request (Dependabot or manual) and must pass `npm run test:install`, which checks nested discovery, the three tested agent paths, copy and symlink modes, lockfile restore and that the fixture stays hidden. Check the CLI's source-parsing rules for `@ref` and `#ref` when upgrading (see [harness-consumption.md](integration/harness-consumption.md#releases)).

## Releases

Skills are versioned individually in `tag-skill.json`; the repository is released with `vMAJOR.MINOR.PATCH` tags on `main` and a [CHANGELOG.md](../CHANGELOG.md) entry in the Keep a Changelog format, per the organization's [RELEASES](https://github.com/theapotheosisgroup/.github/blob/main/standards/RELEASES.md) standard. Changesets are not used: the organization's convention is Keep a Changelog, and there is no npm package to version.

## Generated files

- `catalog.json`: `npm run catalog:generate`; CI fails if it is stale.
- `docs/finance/examples/`: regenerate with the command in [tests/skills/tag-financial-statements/examples.test.js](../tests/skills/tag-financial-statements/examples.test.js) when the statement script's output changes on purpose.
