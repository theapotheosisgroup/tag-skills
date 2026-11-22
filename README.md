# tag-skills

TAG's library of installable **Agent Skills**: portable workflow instructions, templates and small scripts that teach an agent how to do TAG back-office work through TAG's authorized capabilities. Distributed from this Git repository with the [Vercel Skills CLI](https://github.com/vercel-labs/skills), and released as versioned [Agent Plugins 1.0.0](https://agent-plugins.org/specification) packages on GitHub releases ([packages](#packages-and-releases)); no npm package is published.

- **Repository status:** **Active development**. The 18-skill back-office catalog (16 forks and the instructions of two TAG agents) is implemented; live capability bindings are pending in other repositories ([integration](docs/integration/README.md)).
- **Visibility:** private ([organization repository catalogue](https://github.com/theapotheosisgroup/.github#repository-catalogue)).
- **Standards:** [theapotheosisgroup/.github](https://github.com/theapotheosisgroup/.github/tree/main/standards), in particular [AGENTS-AND-SKILLS](https://github.com/theapotheosisgroup/.github/blob/main/standards/AGENTS-AND-SKILLS.md#skills). Repository exceptions are recorded in [ADR 0003](docs/adr/0003-categories-and-tag-skill-metadata.md), [ADR 0004](docs/adr/0004-pillar-categories-and-prefixes.md), [ADR 0005](docs/adr/0005-agent-plugins-packages-and-releases.md) and [ADR 0006](docs/adr/0006-mcp-servers-and-agent-packages.md).

## Catalog

The catalog is back-office G&A work only, grouped by TAG's service pillars: **Finance**, **People** and **Governance**. Skills live in `skills/<pillar>/<pillar>-<name>/`; People has no skills yet ([roadmap](docs/roadmap.md#people-pillar-proposed-not-implemented)). P0 is the first financial-reporting workflow, P1 the rest of the catalog. The generated index, with metadata and content hashes, is [catalog.json](catalog.json).

**Why a prefix.** The [Agent Skills specification](https://agentskills.io/specification) does not require one: a name is 1-64 lowercase letters, digits and single hyphens, equal to its folder. Skills from several sources are installed side by side in one flat directory per agent (for example `.claude/skills/<name>/`), so a bare name such as `reconciliation` or `review-contract` can collide with another collection's skill and the agent picks by name and description. The pillar prefix namespaces TAG's skills against other installed skills, keeps names unique across pillars, and tells the agent (and the person reading an installed list) which service line a skill belongs to. It replaces the earlier `tag-` prefix, which namespaced but said nothing about the work ([ADR 0004](docs/adr/0004-pillar-categories-and-prefixes.md)).

| Pillar | Skill | Priority | Side effects | What it does |
| --- | --- | --- | --- | --- |
| finance | [`finance-close-management`](skills/finance/finance-close-management/SKILL.md) | P0 | authorized-write | Close plan, dependencies, owners, period locks and unresolved items |
| finance | [`finance-financial-statements`](skills/finance/finance-financial-statements/SKILL.md) | P0 | draft | Draft statement package (income statement, balance sheet, cash flows, equity, notes, exceptions) under ASPE or IFRS, English or French, with a reproducible script |
| finance | [`finance-journal-entry-prep`](skills/finance/finance-journal-entry-prep/SKILL.md) | P0 | draft | Prepare supported adjusting entries with a checking script; posting is a separate authorized operation |
| finance | [`finance-reconciliation`](skills/finance/finance-reconciliation/SKILL.md) | P0 | draft | Bank, control-account, subledger and intercompany reconciliations; differences reported, never plugged |
| finance | [`finance-variance-analysis`](skills/finance/finance-variance-analysis/SKILL.md) | P0 | draft | Actual vs budget, forecast or prior period with traceable drivers and configured thresholds |
| finance | [`finance-audit-evidence`](skills/finance/finance-audit-evidence/SKILL.md) | P1 | draft | Evidence indexes and workpapers; general evidence support distinct from SOX-specific procedures |
| finance | [`finance-build-dashboard`](skills/finance/finance-build-dashboard/SKILL.md) | P1 | draft | Management dashboards from verified report data and declared metric definitions |
| finance | [`finance-explore-data`](skills/finance/finance-explore-data/SKILL.md) | P1 | draft | Profile accounting data: missing fields, duplicates, sign issues, coverage gaps |
| finance | [`finance-validate-data`](skills/finance/finance-validate-data/SKILL.md) | P1 | draft | Check calculations, completeness, aggregation and whether conclusions follow |
| governance | [`governance-concierge`](skills/governance/governance-concierge/SKILL.md) | P1 | authorized-write | The Concierge agent's instructions: answer from the records the person may see, report how requests and TAG work stand, find and send documents, file confirmed requests |
| governance | [`governance-due-diligence`](skills/governance/governance-due-diligence/SKILL.md) | P1 | authorized-write | The due-diligence agent's instructions: raise and drive a data room's request list, or find and file the documents that answer it |
| governance | [`governance-review-contract`](skills/governance/governance-review-contract/SKILL.md) | P1 | authorized-write | Review against the organization's approved, jurisdiction-specific playbook; routing and signature requests kept separate |
| governance | [`governance-triage-nda`](skills/governance/governance-triage-nda/SKILL.md) | P1 | read | Classify NDA deviations and route under the organization's delegation rules |
| governance | [`governance-vendor-check`](skills/governance/governance-vendor-check/SKILL.md) | P1 | read | Supplier agreement status, dates, obligations and supporting records |
| governance | [`governance-knowledge-synthesis`](skills/governance/governance-knowledge-synthesis/SKILL.md) | P1 | read | Attributed answers and evidence bundles with conflicts kept visible |
| governance | [`governance-search-strategy`](skills/governance/governance-search-strategy/SKILL.md) | P1 | read | Plan searches within the active organization, nexus and delegated access |
| governance | [`governance-source-management`](skills/governance/governance-source-management/SKILL.md) | P1 | read | Available sources, freshness, authority and missing integrations |
| governance | [`governance-task-management`](skills/governance/governance-task-management/SKILL.md) | P1 | authorized-write | Work tracked as TAG expectations and work items; Matter mapping proposed |

Side effects: `none` (guidance only), `read` (reads organization data through capabilities), `draft` (also writes drafts or files, never a business record), `authorized-write` (may invoke a write capability, which the runtime authorizes and review governs). Every skill except the two agent instructions (TAG-original) is forked from a pinned upstream commit; see [Provenance](#provenance).

## Quick start (consumers)

The repository is private: the CLI clones it with your existing Git, SSH or GitHub credentials. Never put a token in a command or a configuration file.

```bash
# Inspect the catalog
npx skills@latest add theapotheosisgroup/tag-skills --list

# Install the initial finance workflow into a consumer project for Codex and Claude Code
npx skills@latest add theapotheosisgroup/tag-skills --skill finance-financial-statements finance-reconciliation finance-journal-entry-prep finance-close-management finance-variance-analysis -a codex -a claude-code

# Install a selected, versioned skill into an isolated TAG runtime bundle
npx skills@latest add theapotheosisgroup/tag-skills@<RELEASE_TAG_OR_COMMIT> --skill finance-financial-statements -a universal --copy -y
```

These are consumer commands: run them in the project that will use the skills, never to overwrite this repository's `skills/`. For controlled builds use the version this repository tests (`npx skills@1.9.0`) instead of `@latest`, and an immutable release tag or full commit SHA; with that CLI version a branch or a short SHA must be written `#<ref>` ([details](docs/INSTALLING.md)).

A skill installed on its own works on its own, except where its `tag-skill.json` declares skill dependencies (for example finance-close-management needs finance-reconciliation, finance-journal-entry-prep and finance-financial-statements); its SKILL.md names them. Use a profile to get them installed together.

## Profiles

The Skills CLI does not read TAG's dependency metadata, so profiles are installed with [scripts/install-profile.js](scripts/install-profile.js), a small wrapper over the pinned CLI that expands dependencies into an explicit `--skill` list and validates every argument before invoking it. Run it from a checkout of this repository after `npm ci`:

```bash
npm run install:profile -- --profile finance --dir ../consumer-project --agent claude-code --agent codex
npm run install:profile -- --profile backoffice --ref v0.1.0 --agent universal --mode copy --dir ./bundle
```

| Profile | Contents | Skills after expansion |
| --- | --- | --- |
| `backoffice` | The whole back-office G&A catalog: the finance and governance profiles (and people, once it has skills). | 18 |
| `finance` | The Finance pillar: statements, reconciliation, journal entry preparation, close management, variance analysis, audit evidence, and accounting data exploration, validation and dashboards. | 9 |
| `governance` | The Governance pillar: contract review, NDA triage, vendor checks, the knowledge skills (search strategy, source management, knowledge synthesis), task management, and the Concierge and due-diligence agent instructions. | 9 |

The earlier profiles map as follows: `finance-core` and `controller` → `finance` (a superset), `legal` → `governance` (a superset), `backoffice` → `backoffice` (now the whole catalog). `authoring` was removed with the engineering and productivity skills.

Dependencies are expanded from this checkout, so a remote install is pinned to a matching revision: by default this checkout's HEAD commit, which must already be on the remote, with no uncommitted changes under `skills/` or `profiles/`. See [docs/INSTALLING.md](docs/INSTALLING.md#profiles-and-dependencies) for the checks and how to resolve a refusal.

Options: `--source` (default `theapotheosisgroup/tag-skills`, or a local path, installed as it is), `--ref` (tag, commit or branch; the checkout must be at that revision so dependency metadata matches, unless `--allow-ref-mismatch`), `--agent` (repeatable; default `universal`), `--dir` (default: current directory), `--mode copy|symlink` (default `symlink`), `--dry-run`. Profiles are defined in [profiles/](profiles/).

## Packages and releases

Skills ship to organizations and to TAG's own agents as versioned packages in the [Agent Plugins 1.0.0](https://agent-plugins.org/specification) format, one per pillar plus the shared knowledge skills ([ADR 0005](docs/adr/0005-agent-plugins-packages-and-releases.md)). Each package records the lowest plan tier (Foundation, Structure, Turnkey) of every skill it ships; the tier table, versioning rules and release steps are in [packages/README.md](packages/README.md).

| Package | Skills | Requires |
| --- | --- | --- |
| `tag-finance` | The 9 `finance-` skills | |
| `tag-governance` | governance-task-management, governance-triage-nda, governance-vendor-check, governance-review-contract | `tag-knowledge` |
| `tag-knowledge` | governance-search-strategy, governance-source-management, governance-knowledge-synthesis (used by every pillar) | |
| `tag-concierge` (agent) | governance-concierge, with the task and knowledge skills it uses | |
| `tag-due-diligence` (agent) | governance-due-diligence, with the task and knowledge skills it uses | |

Every package ships the same `mcp.json`, declaring the two MCP servers people use: the **TAG MCP** (`tag`, back-office tools) and the **Aletia MCP** (`aletia`, nexuses, people, requests, documents, sends), remote Streamable HTTP servers the client authorizes with OAuth through the TAG login. Agent Plugins 1.0 allows no variable in a server URL, so each release has one archive per environment: `<package>-<version>.tar.gz` for production and `<package>-<version>.develop.tar.gz` for develop. An **agent package** is an agent built from skills: its instructions skill, every skill it uses (bundled from their home packages, so it loads on its own) and the `mcp.json` ([ADR 0006](docs/adr/0006-mcp-servers-and-agent-packages.md)). How to load one in ChatGPT, Claude or the TAG harness: [loading a TAG agent](docs/INSTALLING.md#loading-a-tag-agent-chatgpt-claude-or-the-harness).

A version is released when its `plugin.json` version changes on `develop`: [`.github/workflows/release.yml`](.github/workflows/release.yml) publishes a GitHub release `<package>@<version>` with a reproducible archive and updates the [release index](https://github.com/theapotheosisgroup/tag-skills/releases/download/skills-index/index.json) that harness updaters poll ([package updates](docs/integration/harness-consumption.md#package-updates)). Pull requests run the same build as a dry run and publish nothing.

## Contract

1. **Format.** Each skill passes [`scripts/validate-skills.js`](scripts/validate-skills.js): Agent Skills frontmatter limited to specification fields, a unique name equal to its folder and prefixed with its pillar (`finance-`, `people-`, `governance-`), a description that says what the skill does and when to use it, links that resolve inside the skill.
2. **TAG metadata.** `tag-skill.json` ([schema](schemas/tag-skill.schema.json)) declares version, domain, audiences, invocation mode, logical capabilities, inputs, outputs, dependencies, side-effect class, review conditions and provenance. It describes a contract; it grants nothing.
3. **Self-contained.** Everything a skill needs is in its folder or declared: scripts list their interpreter (for example `python3 >= 3.10`), capabilities are named, other skills are declared dependencies. Licence and notice files travel with the skill.
4. **No credentials, no direct writes.** No secret, token or key; no script that writes a ledger or business record or sends anything. Writes go through authorized capabilities after review ([capability contract](docs/integration/capability-contract.md)).
5. **Installable.** Discovery and installation are tested with the pinned CLI for codex, claude-code and universal.

The boundary and its reasons are in [ARCHITECTURE.md](ARCHITECTURE.md), [ADR 0001](docs/adr/0001-boundary.md) and [ADR 0003](docs/adr/0003-categories-and-tag-skill-metadata.md).

## Provenance

[upstreams.lock.json](upstreams.lock.json) is TAG's import record: for each fork, the source repository, commit, path, licence, original and TAG names, destination, import date, per-file and folder hashes, dependency paths and TAG adaptations. It is separate from the CLI's consumer `skills-lock.json`. Licences: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [LICENSES/](LICENSES/). Upstream changes are reviewed with `npm run upstream:check` ([maintenance guide](docs/maintenance.md)). The previously identified `samuelclk/dinoclaw_guides` financial-statements skill is excluded until its licence is established. Skills removed from the catalog (the engineering and productivity skills and SQL queries, on 2026-11-21) keep their import history in the lock as `removed` records.

## Status

Component status uses the [organization labels](https://github.com/theapotheosisgroup/.github/blob/main/standards/DOCUMENTATION.md#status-labels).

| Component | Status | Notes |
| --- | --- | --- |
| 16 forked skills and 2 agent-instructions skills ([catalog](#catalog)) | **Implemented but not deployed** | Installable from this repository; no release tag yet |
| finance-financial-statements script and fixtures | **Implemented but not deployed** | Six synthetic fixtures with hand-derived results; [operating example](docs/finance/README.md) |
| Validator, catalog, profiles, profile installer, upstream check | **Implemented but not deployed** | Development tooling; runs in CI except `upstream:check` (network) |
| Capability bindings | **Proposed but not implemented** | Fourteen capabilities map to existing TAG MCP and Aletia MCP tools (not exercised from here); the rest are proposed. [Dependencies](docs/integration/README.md#dependencies-on-other-repositories) |
| Skill packages and release workflow | **Implemented but not deployed** | Five Agent Plugins 1.0.0 packages: the three pillar packages (`0.1.0` published, `0.1.1` adds `mcp.json`) and the two agent packages (`0.1.0`); the dry run runs on every pull request and merging to `develop` publishes |
| Package `mcp.json` (TAG MCP and Aletia MCP) | **Implemented but not deployed** | Declared per environment; the MCP host is not answering yet in develop or production (tag-platform host map), so loading a package wires the servers but they connect only once deployed |
| Harness package updater | **Proposed but not implemented** | tag-harness polls the release index ([package updates](docs/integration/harness-consumption.md#package-updates)) |
| Harness consumption | **Proposed but not implemented** | TrueForge needs a runtime bundle because this repository is private ([harness consumption](docs/integration/harness-consumption.md)) |
| Private-repository installation test | **Proposed but not implemented** | Needs a merged default branch and a CI credential decision |
| Planned R05 skills from tag-backoffice | **Proposed but not implemented** | Sources and blockers: [PROVENANCE](docs/PROVENANCE.md#planned-sources-r05-from-the-r00-inventory) |
| TAG-native follow-on skills | **Proposed but not implemented** | [Roadmap](docs/roadmap.md) |

## Local development

Requires Node.js `26.13.0` ([`.nvmrc`](.nvmrc)), npm and Python 3.10 or later (for skill scripts and their tests). Everything else installs from [`package-lock.json`](package-lock.json).

```bash
npm ci                    # install from the lockfile, including the pinned Skills CLI
npm run format:check      # Prettier; `npm run format` fixes
npm run lint              # ESLint
npm run typecheck         # TypeScript over the JSDoc-typed JavaScript
npm run validate          # skills, sidecars, profiles, provenance, licences, the fixture
npm run catalog:generate  # rewrite catalog.json; `npm run catalog:check` verifies it
npm run packages:check    # packages/*/plugin.json and packages/mcp.json: Agent Plugins 1.0.0 schemas, membership, bundles, tiers, changelogs
npm run release:dry-run   # build and verify the package archives and release index in dist/release (publishes nothing)
npm test                  # unit, contract, fixture, selection and script tests
npm run test:install      # discovery and installation with the pinned CLI
npm run test:smoke        # validate + catalog:check + packages:check + test:install (CI's contract step)
npm run upstream:check    # compare forks with upstream (network)
```

What each test proves is in [tests/README.md](tests/README.md). Nothing reads environment variables, so there is no `.env.example`.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md) (forking and updating skills, naming, review), [AGENTS.md](AGENTS.md) for agents, the [maintenance guide](docs/maintenance.md), the [evaluation rubric](docs/evaluation-rubric.md) and the [roadmap](docs/roadmap.md).

## Release and rollback

- **Package release.** Bumping a package's `plugin.json` version and merging to `develop` publishes `<package>@<version>` and updates the release index ([packages/README.md](packages/README.md#releasing)). Published versions never change.
- **Repository release.** A skill change is released when its pull request merges. Repository releases are `vMAJOR.MINOR.PATCH` tags with a [CHANGELOG.md](CHANGELOG.md) entry, per [RELEASES](https://github.com/theapotheosisgroup/.github/blob/main/standards/RELEASES.md); the first (`v0.1.0`) is **Proposed but not implemented**. Runtime bundles pin a tag or full SHA.
- **Rollback.** Pin consumers to the previous package version (or repository tag), or revert on `develop` and release a new version; consumers reinstall. A skill deploys nothing and holds no state.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and push to `develop`. Every job blocks.

| Check | What it runs |
| --- | --- |
| `node / node` | The organization's [reusable Node.js workflow](https://github.com/theapotheosisgroup/.github/blob/main/.github/workflows/reusable-node-ci.yml): lockfile install, format, lint, type check, `npm test` (unit, contract, finance fixture, selection and script tests, using the runner's Python 3), and `test:smoke` (validation, catalog check, package check, Skills CLI discovery and installation). The build step is off: there is nothing to build. |
| `python-minimum` | The skill-script tests on Python 3.10, the minimum the scripts declare |
| `release / dry-run` | [`release.yml`](.github/workflows/release.yml) on pull requests: builds every new package version against the published release index, enforces the versioning rules and verifies the archives; publishes nothing. On a push to `develop`, `release / publish` publishes the new versions instead |
| `markdown` | markdownlint over every Markdown file |
| `links` | lychee, offline: relative links and anchors |
| `codeowners` | GitHub's CODEOWNERS validation at the pull request head |
| `security / secrets`, `security / dependencies` | The organization's [reusable security workflow](https://github.com/theapotheosisgroup/.github/blob/main/.github/workflows/reusable-security.yml): gitleaks over the full history; OSV-Scanner vulnerability and license policy over `package-lock.json`. `dependency-review` is off: private repository on the Team plan, without GitHub Code Security. |

Shared workflows are pinned to commit `605428cef3906d16913b49a697df33d61722f7d3` of `.github` `main`, because `.github` has no release tag yet. CI uses no live client credentials and performs no ledger operation.
