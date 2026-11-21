# Installing TAG skills

How to install skills from this repository, which agent clients are tested, and what installation does not do.

## Commands

Skills install with the [Vercel Skills CLI](https://github.com/vercel-labs/skills). This repository tests version `1.9.0` (published on npm on 2026-11-16, engine `node >=22.20.0`), pinned in [`package.json`](../package.json). Use it for reproducible installs; `@latest` is fine for a quick look.

```bash
# List the skills in the repository
npx skills@1.9.0 add theapotheosisgroup/tag-skills --list

# Install the initial finance workflow into the current project for Codex and Claude Code
npx skills@1.9.0 add theapotheosisgroup/tag-skills --skill tag-financial-statements tag-reconciliation tag-journal-entry-prep tag-close-management tag-variance-analysis -a codex -a claude-code

# Install one skill, pinned to a release, as copies, into an isolated TAG runtime bundle
npx skills@1.9.0 add theapotheosisgroup/tag-skills@v0.1.0 --skill tag-financial-statements -a universal --copy -y
```

- Run installs from the consumer project's root. `--global` installs for your user instead.
- **Pinning.** With 1.9.0, `owner/repo@<semver tag>` and `owner/repo@<full 40-character SHA>` pin the checkout. Anything else after `@` (for example `@main`) is read as a skill name. Use `owner/repo#<ref>` for a branch or a short SHA. No release tag exists yet (`v0.1.0` above is the proposed first one).
- **Private repository.** The CLI clones with your existing Git credentials (HTTPS credential helper, SSH key or GitHub CLI login). You need read access to `theapotheosisgroup/tag-skills`. Never put a token in a command, a script or a configuration file.
- **Copy or symlink.** By default the CLI keeps one copy in `.agents/skills/` and symlinks other clients' directories to it; `--copy` writes independent copies. Both are tested.
- **Consumer lockfile.** The CLI writes `skills-lock.json` in the consumer project. Keep it: `npx skills@1.9.0 experimental_install --frozen-lockfile -a <agent>` restores the recorded skills (tested for local sources). It is unrelated to this repository's `upstreams.lock.json`. The npm dependency-sync feature (`experimental_sync`) is not used.
- **Telemetry.** The CLI sends anonymous telemetry unless `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` is set. CI and the profile installer set both.
- Review a skill before you install it: skills run with the agent's permissions in your client.

## Profiles and dependencies

The CLI installs exactly the skills you name. It does not read `tag-skill.json`, so it does not add a skill's TAG dependencies. Either name them yourself (each SKILL.md lists its prerequisites) or use the profile installer from a checkout of this repository:

```bash
npm ci
npm run install:profile -- --profile legal --dir /path/to/project --agent claude-code
npm run install:profile -- --skill tag-close-management --dry-run   # shows the expanded list, the pinned source and the CLI command
```

The installer reads dependencies from your checkout, so it pins the remote install to the revision they came from. By default that is the checkout's HEAD commit (`theapotheosisgroup/tag-skills#<40-character sha>`), and it refuses if the commit is not on the remote yet: push it, pass `--ref <tag | commit | branch>` from a checkout at that revision, or install from the checkout with `--source <path>`. The check tries HTTPS, then SSH, with your existing credentials and never prompts; if neither reaches the repository, the installer says why. `--dry-run` works offline and reports the pin as not verified.

Profiles: `finance-core`, `controller`, `backoffice`, `legal`, `authoring` ([README](../README.md#profiles)).

## Tested clients

| Client | `--agent` | Project directory | Status |
| --- | --- | --- | --- |
| Codex | `codex` | `.agents/skills/<name>/` | Tested in CI on every pull request |
| Claude Code | `claude-code` | `.claude/skills/<name>/` | Tested in CI on every pull request |
| Universal (any client that reads `.agents/skills/`, and TAG runtime bundles) | `universal` | `.agents/skills/<name>/` | Tested in CI on every pull request |
| Other clients the Skills CLI supports | see `npx skills add --help` | per client | Not tested by TAG |

Directories differ between clients and CLI versions; `npm run test:install` checks the paths for the pinned version. Skills with scripts need the interpreter in their `compatibility` field and `tag-skill.json` (currently `python3 >= 3.10` for the two finance scripts, `bash` and `git` for two authoring skills).

## What installation does not do

- **It does not make a skill available in hosted ChatGPT or Claude.** The CLI writes files into a local project or home directory, which only locally running clients read. Hosted interfaces need their own upload or administration mechanism; TAG has not adopted one (**Proposed but not implemented**).
- **It does not make a skill available in the TAG harness.** TrueForge loads skills from a public repository inside its sandbox; this repository is private, so the harness needs a runtime bundle ([harness consumption](integration/harness-consumption.md)).
- **It grants no access.** A skill contains no credentials. The agent still needs its own authorized connection to each capability the skill names, and the capability's owner authorizes every call.
- **It does not update itself.** Run `npx skills update`, or reinstall at a newer tag.
