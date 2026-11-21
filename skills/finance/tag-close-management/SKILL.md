---
name: tag-close-management
description: Plan and track a period-end close for one entity - build the close plan from the organization's checklist, sequence tasks by dependency, record owners, deadlines and status, track reconciliations, adjusting entries, statement preparation and unresolved items, and report what blocks sign-off and the period lock. Use when asked to plan a month-end or year-end close, report close status or blockers, start TAG's month-end run, or check whether a period is ready to lock. Locking or reopening a period is a separately authorized operation the skill only requests.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: No scripts. Starting TAG's month-end run uses the Back Office MCP tool finance_run_month_end; other capability bindings marked proposed are not live yet.
---

# Close management (TAG)

Coordinates a period-end close. It owns the **plan and the status**, not the accounting: reconciliations run through tag-reconciliation, adjusting entries through tag-journal-entry-prep, statements through tag-financial-statements. The period lock is the organization's decision, executed through an authorized operation; this skill reports readiness and requests it.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| Organization, entity, period | The TAG harness run context; `tag.context.overview` for the nexus, the caller's role and whether TAG is invited |
| The organization's close checklist, owners, deadlines, materiality | `tag.policy.reporting.read` (proposed); otherwise agree it with the user and record it as a proposal. The upstream 5-day calendar is a template, not policy |
| State of TAG's recurring work for the month (expectations raised, books checks, receipt requests) | `tag.work.status` and `tag.expectations.read` (proposed) |
| Period status (open, closed, locked) | Ledger period metadata via `tag.ledger.trial_balance.read` (proposed) |
| Reconciliation, entry and statement results | Outputs of tag-reconciliation, tag-journal-entry-prep and tag-financial-statements for the period |

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.context.overview` | mapped (Back Office MCP `tag_overview`) | Nexus, role, TAG invited, expectations summary |
| `tag.finance.run_month_end` | mapped (Back Office MCP `finance_run_month_end`) | Start TAG's month-end for a finished month: raise its recurring expectations and check the books. Owning side only. Not a review report |
| `tag.work.status` | mapped (Back Office MCP `work_status`) | State and outcome of the month-end run and other TAG work |
| `tag.expectations.read` | proposed | Open obligations and requests for the period |
| `tag.policy.reporting.read` | proposed | Close checklist, owners, deadlines, thresholds |
| `tag.ledger.trial_balance.read` | proposed | Period status and balances to check readiness |
| `tag.ledger.period_lock.set` | proposed | Lock or reopen a period. **Only** requested after sign-off, and authorized by the runtime; never assumed |
| `tag.review.request` | proposed | Route the sign-off package to the close owner |

`tag.finance.run_month_end` and `tag.ledger.period_lock.set` are writes. Call them only when the user asks, with an idempotency key the harness supplies, and report the runtime's answer as it is, including a refusal.

## Procedure

1. **Confirm the period and the plan.** Load the organization's checklist; map each task to an owner, a deadline and its dependencies ([references/upstream-guide.md](references/upstream-guide.md#task-sequencing-and-dependencies)). Completion: every task has an owner, deadline and predecessors.
2. **Start TAG's month-end** when requested and the month is finished: call `tag.finance.run_month_end`; record the work id it returns. Completion: the run is accepted, or the refusal is recorded.
3. **Track status** with `tag.work.status`, the outputs of the dependent skills and the owners' updates. Use the status definitions Not started, In progress, Complete (reviewed), Blocked, At risk. A task is complete only when its output and review exist.
4. **Keep unresolved items visible**: unreconciled differences, invalid or unapproved entries, statement exceptions, open expectations, missing documents. Each has an owner and the task it blocks.
5. **Assess readiness to lock.** The period is ready only when every required task is complete and reviewed and no blocking item remains. Completion: a readiness verdict with its evidence.
6. **Request the lock** through `tag.ledger.period_lock.set` only after the close owner signs off, or hand the request to the person who holds that authority. Never change period status any other way.
7. **Report** status, blockers and the critical path to the user, and route the sign-off package with `tag.review.request`.

## Output

- Close plan: tasks with owner, deadline, dependencies, status, blocker, evidence reference.
- Status report: tasks by status, critical path, items at risk, unresolved items with owners and amounts, TAG work ids and their state.
- Readiness verdict for the period lock with the evidence for each required task, and the lock request (or the reason it is not ready).

## When something is missing or wrong

- **No approved checklist:** propose one from the upstream template and mark it proposed until the organization approves it.
- **A dependent result is missing or failed:** the task stays Blocked; name the missing output. Do not mark a task complete because its deadline passed.
- **Unresolved difference:** it blocks readiness; do not carry it forward silently or close the period around it.
- **Unavailable tool:** track from owner updates and supplied reports, and say which statuses are unverified.
- **Refused operation:** if the runtime refuses `tag.finance.run_month_end` or the period lock, report the refusal and its stated next step; do not retry under another identity or through another route.
- **Review required:** the period lock, any reopening of a locked period, and sign-off with open exceptions always need the close owner's explicit decision.

## References

- [references/upstream-guide.md](references/upstream-guide.md): close checklist by day, dependency map, critical path, status tracking and improvement (adapted; calendar and timings are templates).
