# Provenance

Where each module in this repository came from.

## Forked skills

The 24 skills are forks of third-party skills. Their authoritative record is [upstreams.lock.json](../upstreams.lock.json): source URL, commit, path, licence, notices, original and TAG names, destination, import date, per-file SHA-256, folder hash, dependency paths (licence file, the upstream `CONNECTORS.md` that was replaced rather than copied) and the list of TAG adaptations. Each skill's `NOTICE.md` repeats this for a standalone install, and [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) summarizes the licences.

| Source | Commit | Licence | Skills |
| --- | --- | --- | --- |
| [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) | `0e0fcacddcc892eb92a1b7873ff9d68159c47571` | Apache-2.0 (domain-folder `LICENSE`) | 17: finance (6), data (4), legal (3), enterprise-search as knowledge (3), productivity task management as operations (1) |
| [mattpocock/skills](https://github.com/mattpocock/skills) | `abeeaf95660ba9e8b7c753eb38f441ca707a8823` | MIT | 7: engineering (5), productivity (2) |

Deliberate departures from the upstream baselines:

- Anthropic skills: the upstream `SKILL.md` body is kept as `references/upstream-guide.md` (modified); the TAG `SKILL.md` is new. `~~category` placeholders and `CONNECTORS.md` pointers are replaced with TAG capability names; upstream command names are replaced with TAG skill names.
- Matt Pocock's skills: `SKILL.md` is adapted in place; supporting files moved into `references/` (or `scripts/`); `agents/openai.yaml` is not copied and its invocation policy moved to `tag-skill.json`.
- Frontmatter fields outside the Agent Skills specification (`argument-hint`, `user-invocable`, `disable-model-invocation`) are dropped.
- `samuelclk/dinoclaw_guides` (`financial-statements`) is excluded: no licence at its repository root during review. It is recorded under `blocked` in the lock.

The installer reference, [vercel-labs/skills](https://github.com/vercel-labs/skills) at `57217cf86ba38148a57af9e90d14a4c049558330`, is used as a pinned npm dependency (`skills@1.9.0`), not copied. The npm tarball's `gitHead` is `50894c1d98bc45ca1ab127213e59d6525065b5e7`; the behaviours relied on (nested discovery, copy and symlink installs, `@<tag|sha>` pins, lockfile restore) were verified against the published package and are tested in CI.

## Moved modules

Nothing has been moved from another TAG repository yet. Add a row in the same pull request that brings a module in.

| Destination path | Source repository | Source path | Source branch | Source SHA | Moved in (PR) | Contract differences | Tests migrated | Consumers affected | Compatibility strategy | Cutover prerequisites |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

### How to fill in a row

- **Destination path:** the path in this repository, for example `skills/finance/tag-supplier-invoice/`.
- **Source repository, path and branch:** as they were at the source SHA.
- **Source SHA:** the full 40-character commit the content was taken from.
- **Moved in (PR):** the full URL of the pull request in this repository.
- **Contract differences:** what changed on the way in.
- **Tests migrated:** the tests that came with it, or "none" and why.
- **Consumers affected:** who loaded the old file, and how they change.
- **Compatibility strategy:** for example "the old file stays in the source repository until consumers switch".
- **Cutover prerequisites:** what must be true before consumers switch.

## Planned sources (R05, from the R00 inventory)

Recorded so the R05 author starts from the inventoried commit. They are not moves yet.

| Planned destination | Source repository | Source path | Branch | SHA (R00, 2026-11-17) |
| --- | --- | --- | --- | --- |
| `skills/<category>/tag-supplier-invoice/` | tag-backoffice | `agents/supplier-invoice/agent.md` | develop | `5997a22978f83480741e3360b88833ecc29587e3` |
| `skills/engineering/tag-frontend-design/` (optional) | tag-website | `.claude/skills/frontend-design/SKILL.md` | develop | `fec083e9e3df851a57117eb7acf239dba06e90ff` |
