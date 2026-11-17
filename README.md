# tag-skills

TAG's library of installable **Agent Skills**: portable instructions that teach an agent client how to do a TAG task by calling TAG's authoritative MCP capabilities.

- **Repository status:** **New**. Scaffolding only, nothing migrated yet.
- **Visibility:** private ([organization repository catalogue](https://github.com/theapotheosisgroup/.github#repository-catalogue)).
- **Standards:** [theapotheosisgroup/.github](https://github.com/theapotheosisgroup/.github/tree/main/standards), in particular [AGENTS-AND-SKILLS](https://github.com/theapotheosisgroup/.github/blob/main/standards/AGENTS-AND-SKILLS.md#skills). This repository records only its own rules and exceptions.

## Responsibility

`tag-skills` owns the published skills and the tooling that proves they are valid and installable:

- skills in the open [Agent Skills format](https://agentskills.io/specification), one flat directory per skill: `skills/<name>/SKILL.md` with `name` and `description` frontmatter, and optional `references/`, `scripts/` and `assets/`;
- installation with the [Vercel Skills CLI](https://github.com/vercel-labs/skills) (`npx skills`);
- a validator, discovery and installation smoke tests, and script tests.

## Contract

What every published skill promises, and what consumers can rely on:

1. **Format.** `skills/<name>/SKILL.md` passes [`scripts/validate-skills.js`](scripts/validate-skills.js): YAML frontmatter with only specification fields; `name` equal to the directory, lowercase kebab-case, at most 64 characters; `description` at most 1024 characters; relative links resolve inside the skill.
2. **Self-contained.** Everything a skill needs is inside its directory. No symbolic links, no links out of the skill.
3. **No credentials, no permissions.** A skill holds no secret, token or key, and grants nothing. It refers to authoritative MCP capabilities, whose owners authorize every call. A skill never writes a ledger or business record directly.
4. **Installable.** Each skill is discoverable with `npx skills add theapotheosisgroup/tag-skills --list` and installs for the clients listed in [docs/INSTALLING.md](docs/INSTALLING.md), which also says what installation does **not** do (it does not make a skill available in hosted ChatGPT or Claude).

The boundary and its reasons are in [ARCHITECTURE.md](ARCHITECTURE.md) and [ADR 0001](docs/adr/0001-boundary.md).

## Status

Component status uses the [organization labels](https://github.com/theapotheosisgroup/.github/blob/main/standards/DOCUMENTATION.md#status-labels).

| Component | Status | Notes |
| --- | --- | --- |
| Skill validator ([`scripts/validate-skills.js`](scripts/validate-skills.js)) | **Implemented but not deployed** | Runs in CI. Nothing to deploy: it is a development tool. |
| Discovery and installation smoke test ([`scripts/smoke-skills-cli.js`](scripts/smoke-skills-cli.js)) | **Implemented but not deployed** | Runs in CI against the [test fixture](tests/fixtures/README.md). |
| Published skills ([`skills/`](skills/README.md)) | **Proposed but not implemented** | Empty. The first skills arrive in R05. |
| `skills/supplier-invoice` (from tag-backoffice's Claude plugin `agent.md`, decision D-13) | **Proposed but not implemented** | R05. The placeholder MCP URL and the credential note are removed on the way in. |
| `skills/finance-month-end`, `skills/finance-comparison`, `skills/document-processing`, `skills/governance-review`, `skills/work-status` | **Proposed but not implemented** | R05. New content describing how to use the back-office MCP tools. |
| `skills/intake` | **Blocked** | Its source exists only on unmerged tag-backoffice branches (`ore/fm-port-backoffice`, `ore/fm-intake-agent-*`). |
| Private-repository installation test | **Proposed but not implemented** | Needs a published skill; R05. |

### Sources (R00 inventory, 2026-11-17)

Nothing has been moved here. The R05 sources are reference material, not moved code: skills are new content. Each module that does arrive gets a row in [docs/PROVENANCE.md](docs/PROVENANCE.md).

| Source repository | Branch | SHA | What R05 draws on |
| --- | --- | --- | --- |
| tag-backoffice | develop | `5997a22978f83480741e3360b88833ecc29587e3` | `agents/supplier-invoice/agent.md` (Claude plugin); `mcp/server.py` tools and `agents/pillars/skills.py` as reference for what the skills call (the handlers stay in tag-backoffice; `prompts/*.md` stay too, because attestation digests hash them) |
| tag-website | develop | `fec083e9e3df851a57117eb7acf239dba06e90ff` | `.claude/skills/frontend-design/SKILL.md`, optional (a coding-agent skill, not a product skill) |

## Local development

Requires Node.js `26.13.0` ([`.nvmrc`](.nvmrc)) and npm. Everything, including the Skills CLI, installs from [`package-lock.json`](package-lock.json).

```bash
npm ci                 # install from the lockfile
npm run format:check   # Prettier (JavaScript, JSON, YAML); `npm run format` fixes
npm run lint           # ESLint
npm run typecheck      # TypeScript over the JSDoc-typed JavaScript
npm test               # validator unit tests
npm run test:smoke     # validate skills/ and the fixture, then the Skills CLI smoke test
```

To check one skill directory root: `node scripts/validate-skills.js skills`. The tool choice is recorded in [ADR 0002](docs/adr/0002-node-validator-and-pinned-skills-cli.md). Nothing reads environment variables, so there is no `.env.example`.

## Release and rollback

- **Release.** A skill is released when its pull request merges into `main`; consumers install from the repository. Versioned release tags, following [RELEASES](https://github.com/theapotheosisgroup/.github/blob/main/standards/RELEASES.md), start with the first published skill in R05 (**Proposed but not implemented**).
- **Rollback.** Revert the pull request on `main`; consumers then update or reinstall the skill. A skill deploys nothing and holds no state, so a rollback never touches a service.

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on every pull request and push to `main`. Every job blocks.

| Check | What it runs |
| --- | --- |
| `node / node` | The organization's [reusable Node.js workflow](https://github.com/theapotheosisgroup/.github/blob/main/.github/workflows/reusable-node-ci.yml): lockfile install, format, lint, type check, unit tests, and `test:smoke` (validator and Skills CLI smoke test). The production build step is off: there is nothing to build. |
| `markdown` | markdownlint over every Markdown file |
| `links` | lychee, offline: relative links and anchors |
| `codeowners` | GitHub's CODEOWNERS validation at the pull request head |
| `security / secrets`, `security / dependencies` | The organization's [reusable security workflow](https://github.com/theapotheosisgroup/.github/blob/main/.github/workflows/reusable-security.yml): gitleaks over the full history; OSV-Scanner vulnerability and license policy over `package-lock.json`. `dependency-review` is off: this is a private repository on the Team plan, without GitHub Code Security. |

Shared workflows are pinned to commit `605428cef3906d16913b49a697df33d61722f7d3` of `.github` `main`, because `.github` has no release tag yet. When it does, the pin moves to the release SHA.
