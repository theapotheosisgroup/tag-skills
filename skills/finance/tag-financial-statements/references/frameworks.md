# Frameworks and presentation

The framework is an explicit input taken from the organization's approved policy. This skill supports two, each in English and French. Importing a US-oriented playbook (the upstream guide cites US GAAP ASC topics) does not establish compliance with either.

| | ASPE (NCECF in French) | IFRS |
| --- | --- | --- |
| Statements | Balance sheet; income statement; statement of retained earnings; cash flow statement | Statement of financial position; statement of profit or loss and other comprehensive income; statement of changes in equity; statement of cash flows |
| French titles | Bilan; État des résultats; État des bénéfices non répartis; État des flux de trésorerie | État de la situation financière; État du résultat net et des autres éléments du résultat global; État des variations des capitaux propres; Tableau des flux de trésorerie |
| Other comprehensive income | None. Accounts mapped to OCI are reported (`OCI_UNDER_ASPE`) | Shown below net income and accumulated in equity |
| Cash flow method | Indirect (direct not supported in this version) | Indirect (direct not supported in this version) |

## What the script decides, and what it does not

- It decides presentation structure, totals, checks and labels from the mapping and line catalogue.
- It does **not** decide accounting treatment: classification of interest and dividends paid, recognition, measurement, current/non-current splits and disclosures come from the organization's approved policies and the mapping. The draft notes say which policy version they rely on and leave policy text to be written from it.
- Line labels are standard descriptions, not legal or regulatory wording. A reviewer adapts them to the entity.

## Not supported in this version

- Consolidated statements, elimination entries and non-controlling interests (`UNSUPPORTED_SCOPE`).
- The direct cash-flow method (`CASH_FLOW_METHOD_UNSUPPORTED`).
- Segment reporting, discontinued operations and earnings per share.
- Multi-currency translation of a foreign operation. Foreign-currency cash of the entity itself is supported through the FX effect schedule.

Each is reported as an exception rather than approximated. Adding one needs fixtures with independently established results.
