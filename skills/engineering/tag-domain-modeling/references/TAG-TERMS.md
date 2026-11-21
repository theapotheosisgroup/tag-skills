# TAG terms (working definitions)

Starting definitions for TAG's shared vocabulary, recorded on 2026-11-20. Each names the repository that owns the concept; the owner's documentation is authoritative, and a disagreement between it and this file is a finding to raise, not to resolve here. Use the glossary format in [GLOSSARY-FORMAT.md](GLOSSARY-FORMAT.md) when copying a term into a repository's glossary.

**Organization**:
A company or other body TAG serves, or that owns agents and data; it acts through people and agents holding roles. Owned by aletia.
_Avoid_: practice, firm, workspace, tenant (in user-facing text)

**Entity**:
A reporting unit whose books are kept and whose statements are prepared, usually a legal entity. One organization may have several entities.
_Avoid_: company (when an organization is meant), client

**Person**:
A human with an identity who holds roles in organizations and nexuses. Owned by aletia.

**Agent**:
A software actor that acts under its own attributable identity (a DID), never a shared label or administrator identity. Definitions live in tag-agents; runtime execution in tag-harness.
_Avoid_: bot, assistant (when the identity matters)

**Nexus**:
A shared space in aletia where parties (for example an organization and TAG) meet, with membership, roles, documents and Expectations.
_Avoid_: workspace, channel, project

**Delegation**:
A grant of authority from one principal (a person or organization) to another (a person or agent), recorded in aletia and checked at the runtime or tool boundary on every call.
_Avoid_: permission, access (when a recorded grant is meant)

**Mandate**:
The specific delegation under which an agent or person acts for an organization in a given piece of work: whose authority, for what scope, until when.
_Avoid_: role, scope (when the grant itself is meant)

**Expectation**:
An obligation or request recorded on the TRUSS ledger in a nexus, with an obligor, and an outcome such as met, waived, refused (disputed) or open. Read and created through aletia and the TAG Back Office MCP.
_Avoid_: task, ticket, to-do

**Matter** (_proposed_):
A unit of client work that groups related Expectations, documents and decisions. Not implemented in any TAG repository as of 2026-11-20; do not describe it as existing behaviour.

**Acting principal**:
The person or agent on whose identity a call is made, together with the mandate it relies on.
