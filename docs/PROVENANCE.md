# Provenance

Where each module in this repository came from. Add a row in the same pull request that brings a module in, so every moved file can be traced to an exact source commit.

**Nothing has been moved yet.** The table is empty until R05. Skills are mostly new content written against MCP capabilities; a skill adapted from an existing file still gets a row, with "adapted" in the notes.

## Moved modules

| Destination path | Source repository | Source path | Source branch | Source SHA | Moved in (PR) | Contract differences | Tests migrated | Consumers affected | Compatibility strategy | Cutover prerequisites |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## How to fill in a row

- **Destination path:** the path in this repository, for example `skills/supplier-invoice/`.
- **Source repository, path and branch:** as they were at the source SHA, for example `tag-backoffice`, `agents/supplier-invoice/agent.md`, `develop`.
- **Source SHA:** the full 40-character commit the content was taken from. Record the commit you read, not the branch head at the time of the pull request.
- **Moved in (PR):** the full URL of the pull request in this repository.
- **Contract differences:** what changed on the way in, for example "placeholder MCP URL removed; credential note removed; now names the tag-backoffice MCP tools".
- **Tests migrated:** the tests that came with it, or "none" and why.
- **Consumers affected:** who loaded the old file, and how they change.
- **Compatibility strategy:** for example "the old file stays in the source repository until consumers switch".
- **Cutover prerequisites:** what must be true before consumers switch, for example "the MCP capability exists and is authorized for the agent".

## Planned sources (R05, from the R00 inventory)

These are recorded so the R05 author starts from the inventoried commit. They are not moves yet.

| Planned destination | Source repository | Source path | Branch | SHA (R00, 2026-11-17) |
| --- | --- | --- | --- | --- |
| `skills/supplier-invoice/` | tag-backoffice | `agents/supplier-invoice/agent.md` | develop | `5997a22978f83480741e3360b88833ecc29587e3` |
| `skills/frontend-design/` (optional) | tag-website | `.claude/skills/frontend-design/SKILL.md` | develop | `fec083e9e3df851a57117eb7acf239dba06e90ff` |
