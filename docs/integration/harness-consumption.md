# Harness consumption

How the TAG harness should consume this repository. The harness work itself belongs to tag-harness; this page is the contract it can build against.

## Releases

1. A skill change is released when its pull request merges into `main`. Versioned release tags (`vMAJOR.MINOR.PATCH`, immutable, per [RELEASES](https://github.com/theapotheosisgroup/.github/blob/main/standards/RELEASES.md)) are cut from `main`; the first is proposed as `v0.1.0` after this catalog merges.
2. A runtime bundle is built from an immutable tag or full commit SHA, never a branch:

   ```bash
   npx skills@1.9.0 add theapotheosisgroup/tag-skills@v0.1.0 \
     --skill finance-financial-statements finance-reconciliation finance-journal-entry-prep finance-close-management finance-variance-analysis \
     -a universal --copy -y
   ```

   With the pinned CLI, `@<semver tag>` and `@<full 40-character SHA>` pin the checkout. Any other ref (a branch, a short SHA) must use `#<ref>`: `@main` would be read as a skill name. `node scripts/install-profile.js --profile finance --ref v0.1.0 --mode copy --agent universal --dir <bundle>` builds the same bundle with dependencies expanded, from a checkout at that tag.
3. Keep the generated `skills-lock.json` with the bundle. `npx skills@1.9.0 experimental_install --frozen-lockfile -a universal` restores it (tested in CI for local sources).
4. The CLI uses the build machine's existing Git, SSH or GitHub credentials to clone the private repository. Do not embed a token in the command, the bundle or configuration.

## Loading skills

- Load `catalog.json` from the bundle's source revision. It lists every skill's name, description, audiences, invocation mode, side effects, capabilities and dependencies, plus each profile's expanded skill list and a content hash per skill.
- Offer the model only the names and descriptions of skills whose `audiences` match the assignment. Ordinary client bookkeeping uses `client-finance` (or `client-legal`); TAG's own operations use `tag-operations`.
- Load a skill's full `SKILL.md` and its references only when it is selected.
- Honour `invocation: user`: such a skill runs only on an explicit request.
- Before running a skill, make sure its `dependencies.skills` are in the bundle (profiles already include them).
- Verify a skill's content hash against `catalog.json` to detect a modified bundle.

## Running skills

- Provide the run context ([context-model.md](context-model.md)) and the capability bindings the skill declares; refuse calls the grant does not cover, with the shapes in [capability-contract.md](capability-contract.md).
- Scripts need the interpreters in `dependencies.runtime` (for example `python3 >= 3.10`), and nothing else from this repository.
- Capture outputs and evidence against the correlation id; route review when `review.required` applies.

## Package updates

Skills are also released as versioned Agent Plugins 1.0.0 packages (`tag-finance`, `tag-governance`, `tag-knowledge`), each published as a GitHub release `<package>@<version>` ([ADR 0005](../adr/0005-agent-plugins-packages-and-releases.md), [packages](../../packages/README.md)). This is the contract a harness updater can build against; the updater is tag-harness work.

1. **Poll** <https://github.com/theapotheosisgroup/tag-skills/releases/download/skills-index/index.json> ([schema](../../schemas/release-index.schema.json)). Release assets are as visible as the repository; if it is private, download with a read-only credential held by the deployment, never by a skill.
2. **Resolve** each organization's package to its pinned version or to `channels.stable`. Install every package in the version's `requires` at a version that satisfies its range (`tag-governance` requires `tag-knowledge`).
3. **Review before rollout.** `breaking`, `changes` and `changelog` say what an update does. Treat a breaking update, an escalated `sideEffects` or a newly required capability as needing approval, and roll out to TAG's own organization first.
4. **Install** by downloading `archive.url`, checking `archive.sha256` and `size`, and extracting it: the result is a plugin directory `<package>/` with `plugin.json` and `skills/<skill>/`. Load only the skills in `tiers[<organization's tier>]`, and verify each skill's `contentHash` with the same algorithm as `catalog.json` ([scripts/lib/hash.js](../../scripts/lib/hash.js)).
5. **Show** the installed version, whether a newer version exists on the organization's channel, and the changelog sections in between.
6. **Roll back** by installing the previous version from the index; published versions never change.
