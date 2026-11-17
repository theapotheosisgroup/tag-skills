# Installing TAG skills

How to install a skill from this repository, which agent clients are supported, and what installation does not do.

**Status:** no skill is published yet (`skills/` is empty until R05), so the commands below currently report "No skills found". The installation path itself is tested in CI against the [test fixture](../tests/fixtures/README.md).

## Commands

Skills install with the [Vercel Skills CLI](https://github.com/vercel-labs/skills). Use the version this repository tests, from [`package.json`](../package.json) (currently `1.7.6`), so the result is reproducible:

```bash
# List the skills in the repository
npx skills@1.7.6 add theapotheosisgroup/tag-skills --list

# Install one skill into the current project for one client
npx skills@1.7.6 add theapotheosisgroup/tag-skills --skill <name> --agent claude-code
```

- Run the install from the consumer project's root. Add `--global` to install for your user instead of the project.
- The repository is **private**: the CLI clones it with your Git credentials, so you need read access to `theapotheosisgroup/tag-skills` and a working `git clone` over HTTPS or SSH.
- The CLI sends anonymous telemetry unless `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` is set. CI sets both.
- By default the CLI symlinks the skill from a shared copy; `--copy` copies the files instead.
- Review a skill before you install it: the CLI warns, correctly, that skills run with the agent's full permissions in your client.

## Supported clients

| Client | Project directory | Status |
| --- | --- | --- |
| Claude Code (`--agent claude-code`) | `.claude/skills/<name>/` | Tested in CI on every pull request (fixture) |
| Codex (`--agent codex`) | `.agents/skills/<name>/` | Tested in CI on every pull request (fixture) |
| Other clients the Skills CLI supports | per client, see `npx skills add --help` and the CLI's documentation | Not tested by TAG |

Each published skill also states in its own `SKILL.md` (the `compatibility` field or its instructions) if it needs a particular client, MCP server or tool. Directories differ between clients and between CLI versions; the smoke test checks the paths for the pinned version.

## What installation does not do

- **It does not make a skill available in hosted ChatGPT or Claude.** The Skills CLI writes files to a local project or home directory, which only locally running clients such as Claude Code and Codex read. Hosted interfaces, including claude.ai, the Claude desktop and mobile apps and ChatGPT, do not see those files. Making a TAG skill available there needs that product's own upload or administration mechanism; TAG has not adopted one (**Proposed but not implemented**).
- **It grants no access.** A skill contains no credentials. To do anything, the agent still needs its own authorized connection to the MCP capability the skill names, and that capability's owner authorizes every call.
- **It does not update itself.** Run `npx skills update` to pick up a newer version.
