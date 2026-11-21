# Test fixtures

Synthetic data and CI-only skills. Nothing here is a TAG skill or real client data.

## Fixture skills

| Fixture | Purpose |
| --- | --- |
| [`skills/tag-test-fixture/`](skills/tag-test-fixture/SKILL.md) | A minimal valid skill with a `references/` file, used by the validator tests and the discovery smoke test. |

Every fixture skill sets `metadata.internal: true`. The Skills CLI hides internal skills unless `INSTALL_INTERNAL_SKILLS=1` is set, so installing from this repository never offers a fixture. `npm run validate` fails if a fixture drops that flag, and `npm run test:install` fails if discovery from the repository root lists one. Fixture skills stay outside `skills/` and invalid examples are generated in temporary directories by the tests.

## Finance fixtures

[`finance/`](finance/) holds synthetic inputs for finance-financial-statements. Each case has `input.json` (the snapshot format in the skill's [input format](../../skills/finance/finance-financial-statements/references/input-format.md)) and `expected.json`, whose figures and exceptions were derived by hand, independently of the script; `expected.json` lists the derivation. The organizations, entities and amounts are invented.

| Case | Covers |
| --- | --- |
| `simple-cash` | The brief's independently checkable case: profit and operating cash flow 300, closing cash and equity 1,300 |
| `unbalanced-tb` | Trial-balance debits ≠ credits; no plug |
| `unmapped-account` | A balance in an unmapped account |
| `missing-opening-balances` | No opening balances: cash flow and equity roll-forward not prepared |
| `accruals-noncash` | Accruals, prepaid, depreciation, non-cash equipment financing, dividends payable, income tax; ASPE in French; comparative |
| `intercompany-fx` | IFRS in English, OCI, FX effect on foreign-currency cash, an intercompany confirmation difference |
