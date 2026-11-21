---
name: finance-explore-data
description: Profile an accounting data set or export before it is used (trial balance, general-ledger detail, subledger, bank or invoice extract) to find missing fields, duplicates, debit/credit sign issues, out-of-period or unposted rows, unmapped accounts and coverage gaps by period, entity and account. Use when receiving a new ledger extract or table, before building statements or reconciliations from it, when totals look wrong, or when asked what is in a data set and whether it is complete enough to use.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: Runs read-only aggregate queries through tag.data.query (proposed). Works on user-supplied exports when no binding exists.
---

# Explore accounting data (TAG)

Produces a **data profile**: what a data set contains, how complete and consistent it is, and what must be fixed or confirmed before it feeds reporting. It reads; it never corrects source data.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| Organization, entity, nexus, correlation id | The TAG harness run context; `tag.context.overview` |
| The data set or export, its source and extraction time | An approved data set via `tag.data.schema.read` and `tag.data.query`, or a file the user supplies (record its name and who supplied it) |
| Expected scope: entities, periods, accounts, currency | The user's request, or the reporting policy (`tag.policy.reporting.read`, proposed) |
| Sign convention and chart of accounts | The approved schema definitions, or `tag.ledger.chart_of_accounts.read` (proposed) |
| Control totals (trial balance, bank closing balance) | `tag.ledger.trial_balance.read` (proposed) or the user |

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.context.overview` | mapped (Back Office MCP `tag_overview`) | Confirm the nexus and the caller's role |
| `tag.data.schema.read` | proposed | Approved columns, types and definitions |
| `tag.data.query` | proposed | Read-only aggregate profiling queries (`SELECT` only) against approved data sets |
| `tag.ledger.chart_of_accounts.read` | proposed | Valid accounts and types, to find unmapped or inactive accounts |
| `tag.ledger.trial_balance.read` | proposed | Control totals for completeness checks |
| `tag.evidence.attach` | proposed | Record the profile, queries and the data set identity |

## Procedure

1. **Identify the data set:** source, extraction time, row count, grain (one row per what) and the expected scope. Completion: all stated, or the gap noted.
2. **Profile structure:** columns, types, null and blank rates, distinct counts, min and max for dates and amounts. Use read-only aggregate queries through `tag.data.query`, following [references/read-only-query-rules.md](references/read-only-query-rules.md), rather than pulling detail rows. Completion: a column table.
3. **Run the accounting checks** in [references/accounting-checks.md](references/accounting-checks.md): required fields, duplicates (exact and near), debit/credit balance and sign conventions, out-of-period and future dates, unposted or draft rows, accounts missing from the chart, currency mix, entity and intercompany coding. Completion: each check has a result and a count.
4. **Measure coverage:** rows and amounts by period, entity and account against the expected scope; months with no activity; totals against control figures. Completion: a coverage matrix and each difference with its amount.
5. **Classify findings:** blocking (the data cannot support the intended use until fixed), needs confirmation, or informational. Completion: every finding has a class and a suggested owner.
6. **Record evidence** with `tag.evidence.attach`.

## Output

A profile following [references/upstream-guide.md](references/upstream-guide.md#output-format), plus a TAG section:

- Data set identity: source, extraction time, row count, query or file hash.
- Accounting checks: result, count and examples (record identifiers, not personal details).
- Coverage matrix and control-total differences, with amounts.
- Findings by class, and a plain statement of whether the data is fit for the stated use.

## When something is missing or wrong

- **No binding:** profile the user's export locally and say the profile describes that file, not the live ledger.
- **No control totals:** say completeness could not be tested; a clean profile is not proof of completeness.
- **Duplicates or sign problems:** report them with counts and amounts; do not delete, net or flip anything. Corrections are made at the source by the owner, or through finance-journal-entry-prep and an authorized posting.
- **Personal or sensitive data in the extract:** do not repeat it in the output; refer to rows by identifier.
- **Refused by the runtime:** report it; do not try another route.
- **Review:** blocking findings in data intended for reporting go to the person responsible for the ledger before anything is built on it.

## Dependencies

None. Queries go through `tag.data.query` against approved, organization-scoped data sets and are read-only `SELECT` statements that follow [references/read-only-query-rules.md](references/read-only-query-rules.md) (bound parameters only, identifiers from the approved schema, organization scope never widened); this skill never runs statements that change data.

## References

- [references/accounting-checks.md](references/accounting-checks.md): the accounting-specific checks.
- [references/read-only-query-rules.md](references/read-only-query-rules.md): rules every `tag.data.query` call follows.
- [references/upstream-guide.md](references/upstream-guide.md): general profiling workflow, quality framework and output format (upstream, adapted).
