# Finance reporting: policy configuration and operating example

How an organization configures reporting for the finance skills, and a worked run of [finance-financial-statements](../../skills/finance/finance-financial-statements/SKILL.md) on synthetic data.

## Reporting policy configuration

Policies belong to the organization and come from `tag.policy.reporting.read` (proposed) or from approved documents the organization supplies. The skills read them; they never invent them. Nothing in an upstream skill (US GAAP references, SOX procedures, sample thresholds) becomes policy by being imported.

| Setting | Used by | Notes |
| --- | --- | --- |
| Reporting framework: `ASPE` (NCECF) or `IFRS` | finance-financial-statements | Explicit. A missing or unsupported framework blocks the package |
| Policy id, version and approval state | all finance skills | Recorded in every report; an unapproved policy blocks |
| Presentation language: `en` or `fr` | finance-financial-statements | Statement titles and labels follow the framework's French or English names |
| Chart-of-accounts to statement mapping (id, version, line per account, currency, intercompany counterparty) | finance-financial-statements, finance-variance-analysis | Line codes: [input format](../../skills/finance/finance-financial-statements/references/input-format.md#line-codes) |
| Cash-flow method | finance-financial-statements | `indirect` (the only method supported) |
| Materiality and review thresholds (amount, percentage, per line class) | finance-financial-statements, finance-variance-analysis, finance-reconciliation | Annotate and prioritize; never suppress a difference |
| Reviewer and approver roles, delegation of authority | finance-journal-entry-prep, finance-close-management, governance-review-contract, governance-triage-nda | Applied by the runtime and review routing, not by the skill |
| Close checklist, owners and deadlines | finance-close-management | |
| SOX scope | finance-audit-evidence | SOX procedures apply only when the organization confirms it is in scope |

A missing setting is reported as an exception naming the setting. Where a judgement is not settled by policy, the skill asks or routes the item for review.

## Operating example

The commands below use the committed synthetic fixtures. The outputs in [examples/](examples/) are the script's real output for three of them, kept in sync by a test.

```bash
cd skills/finance/finance-financial-statements
python3 scripts/build_statements.py --input ../../../tests/fixtures/finance/accruals-noncash/input.json --out-dir /tmp/fs
```

| Fixture | What it exercises | Status | Key figures (hand-derived, in `expected.json`) |
| --- | --- | --- | --- |
| [simple-cash](../../tests/fixtures/finance/simple-cash/expected.json) | The brief's case: opening cash and equity 1,000; cash revenue 500; cash expense 200 | `ready_for_review` | Profit 300; operating cash flow 300; closing cash 1,300; equity 1,300 ([output](examples/simple-cash/statements.md)) |
| [unbalanced-tb](../../tests/fixtures/finance/unbalanced-tb/expected.json) | Debits ≠ credits by 10 | `blocked` | `TB_UNBALANCED`, `BS_IMBALANCE`, `CASH_FLOW_UNRECONCILED`, each -10; no plug |
| [unmapped-account](../../tests/fixtures/finance/unmapped-account/expected.json) | A 50 balance in an unmapped suspense account | `blocked` | `UNMAPPED_ACCOUNT` 50, reflected in the balance-sheet and cash differences |
| [missing-opening-balances](../../tests/fixtures/finance/missing-opening-balances/expected.json) | No opening balances | `blocked` | Income statement and balance sheet prepared; cash flow and equity roll-forward not prepared |
| [accruals-noncash](../../tests/fixtures/finance/accruals-noncash/expected.json) | Accruals, prepaid, depreciation, cash and note-financed equipment, loan repayment, share issue, dividends partly unpaid, income tax; ASPE in French with a comparative | `ready_for_review` | Net income 8,700; operating cash flow 10,600; investing -4,000; financing -1,500; closing cash 10,100; equity 17,200 ([output](examples/accruals-noncash/statements.md)) |
| [intercompany-fx](../../tests/fixtures/finance/intercompany-fx/expected.json) | IFRS in English, OCI, FX on USD cash, an intercompany balance the counterparty confirms differently | `blocked` | Comprehensive income 2,100; FX effect 100; closing cash 6,000; `INTERCOMPANY_DIFFERENCE` 50 ([output](examples/intercompany-fx/statements.md)) |

Each report records the input file's SHA-256, the snapshot id, the policy and mapping versions, the reviewer status (`not_reviewed`) and a management-draft label. Evidence for a run is the input file, `report.json` (with its checks and exceptions) and the renderings; the harness records them against the correlation id with `tag.evidence.attach` once that capability is bound.

What happens next in a real run: the error exceptions go back to whoever owns the inputs (a corrected extract, a schedule, an approval), corrections are prepared with finance-journal-entry-prep and posted only through the authorized posting operation, and the package goes to the organization's reviewer.
