# Task views and state mapping

## Views

The upstream skill sorted a `TASKS.md` file into Active, Waiting On, Someday and Done. In TAG the same views are derived from expectations and work. The mapping below is **proposed**: it uses states the Back Office MCP documents, and will be confirmed when `tag.expectations.read` is bound.

| View | Derived from | Status |
| --- | --- | --- |
| On us | Expectations that are `open` with this organization's side as obligor | proposed |
| Waiting on others | Expectations that are `open` with another party, or TAG, as obligor; `refused` items (what arrived was disputed; still open) | proposed |
| TAG working | Work items from `tag.work.status` that have not reached an outcome | mapped (states as `work_status` reports them) |
| Closed recently | Expectations `met` or `waived`; work with an outcome | proposed |
| Someday | No TAG equivalent. Personal scratch only (local `TASKS.md`, not authoritative) | not mapped |

Report each item's state in the tool's own words. `work_status` never says "satisfied", and neither should a summary.

## Matters (proposed)

"Matter" is not an implemented model in any TAG repository. Until one exists, if a person asks for a Matter view:

- **Proposed grouping:** a Matter is a named set of expectations and work items in one nexus that serve one engagement or piece of work (for example "FY2026 year-end").
- The grouping is presented as a label in the summary only. Nothing is written to record it, and it carries no permissions.
- When aletia or tag-backoffice defines Matters, this mapping is replaced by the real model and this file is updated.

## Filing a request

`tag.request.ask` (Back Office MCP `ask_tag`) files an expectation for TAG's side naming the requester. Every write takes an idempotency key: a retry with the same key returns the original result; the same key on a different request is refused (`IDEMPOTENCY_KEY_REUSED`).
