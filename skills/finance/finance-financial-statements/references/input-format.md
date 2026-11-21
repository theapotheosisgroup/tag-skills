# Input snapshot format (`tag.financial-statements.input/v1`)

One JSON object. Amounts are decimal strings (for example `"1250.00"`) or JSON numbers; both are read as exact decimals. A string amount uses a dot decimal separator and no thousands separators, spaces or currency symbols: `"1250,00"` and `"1,250.00"` are rejected (exit 2), never reinterpreted. Balances are **debit-positive**: a debit balance is positive, a credit balance negative.

[assets/example-input.json](../assets/example-input.json) is a complete minimal example.

## Fields

| Field | Required | Content |
| --- | --- | --- |
| `schema` | yes | `"tag.financial-statements.input/v1"` |
| `organization` | yes | `{"id", "name"}` from the run context |
| `entity` | yes | `{"id", "name"}`: the reporting entity |
| `period` | yes | `{"start", "end", "label"}`, ISO dates |
| `reporting_currency` | yes | ISO 4217 code |
| `framework` | yes | `"ASPE"` or `"IFRS"`, from approved policy. Never inferred |
| `language` | no | `"en"` (default) or `"fr"` |
| `policies` | yes | `{"id", "version", "approved", "framework", "cash_flow_method"}`. `approved` must be `true`; `framework` must equal `framework`; `cash_flow_method` is `"indirect"` (the only method supported) |
| `mapping` | yes | `{"id", "version", "accounts": {"<account>": {"line": "<line code>", "currency"?: "USD", "counterparty"?: "<entity id>"}}}` |
| `snapshot` | yes | `{"id", "source", "extracted_at", "complete"}`. `complete` is `true` only when the source confirms it; `false` blocks; absent or `null` warns |
| `trial_balance` | yes | Adjusted, **pre-closing** trial balance: `[{"account", "name", "debit", "credit"}]` or `[{"account", "name", "balance"}]` |
| `opening_balances` | yes, unless `first_period` | **Post-closing** balances at the start of the period, same row shapes. No income, OCI or dividend balances |
| `first_period` | no | `true` when the entity has no prior period; opening balances are then zero |
| `adjustments` | no | Adjustments already included in the trial balance: `[{"id", "approved", "description", "lines": [{"account", "debit", "credit"}]}]`. Used for traceability and checks, not re-applied |
| `schedules.movements` | when schedule lines change | `[{"id", "line", "amount", "section", "description", "source"}]`. `amount` is the debit-positive change in that line's balance. `section` is one of `operating`, `investing`, `financing`, `noncash_pnl` (offset in profit or loss, for example depreciation), `noncash` (no cash: balance sheet to balance sheet, or to OCI) |
| `schedules.fx_cash_effect` | when cash is held in another currency | `{"amount", "source"}`: the exchange gain (positive) or loss on cash included in profit |
| `intercompany.confirmations` | when intercompany lines are used | `[{"counterparty", "line", "balance", "source"}]`, debit-positive from this entity's side |
| `comparative.trial_balance` | no | The prior period's adjusted pre-closing trial balance. It is closed and compared to `opening_balances` |
| `review` | no | `{"materiality", "reviewer_status"}` from approved policy. Materiality annotates exceptions; it never suppresses one |
| `presentation` | no | `{"rounding_unit"}`, default `"1"`. Applies to presented values only |
| `report` | no | `{"revision"}`, default 1 |
| `capability_gaps` | no | `[{"capability", "status": "unavailable" or "denied", "needed_for"}]`: what could not be retrieved |
| `scope` | no | `"entity"` (default). Anything else is reported as unsupported |

## How cash flows are derived

Indirect method. Net income, plus `noncash_pnl` and `operating` movements, plus the change in each working-capital line (`wc` below), less the FX effect on cash, is operating cash flow. `investing` and `financing` movements make up those sections. The change in every `schedule` line must equal its movements; otherwise the statement is incomplete and the difference is reported. `noncash` movements and other comprehensive income must offset each other. Opening cash plus the three sections plus the FX effect must equal closing cash.

## Line codes

`cf` says how a change in the line enters the cash flow statement: `cash` (the cash line), `wc` (operating working capital), `schedule` (must be explained by movements), `pnl` (through net income), `oci` (through comprehensive income).

| Code | Kind | Group | cf | English | Français |
| --- | --- | --- | --- | --- | --- |
| `cash` | asset | current assets | cash | Cash and cash equivalents | Trésorerie et équivalents de trésorerie |
| `receivables` | asset | current assets | wc | Accounts receivable | Débiteurs |
| `intercompany_receivable` | asset | current assets | wc | Due from related parties | Montants à recevoir de parties liées |
| `inventory` | asset | current assets | wc | Inventories | Stocks |
| `prepaid_expenses` | asset | current assets | wc | Prepaid expenses | Frais payés d'avance |
| `other_current_assets` | asset | current assets | wc | Other current assets | Autres actifs à court terme |
| `property_plant_equipment` | asset | noncurrent assets | schedule | Property, plant and equipment, at cost | Immobilisations corporelles, au coût |
| `accumulated_depreciation` | asset | noncurrent assets | schedule | Accumulated depreciation | Amortissement cumulé |
| `intangible_assets` | asset | noncurrent assets | schedule | Intangible assets | Actifs incorporels |
| `investments` | asset | noncurrent assets | schedule | Investments | Placements |
| `other_noncurrent_assets` | asset | noncurrent assets | schedule | Other long-term assets | Autres actifs à long terme |
| `payables` | liability | current liabilities | wc | Accounts payable | Créditeurs |
| `accrued_liabilities` | liability | current liabilities | wc | Accrued liabilities | Charges à payer |
| `deferred_revenue` | liability | current liabilities | wc | Deferred revenue | Produits reportés |
| `income_taxes_payable` | liability | current liabilities | wc | Income taxes payable | Impôts sur le résultat à payer |
| `intercompany_payable` | liability | current liabilities | wc | Due to related parties | Montants à payer à des parties liées |
| `other_current_liabilities` | liability | current liabilities | wc | Other current liabilities | Autres passifs à court terme |
| `dividends_payable` | liability | current liabilities | schedule | Dividends payable | Dividendes à payer |
| `current_debt` | liability | current liabilities | schedule | Current portion of long-term debt | Tranche de la dette à long terme échéant à moins d'un an |
| `long_term_debt` | liability | noncurrent liabilities | schedule | Long-term debt | Dette à long terme |
| `other_noncurrent_liabilities` | liability | noncurrent liabilities | schedule | Other long-term liabilities | Autres passifs à long terme |
| `share_capital` | equity | equity | schedule | Share capital | Capital-actions |
| `retained_earnings` | equity | equity | schedule | Retained earnings | Bénéfices non répartis |
| `dividends` | equity | equity | schedule | Dividends declared | Dividendes déclarés |
| `accumulated_oci` | equity | equity | schedule | Accumulated other comprehensive income | Cumul des autres éléments du résultat global |
| `revenue` | income | revenue | pnl | Revenue | Produits |
| `other_income` | income | revenue | pnl | Other income | Autres produits |
| `cost_of_sales` | income | expenses | pnl | Cost of sales | Coût des ventes |
| `operating_expenses` | income | expenses | pnl | Operating expenses | Charges d'exploitation |
| `depreciation_amortization` | income | expenses | pnl | Depreciation and amortization | Amortissements |
| `interest_expense` | income | expenses | pnl | Interest expense | Charges d'intérêts |
| `fx_gain_loss` | income | expenses | pnl | Foreign exchange gain (loss) | Gain (perte) de change |
| `income_tax_expense` | income | tax | pnl | Income taxes | Impôts sur le résultat |
| `oci` | oci | oci | oci | Other comprehensive income | Autres éléments du résultat global |

`oci` and `accumulated_oci` are IFRS concepts; mapping an account to them under ASPE is reported as `OCI_UNDER_ASPE`.
