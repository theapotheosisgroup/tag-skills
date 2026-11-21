# Objective checks and judgement rubric

## Objective checks

Each check is pass, fail or not run. A fail records expected, actual and difference. Exact arithmetic: compare amounts as decimals, not floating-point.

| Check | Passes when |
| --- | --- |
| Footing | Every subtotal and total equals the sum of its components |
| Cross-footing | Row totals and column totals agree |
| Recomputation | Each reported figure recomputed from the stated source (query or file) equals the reported figure |
| Completeness | Source totals agree with independent control figures (trial balance, bank balance, subledger) for the same entity and period |
| Grain | Row counts before and after each join match the stated grain; no duplicate keys where one row per key is expected |
| Aggregation | Ratios are computed from summed numerators and denominators, not averaged ratios; weighted averages use the right weights |
| Period and cut-off | Every figure is for the stated period; comparative periods are the same length and basis |
| Units, currency, sign | One currency per total or an explicit conversion; units stated; debit/credit signs consistent |
| Comparatives | Prior-period figures agree with the prior report or source |
| Traceability | Each reported figure links to a source identifier (account, query, document) |
| Statements (for `report.json`) | `status`, `checks` and `exceptions` are read and reflected; no figure is presented as final while the report is `blocked` |

## Judgement rubric

For each conclusion or claim in the analysis:

| Rating | Meaning |
| --- | --- |
| Supported | The objective checks behind it pass and the evidence is sufficient for the stated use |
| Partly supported | The figures are right but the conclusion goes further than they show, or a material check was not run |
| Not supported | A check behind it failed, the evidence points the other way, or the claim rests on an undefined metric |

Write the reasons in one or two sentences per claim, naming the evidence. A rubric rating is a documented judgement, not a measurement: say who should confirm it when the stakes require.
