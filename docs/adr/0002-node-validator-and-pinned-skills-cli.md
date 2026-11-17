# 0002. Write the skill validator in Node.js and pin the Skills CLI in the lockfile

- **Status:** Accepted
- **Date:** 2026-11-17
- **Deciders:** the tag-skills maintainers (CODEOWNERS), during R01

## Context

The organization standards require tag-skills CI to validate `SKILL.md` frontmatter, test discovery with `npx skills add . --list` and run an installation smoke test. The Vercel Skills CLI is an npm package, so Node.js is needed in CI regardless. An unpinned `npx skills` would download whatever version is newest at run time, which makes CI irreproducible and runs unreviewed code.

## Decision

- The validator and the smoke test are plain JavaScript (ES modules) with JSDoc types, checked by TypeScript (`tsc --noEmit`, `checkJs`). There is no build step.
- Dependencies are exact versions in `package.json` and locked in `package-lock.json`: the Skills CLI (`skills`), `yaml` for frontmatter parsing, and the format, lint and type-check tools. CI installs with `npm ci` and invokes `node_modules/.bin/skills`, never `npx skills@latest`.
- The Node.js version is pinned in `.nvmrc`.
- CI uses the organization's `reusable-node-ci.yml`, with `test:smoke` as its contract-test step and the build step turned off.

## Consequences

- A Skills CLI upgrade is a reviewed pull request (Dependabot or manual) that the smoke test must pass, including the check that the test fixture stays hidden.
- OSV-Scanner checks the CLI and its dependencies for vulnerabilities and license policy like any other dependency.
- Skills themselves do not depend on this tooling; a skill's own scripts declare their own dependencies.

## Alternatives considered

- **Python with uv.** Rejected: CI would need Node.js anyway for the Skills CLI, so two toolchains instead of one.
- **A shell script with `yq`.** Rejected: harder to test thoroughly and to type-check, and adds a downloaded binary to pin.
- **TypeScript sources with a build step.** Rejected for now: the code is small; JSDoc with `checkJs` gives type checking without a build.
