# Tests

What the `tag-skills` CI tests today, what it will test when skills arrive, and which security invariants this repository owns. CI runs every command below on each pull request ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

## What exists now (R01)

| Test | Command | What it proves |
| --- | --- | --- |
| Validator unit tests, [`validate.test.js`](validate.test.js) | `npm test` | The validator accepts a well-formed skill and rejects each rule violation. Invalid skills are built in temporary directories, so no broken `SKILL.md` is ever committed where a client could load it. |
| Published skills | `npm run validate` | Every directory under [`skills/`](../skills/README.md) passes the validator. `skills/` is empty until R05, so this reports 0 skills. |
| Test fixture | `node scripts/validate-skills.js --fixtures tests/fixtures/skills` | The [fixture skill](fixtures/README.md) is valid and hidden from installers. |
| Skills CLI discovery and installation | `node scripts/smoke-skills-cli.js` | With the pinned Skills CLI: the repository root lists every published skill and never the fixture; the fixture is discoverable from `tests/fixtures`; each skill installs into a disposable consumer project for Claude Code and Codex, byte-for-byte equal to its source. |

`npm run test:smoke` runs the last three in sequence.

## Planned layout (R05, **Proposed but not implemented**)

```text
tests/
├── README.md
├── validate.test.js         validator unit tests (exists)
├── fixtures/skills/         CI-only fixture skills, marked metadata.internal: true (exists)
└── skills/<name>/           tests for the scripts of skills/<name>/scripts/, one directory per skill
```

- **Script tests.** A skill that ships `scripts/` gets tests under `tests/skills/<name>/`, run by `npm test`. The validator already requires scripts to be executable.
- **Private repository installation.** `npx skills add theapotheosisgroup/tag-skills --skill <name>` from a disposable consumer project, using the GitHub credentials available to the CI environment. It needs at least one published skill, so it lands with the first skill in R05.

## Security invariants this repository owns

The invariants are defined in the foundation prompt, section 11. `tag-skills` holds documentation and scripts only, so it owns one invariant outright and contributes to two whose enforcement belongs to the capability owners.

| Invariant | Role of tag-skills | How it is tested | Status |
| --- | --- | --- | --- |
| **SEC-09** No secrets in source, build artifacts, logs or test outputs | Owns it for every published skill file | gitleaks over the full history (`security / secrets`); the validator rejects credential-like files (`.env`, `*.pem`, `*.key`, `credentials.json` and similar) and symbolic links inside a skill | Implemented: runs in CI on every pull request |
| **SEC-12** Read-only analytical delegation cannot be used to execute financial or ledger writes | Contributes: a skill confers no permission and never writes a ledger directly; it can only ask an MCP capability, which authorizes the call | Enforced and tested by the owning domain's MCP server (tag-backoffice, tag-mcp). Here: review of each skill in R05 that it calls only authoritative MCP tools and contains no direct write path | Proposed but not implemented (R05 gate) |
| **SEC-05** A token for one MCP audience is rejected by another | Contributes: skills carry no tokens and name no audience credentials | Enforced and tested in tag-mcp and the domain MCP servers | Proposed but not implemented (R05 gate) |
