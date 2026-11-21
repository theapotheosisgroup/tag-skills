---
name: tag-source-management
description: Describe which organizational knowledge sources the caller can search in the active nexus (nexus documents, indexed email and chat, knowledge sources, TAG work and expectations), how fresh and authoritative each is, which integrations are missing or refused, and which source to query first for a type of question. Use when someone asks what TAG can search, why a search missed something, whether a source is connected or up to date, or which source is authoritative for a topic. It does not connect sources or handle credentials.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: No scripts. Capability bindings marked proposed are not live yet; without tag.sources.list the skill infers availability from the capabilities the runtime offers and says so.
---

# Source management (TAG)

Explains the search landscape for the caller in the **active nexus**: what is available, how current and authoritative it is, and what is missing. It never connects a source, edits client configuration or touches credentials. Provider connections and credentials belong to tag-connectors; what a nexus indexes belongs to aletia.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| Organization, acting principal, mandate, active nexus, correlation id | The TAG harness run context; `tag.context.overview` |
| Source inventory with freshness (last indexed) and authority | `tag.sources.list` (proposed) |
| The capabilities the runtime offers this session | The host's tool list, when `tag.sources.list` is not bound |
| The organization's source-of-truth designations (for example, which repository holds approved policies) | `tag.sources.list` metadata, or the user |

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.context.overview` | mapped (Back Office MCP `tag_overview`) | Confirm the nexus, the caller's role and the TAG tools available there |
| `tag.sources.list` | proposed | Sources available to the caller, with freshness and authority |
| `aletia.search` | mapped (Aletia MCP `search`) | Probe whether a source returns results for the caller (a read, as the caller) |

## Procedure

1. **Confirm the nexus** and the caller's role. Completion: nexus stated.
2. **List sources** from `tag.sources.list`, or infer them from the offered capabilities and label the list "inferred". Completion: each source marked available, unavailable, refused or rate-limited, with its last-indexed time where known.
3. **Describe authority**: which source the organization designates as authoritative for which topic; otherwise use the default ordering in [references/upstream-guide.md](references/upstream-guide.md#source-priority-ordering) and say it is a default.
4. **Explain gaps**: for each missing source, whether TAG has no capability for it, it is not indexed in this nexus, or access was refused. Completion: each gap has a reason.
5. **Advise next steps**: the organization's administrator connects or indexes sources through TAG; the agent does not.

## Output

A source table: source, status, last indexed or freshness, authority notes, how it is reached (capability name), plus a gaps list with reasons and the recommended query order for the user's question type. Mark inferred information as inferred.

## When something is missing or wrong

- **No inventory capability:** infer, label as inferred, and say freshness is unknown.
- **Refused source:** report it as refused; do not suggest another route to the same data.
- **Stale source:** report its last indexed time; answers drawn from it should say so.
- **Request to connect a source or share a credential:** decline and direct it to the organization's administrator; credentials never pass through a skill.
- **Review required:** none; this skill describes availability and changes nothing.

## References

- [references/upstream-guide.md](references/upstream-guide.md): upstream source priority by query type, rate-limit handling and source health reporting (adapted to TAG).
