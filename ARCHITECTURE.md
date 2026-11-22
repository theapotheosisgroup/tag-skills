# Architecture

`tag-skills` is a library of documents and small scripts, not a service. It runs nowhere: agent clients copy skills from it and load them locally. Organization-wide architecture is in [.github standards/ARCHITECTURE.md](https://github.com/theapotheosisgroup/.github/blob/main/standards/ARCHITECTURE.md); this file covers only this repository.

```mermaid
flowchart LR
  repo["tag-skills<br/>skills/&lt;pillar&gt;/&lt;pillar&gt;-&lt;name&gt;/"] -- "npx skills add<br/>(or a runtime bundle)" --> client["Agent client or TAG harness<br/>(ChatGPT, Claude, Codex, TrueForge)"]
  repo -- "release workflow:<br/>package@version archives + index.json" --> releases["GitHub releases<br/>(Agent Plugins 1.0.0 packages)"]
  releases -- "load a package (skills + mcp.json);<br/>harness updater polls the index" --> client
  client -- "capability call with the run's own<br/>authorized connection and context" --> mcp["TAG MCP surface (tag-mcp),<br/>Aletia MCP"]
  mcp -- "authority decided by aletia;<br/>data via tag-connectors" --> domain["Owning domain<br/>(tag-backoffice, aletia)"]
```

The skill only tells the client which logical capability to call and how ([capability contract](docs/integration/capability-contract.md)). Authority comes from the runtime and the owning domain, never from the skill. Integration boundaries and the work pending in other repositories are in [docs/integration/README.md](docs/integration/README.md).

## Owns

- Published back-office G&A skills under `skills/<pillar>/<pillar>-<name>/` (pillars: finance, people, governance), in the Agent Skills format, with TAG metadata (`tag-skill.json`) and upstream licence and notice files.
- Reporting templates and portable helper scripts inside skills (for example the statement builder in finance-financial-statements), with their evaluations.
- Skill packages (`packages/<name>/plugin.json` in the Agent Plugins 1.0.0 format, with tiers and a changelog), the package versioning rules, the release workflow and the release index format ([ADR 0005](docs/adr/0005-agent-plugins-packages-and-releases.md)).
- The packages' `mcp.json` (where the TAG MCP and Aletia MCP answer in each environment, never how to authorize) and the agent packages: a TAG agent as its instructions skill plus the skills it uses, loadable in ChatGPT, Claude or the harness ([ADR 0006](docs/adr/0006-mcp-servers-and-agent-packages.md)).
- Profiles, the generated catalog, the upstream import record (`upstreams.lock.json`) and the logical capability registry (`docs/integration/capabilities.json`), as contracts.
- The validator, the Skills CLI discovery and installation tests, the profile installer and the upstream comparison tool.
- The list of supported agent clients and the installation instructions ([docs/INSTALLING.md](docs/INSTALLING.md)).

## Does not own

| Not here | Owner |
| --- | --- |
| The agent fleet's definitions (identity, DIDs, runtime policy), the agent registry and their execution | `tag-agents` (definitions), `tag-platform` (registry deployment) |
| MCP servers, tools and their authorization | `tag-mcp` (the MCP surface for TAG's back office: facade, Back Office MCP, A2A, APIs), the owning domain (`tag-backoffice`) |
| Organizations, persons, roles, nexuses, delegated authority, audit records, expectations | `aletia` |
| Runtime skill discovery, selection, execution state, retries, evidence capture, review routing | `tag-harness` (agents run through TrueForge) |
| Checking for and installing package updates per organization (pins, channels, rollout, update display) | `tag-harness` |
| Deployment, edge, the Hydra authorization server | `tag-platform` |
| Domain logic, including the back-office handlers in `agents/pillars/skills.py` | `tag-backoffice` (the name collision with "skills" is only a name) |
| Prompts hashed by attestation digests (`prompts/*.md`) | `tag-backoffice` |
| Credentials, tokens, provider connections and adapters (ledgers, documents, storage including OpenDAL) | `tag-connectors`; identity in `aletia` |
| Organization standards and shared CI | `.github` |

## Forbidden dependencies

From the foundation prompt, section 5. The rules that apply to this repository:

- **A skill directly modifying an organization's ledger.** A skill never writes a ledger or business record itself, and ships no script that does. It asks the owning domain through its MCP tools.
- **A frontend bypassing authoritative authorization**, and its equivalent here: a skill never works around an MCP capability's authorization, for example by calling a private endpoint, embedding a token or reusing another identity.
- **An agent using a global administrator identity for customer reads.** A skill never tells an agent to use a shared or administrator identity.
- **Multiple services independently implementing ledger-write semantics.** A skill describes how to use a capability; it never re-implements domain rules such as accounting logic.

And, specific to this repository:

- A skill depends on nothing outside its own directory except pinned, reviewed dependencies it declares (interpreters, other TAG skills in `tag-skill.json`, logical capabilities).
- The repository's tooling depends only on the packages in `package-lock.json`. Skills never import the tooling.
- No other TAG repository depends on this repository's code. Clients consume skills as files.
