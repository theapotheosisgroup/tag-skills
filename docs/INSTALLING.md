# Installing TAG skills

How to install skills from this repository, which agent clients are tested, and what installation does not do.

## Commands

Skills install with the [Vercel Skills CLI](https://github.com/vercel-labs/skills). This repository tests version `1.9.0` (published on npm on 2026-11-16, engine `node >=22.20.0`), pinned in [`package.json`](../package.json). Use it for reproducible installs; `@latest` is fine for a quick look.

```bash
# List the skills in the repository
npx skills@1.9.0 add theapotheosisgroup/tag-skills --list

# Install the initial finance workflow into the current project for Codex and Claude Code
npx skills@1.9.0 add theapotheosisgroup/tag-skills --skill finance-financial-statements finance-reconciliation finance-journal-entry-prep finance-close-management finance-variance-analysis -a codex -a claude-code

# Install one skill, pinned to a release, as copies, into an isolated TAG runtime bundle
npx skills@1.9.0 add theapotheosisgroup/tag-skills@v0.1.0 --skill finance-financial-statements -a universal --copy -y
```

- Run installs from the consumer project's root. `--global` installs for your user instead.
- **Pinning.** With 1.9.0, `owner/repo@<semver tag>` and `owner/repo@<full 40-character SHA>` pin the checkout. Anything else after `@` (for example `@main`) is read as a skill name. Use `owner/repo#<ref>` for a branch or a short SHA. No release tag exists yet (`v0.1.0` above is the proposed first one).
- **Private repository.** The CLI clones with your existing Git credentials (HTTPS credential helper, SSH key or GitHub CLI login). You need read access to `theapotheosisgroup/tag-skills`. Never put a token in a command, a script or a configuration file.
- **Copy or symlink.** By default the CLI keeps one copy in `.agents/skills/` and symlinks other clients' directories to it; `--copy` writes independent copies. Both are tested.
- **Consumer lockfile.** The CLI writes `skills-lock.json` in the consumer project. Keep it: `npx skills@1.9.0 experimental_install --frozen-lockfile -a <agent>` restores the recorded skills (tested for local sources). It is unrelated to this repository's `upstreams.lock.json`. The npm dependency-sync feature (`experimental_sync`) is not used.
- **Telemetry.** The CLI sends anonymous telemetry unless `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` is set. CI and the profile installer set both.
- Review a skill before you install it: skills run with the agent's permissions in your client.

## Packages

Each GitHub release `<package>@<version>` carries `<package>-<version>.tar.gz` (production) and `<package>-<version>.develop.tar.gz` (develop), each an [Agent Plugins 1.0.0](https://agent-plugins.org/specification) plugin directory (`plugin.json`, `CHANGELOG.md`, `mcp.json`, `skills/<skill>/`) that differs only in the environment its `mcp.json` points at. Their SHA-256 is in the [release index](https://github.com/theapotheosisgroup/tag-skills/releases/download/skills-index/index.json). Clients that load Agent Plugins can use the extracted directory as is; the TAG harness installs and updates packages per organization ([package updates](integration/harness-consumption.md#package-updates)). Which skills each package and tier holds: [packages/README.md](../packages/README.md).

## Loading a TAG agent: ChatGPT, Claude or the harness

A TAG agent is a package: `tag-concierge` (the organization's back-office assistant) or `tag-due-diligence` (data rooms: raise and drive a request list, or find and file the documents that answer it). Each holds the agent's instructions skill, the skills it uses and `mcp.json` ([ADR 0006](adr/0006-mcp-servers-and-agent-packages.md)). The pillar packages load the same way. Wherever you load it, the agent has three parts, and the client you choose only changes how each is added:

| Part | What it is | Where it comes from |
| --- | --- | --- |
| Instructions and skills | `skills/governance-<agent>/SKILL.md` plus the skills it uses | the package's `skills/` |
| Tools | The TAG MCP (`tag`) and the Aletia MCP (`aletia`) | the package's `mcp.json`, or the two URLs below |
| Sign-in | OAuth with your TAG login; the client opens the TAG login page and you allow access | your client, never the package |

| Environment | TAG MCP | Aletia MCP | Archive |
| --- | --- | --- | --- |
| production | `https://mcp.tag.company/tag` | `https://mcp.tag.company/aletia` | `<package>-<version>.tar.gz` |
| develop | `https://mcp.develop.tag.company/tag` | `https://mcp.develop.tag.company/aletia` | `<package>-<version>.develop.tar.gz` |

The tag-platform host map lists both MCP hosts as **Implemented but not deployed**: until they are, a client loads the agent but reports that the servers do not connect.

First, fetch and check the archive (the repository is private, so use your own GitHub sign-in; never paste a token into a command):

```bash
gh release download tag-due-diligence@0.1.0 --repo theapotheosisgroup/tag-skills --pattern 'tag-due-diligence-0.1.0.develop.tar.gz'
sha256sum tag-due-diligence-0.1.0.develop.tar.gz   # compare with environments.develop.sha256 in the release index
tar -xzf tag-due-diligence-0.1.0.develop.tar.gz    # the plugin directory tag-due-diligence/
```

**A client that loads Agent Plugins 1.0 directly.** Point it at the extracted `tag-due-diligence/` directory (or install the archive, as the client documents). It reads `skills/` and `mcp.json` and asks you to sign in to each server. Which clients do this, and how, is the client's documentation; TAG has not verified any (**Not verified**).

**ChatGPT.** If your ChatGPT loads Agent Plugins, load the package as above. Otherwise add the two parts separately: add each MCP URL for your environment as a custom connector with OAuth authentication and sign in with your TAG login when ChatGPT redirects you; then give ChatGPT the instructions, either by uploading each folder under `skills/` where your plan accepts skills or by using `skills/governance-<agent>/SKILL.md` as the instructions of a project or custom GPT. Menu names change between ChatGPT versions; this flow is **Not verified** by TAG.

**Claude (claude.ai and Claude Desktop).** Add each MCP URL as a custom connector and sign in with your TAG login when asked. Upload each folder under `skills/` as a skill (zip the folder). **Not verified** by TAG.

**Claude Code.** Claude Code's own plugin layout (`.claude-plugin/plugin.json`, `.mcp.json`) is not the Agent Plugins layout, so add the parts directly: install the skills with the Skills CLI (`--agent claude-code`, below, or `npm run install:profile`), and add the servers with `claude mcp add --transport http tag <TAG MCP URL>` and `claude mcp add --transport http aletia <Aletia MCP URL>`; run `/mcp` in Claude Code to sign in.

**The TAG harness.** The harness is one more client, not a requirement: with ChatGPT or Claude it is not involved. It installs a package per organization from the release index ([package updates](integration/harness-consumption.md#package-updates)), loads the agent's instructions skill into the TrueForge agent, and attaches the signed-in person's own tool rows for the TAG MCP and Aletia MCP (or the package's `mcp.json`). The updater and the agent wiring are **Proposed but not implemented** in tag-harness.

Whatever the client, aletia decides on every call what the signed-in person may see or do; a package grants nothing, every skill in it is available, and its tier is descriptive plan metadata that gates nothing.

## Profiles and dependencies

The CLI installs exactly the skills you name. It does not read `tag-skill.json`, so it does not add a skill's TAG dependencies. Either name them yourself (each SKILL.md lists its prerequisites) or use the profile installer from a checkout of this repository:

```bash
npm ci
npm run install:profile -- --profile governance --dir /path/to/project --agent claude-code
npm run install:profile -- --skill finance-close-management --dry-run   # shows the expanded list, the pinned source and the CLI command
```

The installer reads dependencies from your checkout, so it pins the remote install to the revision they came from. By default that is the checkout's HEAD commit (`theapotheosisgroup/tag-skills#<40-character sha>`), and it refuses if the commit is not on the remote yet: push it, pass `--ref <tag | commit | branch>` from a checkout at that revision, or install from the checkout with `--source <path>`. The check tries HTTPS, then SSH, with your existing credentials and never prompts; if neither reaches the repository, the installer says why. Uncommitted changes under `skills/` or `profiles/` also block a remote install (with `--ref`, unless `--allow-ref-mismatch`): commit and push them, or use `--source <path>`. `--dry-run` works offline, reports the pin as not verified and lists any uncommitted metadata.

Profiles: `finance`, `governance`, `backoffice` ([README](../README.md#profiles)).

## Tested clients

| Client | `--agent` | Project directory | Status |
| --- | --- | --- | --- |
| Codex | `codex` | `.agents/skills/<name>/` | Tested in CI on every pull request |
| Claude Code | `claude-code` | `.claude/skills/<name>/` | Tested in CI on every pull request |
| Universal (any client that reads `.agents/skills/`, and TAG runtime bundles) | `universal` | `.agents/skills/<name>/` | Tested in CI on every pull request |
| Other clients the Skills CLI supports | see `npx skills add --help` | per client | Not tested by TAG |

Directories differ between clients and CLI versions; `npm run test:install` checks the paths for the pinned version. Skills with scripts need the interpreter in their `compatibility` field and `tag-skill.json` (currently `python3 >= 3.10` for the two finance scripts).

## What installation does not do

- **It does not make a skill available in hosted ChatGPT or Claude.** The CLI writes files into a local project or home directory, which only locally running clients read. Hosted interfaces take a package, or its skills and MCP URLs, through their own settings: see [loading a TAG agent](#loading-a-tag-agent-chatgpt-claude-or-the-harness).
- **It does not make a skill available in the TAG harness.** TrueForge loads skills from a public repository inside its sandbox; this repository is private, so the harness needs a runtime bundle ([harness consumption](integration/harness-consumption.md)).
- **It grants no access.** A skill contains no credentials. The agent still needs its own authorized connection to each capability the skill names, and the capability's owner authorizes every call.
- **It does not update itself.** Run `npx skills update`, or reinstall at a newer tag.
