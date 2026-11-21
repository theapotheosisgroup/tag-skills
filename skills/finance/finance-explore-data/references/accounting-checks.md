# Accounting data checks

Run each check that applies to the data set and report its result, the count of affected rows and their total amount. State the sign convention you assumed.

| Check | How | Typical finding |
| --- | --- | --- |
| Required fields | Null or blank account, date, amount, entity, currency, document or journal id | Rows that cannot be traced or mapped |
| Debit/credit balance | Sum of debits equals sum of credits, per journal and in total; or signed amounts sum to zero | An unbalanced journal or a truncated extract |
| Sign convention | Amount columns: one signed column, or debit and credit columns with no negatives; revenue and liabilities carry the expected sign | Mixed conventions after a system change; reversed imports |
| Exact duplicates | Same journal id and line, or same date, account, amount, description and reference | Double import |
| Near duplicates | Same amount and counterparty within a few days, different reference | Possible duplicate invoice or payment (confirm, do not remove) |
| Period | Dates outside the requested period; future dates; postings dated after the period-lock date | Cut-off issues |
| Status | Draft, unposted, voided or deleted rows included | Totals that do not match the ledger |
| Accounts | Accounts not in the chart, inactive accounts with activity, suspense or clearing accounts with balances | Mapping gaps; unreconciled clearing |
| Currency | More than one currency in an amount column; missing rates for foreign rows | Totals mixing currencies |
| Entity and intercompany | Rows without entity; intercompany accounts without counterparty; counterparty pairs that do not offset | Elimination and reconciliation gaps |
| Coverage | Rows and amounts by month, entity and account against the expected scope; months with no activity | Missing periods or entities |
| Control totals | Data set totals against the trial balance, bank statement or subledger | Incomplete extract |

A data set can pass every check and still be incomplete or misclassified: say what was tested and what was not.
