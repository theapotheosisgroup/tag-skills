# Tests

What the `tag-skills` CI tests and which security invariants this repository owns. CI runs every command below on each pull request ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).

## Layout and what each test proves

| Test | Command | What it proves | Criterion |
| --- | --- | --- | --- |
| [`validate.test.js`](validate.test.js) | `npm test` | The validator accepts well-formed skills and rejects each rule violation, in both layouts. Invalid skills are built in temporary directories | Objective |
| [`repository.test.js`](repository.test.js) | `npm test` | The committed repository ships exactly the 24 forks and passes every contract check; profiles expand to the documented sets and stay closed under dependencies; broken sidecars, profiles, licences, notices and lock hashes are rejected; catalog generation is reproducible and matches `catalog.json` | Objective |
| [`install-profile.test.js`](install-profile.test.js) | `npm test` | The profile installer validates every argument before invoking the CLI and builds the argument array (dependency expansion, `#ref` pins, the default pin to the checkout's HEAD commit and its refusal when that commit is not on the remote or the remote cannot be reached over HTTPS or SSH, the refusal of uncommitted `skills/` or `profiles/` changes, copy mode) | Objective |
| [`upstream-check.test.js`](upstream-check.test.js) | `npm test` | Against a local git repository: record verification, change detection limited to the imported folder, proposed diffs, integrity failure | Objective |
| [`skills/tag-financial-statements/`](skills/tag-financial-statements/) | `npm test` | The statement builder against six synthetic fixtures with hand-derived results ([fixtures](fixtures/README.md#finance-fixtures)), plus determinism, traceability, presentation rounding, missing and unsupported inputs; committed example outputs equal the script's output | Objective (exact decimals, exact exception sets) |
| [`skills/tag-journal-entry-prep/`](skills/tag-journal-entry-prep/) | `npm test` | The entry checker: balance, accounts, open periods, support, approval, not-posted posting request | Objective |
| [`contracts/`](contracts/capability-contract.test.js) | `npm test` | **Contract checks with mocks**: missing tool, missing policy, refused capability and unauthorized write responses, using [mocks/capability-host.js](mocks/capability-host.js); no shipped script opens a network connection or starts a process. Runtime enforcement is validated in the owning runtimes | Objective, mocked |
| [`selection/`](selection/selection.test.js) | `npm test` | The harness audience filter keeps authoring skills out of client catalogs; a lexical proxy ranks the expected skill first for 25 positive and negative requests, with authoring skills well behind on business requests | Objective proxy; model behaviour is judged with the [rubric](../docs/evaluation-rubric.md) |
| Published skills and fixture | `npm run validate` | Every skill under `skills/<category>/` passes the validator and the repository contract; the fixture is valid and hidden | Objective |
| Catalog | `npm run catalog:check` | `catalog.json` is what generation writes | Objective |
| Installation ([`scripts/smoke-skills-cli.js`](../scripts/smoke-skills-cli.js)) | `npm run test:install` | With the pinned CLI: discovery lists all 24 skills and hides the fixture; selected installs for codex, claude-code and universal contain exactly the selected skills, byte-for-byte with licences, notices, sidecars and scripts; every skill installs; the consumer lockfile restores unchanged; the profile installer works in copy and symlink modes with dependency expansion; installed scripts run from a copy outside the repository with `python3 -I` and a bare environment | Objective |

`npm run test:smoke` runs validate, catalog:check and test:install in sequence. CI also runs the skill-script tests on Python 3.10, the declared minimum.

Not run in CI: `npm run upstream:check` against GitHub (network; run during maintenance), and installation from the private GitHub repository (needs a credential decision).

## Security invariants this repository owns

The invariants are defined in the foundation prompt, section 11. `tag-skills` holds documentation and scripts only, so it owns one invariant outright and contributes to others whose enforcement belongs to the capability owners.

| Invariant | Role of tag-skills | How it is tested | Status |
| --- | --- | --- | --- |
| **SEC-09** No secrets in source, build artifacts, logs or test outputs | Owns it for every published skill file | gitleaks over the full history (`security / secrets`); the validator rejects credential-like files and symbolic links inside a skill; fixtures are synthetic | Implemented: runs in CI on every pull request |
| **SEC-12** Read-only analytical delegation cannot be used to execute financial or ledger writes | Contributes: a skill confers no permission and ships no write path; write capabilities require `authorized-write` and review in metadata | Validator rules on side effects; contract test that scripts open no network connection or process; mocked refusal shapes. Enforcement is tested by the owning runtime (tag-mcp, tag-backoffice) | Implemented here as static and mocked checks; runtime enforcement pending |
| **SEC-05** A token for one MCP audience is rejected by another | Contributes: skills carry no tokens and name no audience credentials | Enforced and tested in tag-mcp and the domain MCP servers | Not applicable here beyond SEC-09 |
