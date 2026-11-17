# 0001. Keep installable skills in their own repository, separate from agents and MCP servers

- **Status:** Accepted
- **Date:** 2026-11-17
- **Deciders:** the mission lead (TAG foundation reorganization, phases R00 and R01)

## Context

Before the reorganization, nothing in TAG was an Agent Skill in the open format: the R00 inventory found no `SKILL.md` on any default branch except one coding-agent skill in tag-website. What was called a "skill" was something else:

- `agents/pillars/skills.py` in tag-backoffice is a set of Python domain handlers;
- tag-backoffice's `agents/supplier-invoice/agent.md` is a Claude plugin file that mixes instructions with a placeholder MCP URL and a note about the person's sign-in.

Instructions, domain logic and credentials were therefore tangled. An instruction file that knows about a sign-in or a URL is easy to turn into a credential carrier, and a "skill" that is really a handler can write business records without passing through the owning domain's authorization.

The open Agent Skills format and the Vercel Skills CLI give a portable unit that many agent clients can install. The foundation prompt (section 3.4) assigns that unit to `tag-skills`.

## Decision

`tag-skills` holds only installable skills and the tooling that validates and installs them.

- A skill is instructions plus optional references, scripts and assets, in `skills/<name>/`.
- A skill holds no credentials and confers no permissions. It names the authoritative MCP capability to call; that capability's owner authorizes every call.
- Domain handlers, MCP servers, agent definitions and prompts hashed by attestation stay with their owners (see [ARCHITECTURE.md](../../ARCHITECTURE.md#does-not-own)).
- In R01 the repository ships only the contract, the validator and the smoke tests, exercised against a test fixture. No skill is invented to make CI pass; the first skills are written in R05.

## Consequences

- Skills can be reviewed as text: a reviewer checks that a skill calls only authoritative capabilities and carries nothing secret. CI enforces the format, self-containment and secret scanning.
- Installing a skill gives an agent knowledge, not access. Revoking access stays a matter of revoking the MCP connection.
- Each skill moved in R05 needs its authoritative MCP capability to exist first; a skill that would need a capability nobody owns is blocked rather than shipped with a workaround.
- Two names now mean different things: tag-backoffice's Python "skills" handlers and Agent Skills. Documentation in both repositories says so.

## Alternatives considered

- **Keep skills next to the MCP server that serves them (for example in tag-backoffice).** Rejected: skills are installed by clients from a repository, and a domain repository would expose its code to every consumer and tie skill releases to service releases.
- **Put skills in tag-agents.** Rejected: agent definitions describe an agent's identity and permissions, and an agent plugin format is still to be defined there. Skills are deliberately permission-free and client-portable; mixing them would blur that line.
- **One repository for skills and the MCP facade (tag-mcp).** Rejected: the facade is a running service with authorization duties; skills are static content.
