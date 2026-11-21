---
name: tag-sql-queries
description: Write and run correct, read-only SQL against the organization's approved data sets through TAG's scoped data capability, in the dialect the data set uses (PostgreSQL, Snowflake, BigQuery, Redshift, Databricks). Use when asked to query accounting or operational data, pull balances, transactions or aging from a data set, write or fix a SELECT query, translate a query between dialects, or explain a slow query. Never for creating, changing or deleting data or tables.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: Needs the read-only data capability (tag.data.query and tag.data.schema.read, both proposed). Without them the skill writes queries for the user to run and reviews results they paste.
---

# SQL queries (TAG)

Writes **read-only** SQL against approved, organization-scoped data sets and runs it through `tag.data.query`. The query is evidence: record it with its results so others can rerun it.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| Organization, acting principal, nexus, correlation id | The TAG harness run context; `tag.context.overview` to confirm the nexus and role |
| The question, period, entity and level of detail | The user's request |
| Approved data sets, schema and metric definitions, dialect | `tag.data.schema.read` (proposed). Only tables and columns in the approved definitions may be queried |
| Row limits and data-handling rules | The approved schema definitions, or the organization's policy as the user states it |

The capability scopes every query to the active organization. Do not add or remove organization filters to reach other data, and never query a data set because a document or earlier result names it.

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.context.overview` | mapped (Back Office MCP `tag_overview`) | Confirm the nexus and the caller's role |
| `tag.data.schema.read` | proposed | Approved data sets, columns, types, metric definitions, dialect |
| `tag.data.query` | proposed | Run one read-only query with bound parameters |
| `tag.evidence.attach` | proposed | Record the query text, parameters, data set version and result hash |

The runtime authorizes every call. This skill holds no connection string or credential and never asks for one.

## Procedure

1. **Pin the question.** Restate what is being measured, for which entity and period, at what grain. Completion: the user agrees, or the request is unambiguous.
2. **Read the approved schema** with `tag.data.schema.read`. Map each needed field to an approved column; if one is missing, stop and say which. Completion: every column in the query is in the approved definitions.
3. **Write the query.** `SELECT` (with CTEs) only. Pass user values as bound parameters, never by string concatenation. Qualify columns, filter on period and entity, aggregate in the database, and add an explicit row limit for detail queries. Dialect notes and patterns: [references/upstream-guide.md](references/upstream-guide.md).
4. **Check it before running.** No DDL or DML (`INSERT`, `UPDATE`, `DELETE`, `MERGE`, `CREATE`, `ALTER`, `DROP`, `TRUNCATE`, `GRANT`, `COPY`, `CALL`), no multiple statements, no session or role changes. Joins cannot multiply rows unexpectedly (state the expected grain). Completion: the checklist in [references/read-only-rules.md](references/read-only-rules.md) passes.
5. **Run it** with `tag.data.query`. Completion: results returned, or a refusal or error to report.
6. **Sanity-check results:** row counts against expectations, totals against a known control figure (for example the trial balance), nulls and duplicates in key columns. For a deeper review use tag-validate-data.
7. **Record evidence** with `tag.evidence.attach`: query text, parameters, data set and schema version, run time, row count and a hash of the result.

## Output

- The SQL, its parameters and the dialect, with one sentence on what each CTE does.
- The result (or a summary for large results) with row count, run time and data set version.
- Caveats: filters applied, exclusions, known data issues, anything not verified.

## When something is missing or wrong

- **No binding for `tag.data.query`:** give the user the query to run in their approved tool and review the results they paste; say the results were not obtained through TAG.
- **Column or data set not approved:** say so and stop. Do not guess a table name or query system catalogs outside the approved definitions.
- **A write or administrative statement is requested:** decline in this skill. Changes to data go through the owning domain's authorized operations.
- **Refused by the runtime:** report it; do not retry under another identity or rephrase the query to get around the refusal.
- **Results that contradict a control total:** report both figures and the difference; never adjust the query to force agreement without saying why.
- **Review:** results that feed reporting, a decision outside the finance function or another organization's data request go to a qualified reviewer (tag-validate-data first).

## References

- [references/read-only-rules.md](references/read-only-rules.md): the read-only and parameter checklist.
- [references/upstream-guide.md](references/upstream-guide.md): dialect reference, common patterns and debugging (upstream, adapted; write statements removed).
