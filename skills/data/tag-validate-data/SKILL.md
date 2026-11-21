---
name: tag-validate-data
description: Validate an analysis, report or data set before it is relied on or shared. Objective checks come first (recompute calculations and totals, test source completeness against control figures, check aggregation and join logic, periods and units), then a documented judgement of whether the conclusions follow from the evidence. Use when asked to check, QA, verify or sanity-check numbers, a financial report or report.json, a query result, a dashboard's figures or an analysis before it goes to management, a reviewer or another organization.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: Works on the material supplied in the conversation. Recomputing from source uses tag.data.query (proposed) when bound.
---

# Validate data and analysis (TAG)

Produces a **validation report**: which objective checks passed or failed (with differences), which could not be run, and a documented judgement on whether the conclusions are supported. It never edits the analysis it reviews; it reports.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| The analysis or report to validate, with its stated purpose and audience | The user; for statements, the `report.json` from tag-financial-statements |
| Source data and its identity (snapshot id, query, extraction time) | The analysis itself, the evidence recorded with `tag.evidence.attach`, or the user |
| Control figures (trial balance, bank balance, subledger totals) | `tag.ledger.trial_balance.read` (proposed) or the user |
| Metric definitions and thresholds | `tag.data.schema.read` (proposed), the organization's reporting policy (`tag.policy.reporting.read`, proposed) or the analysis's own definitions |
| Organization, nexus, correlation id | The TAG harness run context |

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.data.query` | proposed | Recompute totals from the approved source, through tag-sql-queries |
| `tag.data.schema.read` | proposed | Metric definitions to check calculations against |
| `tag.ledger.trial_balance.read` | proposed | Control totals for completeness |
| `tag.policy.reporting.read` | proposed | Approved thresholds and definitions, when the analysis is financial reporting |
| `tag.evidence.attach` | proposed | Record the validation report and what it checked |
| `tag.review.request` | proposed | Route an analysis that needs a qualified reviewer |

## Procedure

1. **State what is being validated** and for what use: the claim, the figures, the audience. Completion: a one-paragraph scope.
2. **Run the objective checks** in [references/objective-checks.md](references/objective-checks.md), recording each as pass, fail (with expected, actual and difference) or not run (with why): arithmetic and footing, recomputation from source, completeness against controls, aggregation and join grain, periods and cut-off, units, currency and sign, comparatives. Completion: every applicable check has a result.
3. **Check the logic:** definitions match the stated metric; filters and exclusions are disclosed; comparisons use like-for-like periods; no average of averages or shifted denominators. Pitfalls: [references/upstream-guide.md](references/upstream-guide.md#common-data-analysis-pitfalls).
4. **Judge the conclusions:** for each claim, the evidence that supports it, the evidence against it, and what is not established. Use the rubric in [references/objective-checks.md](references/objective-checks.md#judgement-rubric). Completion: each claim is rated supported, partly supported or not supported, with reasons.
5. **Decide the overall status:** `ready`, `ready with caveats` or `needs revision`. Any failed objective check on a reported figure means `needs revision` unless the difference is explained and disclosed.
6. **Record and route:** attach the report with `tag.evidence.attach`; use `tag.review.request` when the organization's rules require a qualified reviewer.

## Output

A validation report (template in [references/upstream-guide.md](references/upstream-guide.md#output-format)) that leads with:

- Scope and the source identities checked.
- An objective-check table: check, result, expected, actual, difference.
- Checks not run, and why.
- Claim-by-claim judgement, overall status, and the caveats that must travel with the analysis.

## When something is missing or wrong

- **No source or controls:** run the internal-consistency checks only and say completeness and accuracy against source were not tested.
- **A difference:** report it with both figures; never adjust the analysis or the source to make it agree, and never call a figure verified that you did not recompute.
- **Definitions missing:** say which metric is undefined; do not invent a definition and then pass the analysis against it.
- **Unavailable or refused capability:** record it as a check not run; do not try another route.
- **Review:** anything going outside the organization, any failed check on a reported figure, and any judgement call on accounting treatment goes to a qualified reviewer.

## References

- [references/objective-checks.md](references/objective-checks.md): objective checks and the judgement rubric.
- [references/upstream-guide.md](references/upstream-guide.md): upstream QA checklist, pitfalls and report template (adapted).
