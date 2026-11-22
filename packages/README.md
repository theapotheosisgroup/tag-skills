# Skill packages

TAG's skills are released as versioned packages in the [Agent Plugins 1.0.0](https://agent-plugins.org/specification) format ([ADR 0005](../docs/adr/0005-agent-plugins-packages-and-releases.md)). Each directory here is one package's source: `plugin.json` (the manifest, published unchanged) and `CHANGELOG.md`. The skills stay in [`skills/`](../skills/); the release build assembles each package as a plugin directory:

```text
tag-finance/
  plugin.json
  CHANGELOG.md
  skills/
    finance-reconciliation/SKILL.md, tag-skill.json, LICENSE, NOTICE.md, references/...
    ...
```

## Packages and tiers

Tiers are cumulative: Structure includes every Foundation skill, Turnkey every skill of the package. The tier is the lowest plan tier that includes the skill, recorded in `plugin.json` under `extensions["com.theapotheosisgroup.tag-skills"]`.

| Package | Foundation | Structure adds | Turnkey adds |
| --- | --- | --- | --- |
| `tag-finance` | finance-financial-statements, finance-journal-entry-prep, finance-reconciliation | finance-close-management, finance-variance-analysis | finance-audit-evidence, finance-build-dashboard, finance-explore-data, finance-validate-data |
| `tag-governance` (requires `tag-knowledge`) | governance-task-management | governance-triage-nda, governance-vendor-check | governance-review-contract |
| `tag-knowledge` (every pillar) | governance-knowledge-synthesis, governance-search-strategy, governance-source-management | | |

`tag-people` will exist once the People pillar has a skill ([roadmap](../docs/roadmap.md#people-pillar-proposed-not-implemented)).

## Versioning

Packages follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While the major version is 0 (as now), a **minor** bump is breaking and a **patch** bump covers features and fixes; from `1.0.0`, **major** is breaking, **minor** a feature, **patch** a fix. A published version is never changed or republished.

| Level | The package changes like this |
| --- | --- |
| Breaking | A skill is removed or moved to another package; a skill's tier is raised; a skill's own version has a breaking bump; a skill's side effects escalate (`none` < `read` < `draft` < `authorized-write`); a skill's invocation changes from `model` to `user`; a skill newly requires a capability or input, or drops an output; the package newly requires another package, or a range of it that excludes the previously required versions; the package targets a new Agent Plugins version |
| Feature | A skill is added; a skill's tier is lowered; a skill adds an output or a dependency; a skill's own version has a minor bump (from 1.0.0); invocation changes from `user` to `model` |
| Fix | Any other change to a skill's files, with a patch bump of its own version |

A **skill's own version** (`tag-skill.json`) follows the same rule for that skill: bump it as breaking when a client of the skill would have to change, for example a changed data-format identifier (`tag.journal-entry-prep.batch/v1` to `v2`), a removed procedure step an agent relied on, or narrower triggering that stops selecting it for requests it used to handle. A skill whose files changed since its package's previous release must bump its version.

`node scripts/release.js build` detects the changes in the table by comparing each package with its previous published version in the release index, and refuses a package bump that is too small for them. A stable version is compared with the highest lower stable version (a pre-release with the highest lower version of any kind), and may be released below a published pre-release, so a hotfix on the stable line can ship while the next line is in pre-release. A required package's range is `^` its version when first required, and stays unchanged while the required package's current version still satisfies it and the range's lowest version ships every skill the package depends on, so a compatible release of `tag-knowledge` never forces a release of `tag-governance`. A stable version never requires a pre-release: while a required package is in pre-release, a stable release's range comes from that package's highest published stable version, and the release is refused if that version lacks a skill it needs. A pre-release may require a pre-release. It cannot judge wording; reviewers check that the skill's own bump is honest.

## Releasing

1. Change the skills as usual ([CONTRIBUTING](../CONTRIBUTING.md#adding-or-changing-a-skill)), bumping each changed skill's `tag-skill.json` version, and record the change under `## [Unreleased]` in the package's `CHANGELOG.md`.
2. To release, bump `version` in the package's `plugin.json` and rename the `Unreleased` entries into a `## [x.y.z]` section. A pre-release (`0.2.0-rc.1`) is published as a GitHub pre-release and stays off the `stable` channel.
3. Run `npm run release:dry-run` (build and verify into `dist/release/`, publishing nothing). Without `--previous-index` it treats every package as a first release; the pull request's `release / dry-run` check uses the published index and shows what would be published.
4. Merge to `develop`. `.github/workflows/release.yml` publishes each new version as a GitHub release `<package>@<version>` with its archive and replaces the index on the `skills-index` release.

Changes merged without a version bump stay pending (the dry run lists them) and ship with the next bump.

## Release index

Updaters poll <https://github.com/theapotheosisgroup/tag-skills/releases/download/skills-index/index.json> ([schema](../schemas/release-index.schema.json)). For each package it gives the `stable` channel and every version with its archive URL, SHA-256 and size, whether it is breaking and what changed, the minimum Agent Plugins version, the packages it requires, each skill's version, tier, content hash and contract summary, the skills per tier, and the changelog section. How a harness should use it is in [harness consumption](../docs/integration/harness-consumption.md#package-updates).
