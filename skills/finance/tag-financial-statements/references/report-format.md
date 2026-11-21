# Report format (`tag.financial-statements.report/v1`)

`report.json` is the machine-readable package. Every amount is an exact decimal string; `presented` values are rounded to the presentation unit, line by line, and are for display only.

## Top level

| Field | Content |
| --- | --- |
| `status` | `ready_for_review` (no error exception) or `blocked` |
| `label` | The management-draft statement in the presentation language |
| `organization`, `entity`, `period`, `framework`, `framework_name`, `language`, `reporting_currency` | Copied from the input; `framework_name` is the localized framework name |
| `report` | `revision`, `input_sha256` (hash of the input file's bytes), `snapshot` (id, source, extracted_at, complete), `policy` and `mapping` (id, version), `reviewer_status` |
| `statements` | `income_statement`, `balance_sheet`, `cash_flow_statement`, `equity_statement`. Each has a localized `title` and a `status`: `prepared`, `incomplete` (prepared, but a check failed) or `not_prepared` (with `reason`) |
| `checks` | `[{id, status: pass, fail or not_run, description, ...values}]` |
| `exceptions` | `[{code, severity: error or warning, message, amount?, account?, line?, above_materiality?}]` |
| `noncash_transactions` | The `noncash` movements, for disclosure |
| `notes_draft` | Basis of presentation, policies placeholder, non-cash transactions, related-party balances |
| `traceability` | One row per trial-balance account: balance, mapped line, statement, adjustments |

Statement lines carry `code`, `label`, `amount`, `presented`, `accounts` (the source accounts) and `adjustments` (adjustment ids touching those accounts), and `comparative` where an opening or prior figure exists.

## Checks

| Id | Passes when |
| --- | --- |
| `TB_BALANCED` | Trial-balance debits equal credits |
| `MAPPING_COVERAGE` | Every trial-balance account is mapped |
| `ADJUSTMENTS_SUPPORTED` | Every adjustment balances, is approved and uses mapped accounts |
| `OPENING_BALANCED` | Opening balances sum to zero and are post-closing |
| `BS_BALANCES` | Assets equal liabilities plus equity |
| `CASH_RECONCILES` | Opening cash plus cash flows and FX effect equals closing cash |
| `MOVEMENTS_EXPLAIN_CHANGES` | Movement schedules explain every schedule-line change and non-cash movements offset |
| `EQUITY_ROLLFORWARD` | Share capital, retained earnings and accumulated OCI roll forward |
| `INTERCOMPANY_AGREES` | Intercompany balances agree with confirmations (only when intercompany lines are used) |
| `COMPARATIVE_AGREES` | The closed prior period equals the opening balances (only with a comparative) |

## Exception codes

| Code | Severity | Meaning and what to do |
| --- | --- | --- |
| `TB_UNBALANCED` | error | Debits and credits differ by `amount`. Get a corrected extract; never balance it here |
| `UNMAPPED_ACCOUNT` | error | `account` has no mapping; its `amount` is excluded everywhere. Extend the approved mapping |
| `MISSING_MAPPING` | error | No mapping supplied |
| `ADJUSTMENT_UNBALANCED`, `ADJUSTMENT_NOT_APPROVED`, `ADJUSTMENT_UNMAPPED_ACCOUNT` | error | An adjustment in the trial balance is unsupported. Obtain approval or correct it through tag-journal-entry-prep |
| `OPENING_UNBALANCED`, `OPENING_NOT_CLOSED` | error | Opening balances do not sum to zero, or still hold income, OCI or dividends |
| `MISSING_OPENING_BALANCES` | error | No opening balances and not a first period: cash flow and equity roll-forward not prepared |
| `BS_IMBALANCE` | error | Assets differ from liabilities plus equity by `amount` |
| `CASH_FLOW_UNRECONCILED` | error | Cash flows do not reach closing cash; difference in `amount` |
| `MISSING_MOVEMENT_SCHEDULE`, `MOVEMENT_SCHEDULE_DIFFERENCE` | error | A schedule line's change is unexplained by `amount`. Get the fixed-asset, debt or equity schedule |
| `NONCASH_UNBALANCED` | error | Non-cash movements and OCI do not offset |
| `FX_SCHEDULE_MISSING` | error | Foreign-currency cash without an FX effect schedule |
| `EQUITY_ROLLFORWARD_DIFFERENCE` | error | An equity component does not roll forward |
| `INTERCOMPANY_DIFFERENCE` | error | Recorded balance differs from the counterparty's confirmation by `amount` |
| `INTERCOMPANY_COUNTERPARTY_MISSING` | error | An intercompany account names no counterparty |
| `INTERCOMPANY_UNCONFIRMED` | warning | No confirmation for a non-zero intercompany balance |
| `COMPARATIVE_MISMATCH` | error | The prior period does not close into the opening balance of `line` |
| `MISSING_POLICY`, `POLICY_NOT_APPROVED`, `POLICY_FRAMEWORK_MISMATCH` | error | Approved policies are missing or inconsistent. Do not substitute defaults |
| `FRAMEWORK_NOT_SELECTED`, `FRAMEWORK_UNSUPPORTED` | error | The framework must be ASPE or IFRS, explicitly |
| `OCI_UNDER_ASPE` | error | Accounts are mapped to OCI under ASPE |
| `CASH_FLOW_METHOD_UNSUPPORTED` | error | Only the indirect method is supported |
| `UNSUPPORTED_SCOPE` | error | Consolidation and eliminations are not supported |
| `MISSING_CONTEXT`, `MISSING_SNAPSHOT_IDENTITY` | error | The report cannot be identified or traced |
| `SNAPSHOT_INCOMPLETE` | error | The source marked the snapshot incomplete |
| `SNAPSHOT_COMPLETENESS_UNCONFIRMED` | warning | Completeness not confirmed by the source |
| `CAPABILITY_UNAVAILABLE` | error | A needed capability had no binding |
| `CAPABILITY_DENIED` | error | The runtime refused a capability. Do not retry under another identity |
| `LANGUAGE_UNSUPPORTED` | warning | Language other than English or French; English used |
