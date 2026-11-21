---
name: governance-task-management
description: Track and follow up the organization's work as TAG expectations and work items, not a local file - list what is open, what is waiting on whom and what is overdue, check the state of a TAG run, and, with the person's confirmation, ask TAG to take on a new task. Use when asked what is on the plate, what TAG is working on, what we are waiting on, the status of a month-end or document run, to add or follow up a task or request, or to turn meeting action items into requests.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: Uses the TAG Back Office MCP tools tag_overview, work_status and ask_tag (mapped) and expectation reads (proposed). The Matter mapping is proposed; no Matter model exists yet.
---

# Task management (TAG)

The organization's tasks live in TAG as **expectations** (obligations and requests in the nexus, recorded on the TRUSS ledger in aletia) and **work** (runs TAG performs, such as month-end or document processing). This skill reads them, summarizes them, and files new requests through `ask_tag` when the person confirms. It does not keep its own system of record.

A local `TASKS.md` may be used as a personal scratch list if the person wants one; say plainly that it is not shared, not authoritative and not seen by TAG.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| Organization, acting principal, nexus, correlation id | The TAG harness run context; `tag.context.overview` for the nexuses, the caller's role and how expectations stand |
| Open and closed expectations, obligor, due dates | `tag.expectations.read` (proposed); until bound, the summary in `tag.context.overview` |
| State and outcome of TAG work | `tag.work.status` by work id, or listed by pillar |
| What the person wants done, for whom and by when | The person's request, confirmed before anything is filed |

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.context.overview` | mapped (Back Office MCP `tag_overview`) | Nexuses, role, TAG invited, expectation summary |
| `tag.work.status` | mapped (Back Office MCP `work_status`) | State and outcome of one work id, or a paged list by pillar |
| `tag.expectations.read` | proposed | Full expectation list with states and obligors |
| `tag.request.ask` | mapped (Back Office MCP `ask_tag`) | File a request: TAG records an expectation for its own side naming the requester. A write: only after the person confirms the exact text |

The runtime decides who may read and file; the client side never sees work the owning side keeps internal. Report outcomes in the tools' own words: an obligation is `met`, `waived`, `refused` or `open`; a document is `matched`, `needs_review`, `unmatched`, `quarantined`, `duplicate` or `failed`. Never call something done that a tool reports otherwise.

## Procedure

1. **Resolve the nexus** with `tag.context.overview`. If the person stands in several, ask which. Completion: one nexus, the caller's role, and whether TAG is invited.
2. **Read the state:** expectations (`tag.expectations.read`, or the overview summary) and TAG work (`tag.work.status`). Completion: a list with state, obligor, due date and source identifier for each item.
3. **Summarize** in the views of [references/state-mapping.md](references/state-mapping.md): on us, waiting on others, TAG working, closed recently, overdue first. Completion: every item appears once, with its identifier.
4. **To add a task:** draft the request (what, for whom, by when, supporting documents by identifier), show it, and file it with `tag.request.ask` only after the person confirms. Pass an idempotency key so a retry does not file twice. Completion: the returned expectation or work identifier.
5. **To follow up:** check `tag.work.status` for the work id; report the state and outcome exactly. Deciding an obligation (met, waived, disputed) is a separate, authorized operation for the owning side and is not done by this skill.
6. **From meetings or messages:** extract candidate action items and ask which to file; never file automatically.

## Output

- A status summary grouped as above, each item with identifier, state as the tool reports it, obligor, due date and age.
- For a filed request: the confirmed text and the returned identifier.
- What could not be read (unbound or refused capabilities).

## When something is missing or wrong

- **TAG not invited or no seat:** report the refusal and its "next" hint (for example, invite TAG to the nexus in Aletia); do not work around it.
- **`tag.expectations.read` unbound:** use the overview summary and say the list may be incomplete.
- **A Matter is requested:** explain that Matters are not yet a TAG model; offer the proposed grouping in [references/state-mapping.md](references/state-mapping.md) and label it proposed.
- **Refused or failed write:** report it with the error code; retry only with the same idempotency key, never under another identity.
- **Review:** the person confirms every request before it is filed; requests that commit the organization to a third party, or that name another party as obligor, go to someone with authority to make that commitment.

## References

- [references/state-mapping.md](references/state-mapping.md): task views, expectation and work states, and the proposed Matter mapping.
- [references/upstream-guide.md](references/upstream-guide.md): the upstream TASKS.md conventions (adapted; reference only).
