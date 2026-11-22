# 0006. MCP servers in every package, and TAG agents as Agent Plugins packages

- **Status:** Accepted
- **Date:** 2026-11-22
- **Deciders:** the mission lead (direction, 2026-11-22), the tag-skills maintainers (CODEOWNERS)
- **Supersedes:** the "No `mcp.json`" decision and the "every published skill is in exactly one package" rule of [ADR 0005](0005-agent-plugins-packages-and-releases.md); the rest of ADR 0005 stands.

## Context

The mission lead wants TAG's agents to load wherever a person works: "Agents can be loaded in ChatGPT or harness via the agent plugin 1.0 … Harness is just a more flexible, nicer and comfortable place to work back office tasks, not the way the system interacts; if I use ChatGPT I am not using the harness." Once a person has signed in with their TAG login (Ory Hydra) and allowed it from Claude or ChatGPT, they should be able to do most of what the harness does, for example collaborate on a data room: send documents from ChatGPT or a connected drive, and have an agent find and add the ones that answer the list of requests driven by the organization doing the due diligence. And: "keep everything always solid and consistent and simple."

Two people-facing MCP servers exist, both behind the TAG login's OAuth: the **TAG MCP** at `https://mcp.<env>tag.company/tag` (back-office tools) and the **Aletia MCP** at `https://mcp.<env>tag.company/aletia` (nexuses, people, requests, documents, sends, asks). Production is `mcp.tag.company`, develop `mcp.develop.tag.company` (tag-platform `docs/host-map.md`; aletia `docs/aletia-mcp.md`). Both are implemented but not deployed yet.

What [Agent Plugins 1.0.0](https://agent-plugins.org/specification) allows:

- Exactly two portable component types: skills (`skills/<name>/SKILL.md`) and MCP servers (`mcp.json` at the plugin root, schema `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json`). Commands, hooks and **agents** are outside v1, so an agent cannot be declared portably.
- A remote server is `{ "type": "streamable-http" | "sse", "url", "headers"? }`. The spec defines no OAuth or credential fields: authorization is the client's. `headers` are fixed, visible package data and must not hold secrets.
- Only `${PLUGIN_ROOT}` and `${PLUGIN_DATA}` expand, and only in stdio `args`, `env` and `cwd`. **Nothing expands in a `url`**, and clients must not expand environment variables. A URL cannot be parameterised at load time.

ADR 0005 left `mcp.json` out because skills name logical capabilities and the harness binds them. That still holds inside the harness, but ChatGPT and Claude have no harness: without `mcp.json` a loaded package gives the model instructions and no tools.

## Decision

- **One `mcp.json`, in every package.** `packages/mcp.json` is the single source. It declares `tag` and `aletia` as `streamable-http` servers on the production origin, with no headers. The package check validates it against the vendored, hash-pinned 1.0.0 MCP schema and refuses any server that is not Streamable HTTP, sets headers, or is not a plain HTTPS path on the production MCP origin. No credential, token or client secret is ever in a package; each client runs the OAuth flow with the TAG login itself.
- **One archive per environment.** Because a URL cannot carry a variable, the release build renders `mcp.json` per environment from a fixed table (`MCP_ENVIRONMENTS` in `scripts/lib/packages.js`: production `https://mcp.tag.company`, develop `https://mcp.develop.tag.company`). A version's main archive `<package>-<version>.tar.gz` targets production; `<package>-<version>.develop.tar.gz` is the same package except for its `mcp.json`. The release index records each archive under `archive` and `environments`, and the servers under `mcpServers` (production URLs). Adding an environment is one line in the table.
- **MCP servers are versioned like skills.** Adding a server is a feature, removing one or changing its URL is breaking. A version published before this decision declared no servers.
- **A TAG agent is a package built from skills.** An agent package holds an agent-instructions skill (its system prompt as an Agent Skill, TAG-original, in `skills/governance/`), every skill it uses, and the same `mcp.json`. `plugin.json` names the instructions skill in TAG's extension (`"agent"`). Each skill still has exactly one **home** package; an agent package may also **bundle** a skill from its home (`"from": "<home package>"`), never below the home tier, and must ship every skill its skills depend on, so it requires no other package and loads on its own. A change to a bundled skill is pending in every package that ships it.
- **The first agents:** `tag-concierge` (the organization's back-office assistant, `governance-concierge`) and `tag-due-diligence` (raises and drives a data room's request list in a nexus, and helps the other side find and file documents, `governance-due-diligence`). Both bundle governance-task-management and the three knowledge skills, all Foundation.
- **Enforcement is via aletia.** Tiers stay plan metadata; a package grants and checks nothing. Who may see, raise, file, send or close is aletia's decision on every tool call, from the signed-in person's seat and role, and the agent instructions say so.
- **The Harness is one client among others.** It loads the same packages; it may attach the person's own signed tool rows for the two servers instead of the package's `mcp.json`, as it does today.

## Consequences

- Loading a TAG package in a client that reads Agent Plugins `mcp.json` wires up both servers; the client asks the person to sign in. ChatGPT and Claude can also take the two URLs as connectors and the skills as uploads ([loading a TAG agent](../INSTALLING.md#loading-a-tag-agent-chatgpt-claude-or-the-harness)).
- The three pillar packages move to `0.1.1` to ship `mcp.json` (a feature). Each release publishes two archives.
- Seven Aletia capabilities (`aletia.lens.read`, `aletia.arc.read`, `aletia.people.read`, `aletia.sends.read`, `aletia.expect.write`, `aletia.supply.write`, `aletia.mark.write`) join the registry, mapped to the Aletia MCP tools of the same name.
- The URLs connect only once tag-platform deploys the MCP host; until then the package declares them and the client reports a connection failure.

## Alternatives considered

- **A placeholder in the URL** (`https://mcp.${TAG_ENV}tag.company/tag`). Rejected: Agent Plugins 1.0 forbids expansion in `url`; clients would try to connect to the literal string.
- **Production only, other environments built locally.** Rejected: develop is where the servers will first answer, and testers in ChatGPT or Claude cannot run the build.
- **Agent packages that require the pillar packages instead of bundling.** Rejected: in ChatGPT or Claude a person would have to find and load several packages; "an agent is a package" is simpler, and the release index still records each bundled skill's version and hash.
- **A separate `agents/` directory or an agent manifest.** Rejected: agents are not a portable Agent Plugins component; a client-specific format would only work in one client. The instructions travel as a skill, which every client loads.
- **A new `agents` pillar for the instructions skills.** Rejected: ADR 0004 fixes the pillars, and the two agents do governance work (requests, documents, nexuses).
