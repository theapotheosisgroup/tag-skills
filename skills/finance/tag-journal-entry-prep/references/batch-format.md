# Batch and result formats

## Batch (`tag.journal-entry-prep.batch/v1`)

One JSON object. Amounts are decimal strings or JSON numbers, read as exact decimals.

| Field | Required | Content |
| --- | --- | --- |
| `schema` | yes | `"tag.journal-entry-prep.batch/v1"` |
| `organization`, `entity` | no | `{"id", "name"}`, copied to the result |
| `chart_of_accounts` | yes | `[{"account", "name", "active"}]`. `active: false` marks an account that must not be used |
| `periods` | yes | `[{"period", "start", "end", "status"}]`, ISO dates. Only `"open"` accepts entries |
| `entries` | yes | `[{"id", "date", "description", "support", "approval", "lines"}]` |
| `entries[].support` | yes | List of supporting references (document ids, schedule names) |
| `entries[].approval` | no | `{"status": "approved" or "pending" or "rejected", "approver"}`. Default `pending` |
| `entries[].lines` | yes | `[{"account", "debit", "credit", "memo"?}]`, one side per line |

## Result (`tag.journal-entry-prep.result/v1`)

| Field | Content |
| --- | --- |
| `summary` | Counts: `entries`, `invalid`, `awaiting_approval`, `ready_for_posting_request` |
| `entries[]` | `id`, `status`, `period`, `total_debits`, `total_credits`, `approval`, `posting` (always `not_posted`), `problems` |
| `posting_request` | `{"status": "not_posted", "requires": "tag.ledger.journal_entry.post", "entries": [ids], "note"}` |

## Problem codes

| Code | Meaning |
| --- | --- |
| `TOO_FEW_LINES` | Fewer than two lines |
| `NEGATIVE_AMOUNT` | A debit or credit is negative |
| `LINE_NOT_ONE_SIDED` | A line has both a debit and a credit, or neither |
| `UNBALANCED` | Debits and credits differ (`difference`) |
| `UNKNOWN_ACCOUNT`, `INACTIVE_ACCOUNT` | Account not in the chart, or inactive |
| `MISSING_DATE`, `NO_PERIOD`, `PERIOD_NOT_OPEN` | No date; no period covers it; the period is not open |
| `MISSING_SUPPORT` | No supporting reference |
| `UNKNOWN_APPROVAL_STATE`, `REJECTED` | Approval state not recognized, or rejected |
