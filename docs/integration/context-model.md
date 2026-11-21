# Run context

Every skill run happens in a context the TAG harness supplies. Skills read it; they never construct or widen it.

| Field | Meaning | Source of truth |
| --- | --- | --- |
| `organization` | The organization the work is for | aletia |
| `principal` | Who is acting: a person, a client-owned agent or a TAG-owned agent, each with its own attributable identity | aletia identity, tag-platform Hydra tokens |
| `mandate` | The delegation or mandate that grants the principal authority for this work | aletia delegated authority |
| `nexus` | The aletia nexus the work belongs to, when relevant | aletia |
| `matter` | **Proposed.** A grouping of related work; no Matter model exists yet | none yet |
| `operation` | The operation requested (for example "prepare FY2026 statements") | the request |
| `correlationId` | Links every call, output and evidence record of the run | tag-harness |

- A client-owned agent and a TAG-owned agent can run the same skill under different grants. The skill is the same; the grant differs, and the runtime checks it on every call.
- Access is validated at the runtime and tool boundary. A skill's description or metadata never establishes access.

The finance input format records the organization and entity explicitly ([finance-financial-statements input format](../../skills/finance/finance-financial-statements/references/input-format.md)), so every report identifies whose data it is.
