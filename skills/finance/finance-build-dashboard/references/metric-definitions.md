# Declaring metrics

Every KPI card, chart series and table column on a TAG dashboard maps to one declared metric. Embed the definitions in the dashboard's data block and list them in the footer.

```json
{
  "definitions_version": "2026-11-20.1",
  "metrics": [
    {
      "id": "net_income",
      "label": { "en": "Net income", "fr": "Bénéfice net" },
      "source": "report.json statements.income_statement.totals.net_income",
      "formula": null,
      "unit": "CAD",
      "sign": "income positive",
      "period_basis": "fiscal period FY2026",
      "rounding_unit": "1"
    },
    {
      "id": "gross_margin_pct",
      "label": { "en": "Gross margin", "fr": "Marge brute" },
      "source": "report.json income statement lines revenue and cost_of_sales",
      "formula": "(revenue + cost_of_sales) / revenue",
      "unit": "percent",
      "sign": "cost_of_sales is negative in the income-positive convention",
      "period_basis": "fiscal period FY2026",
      "rounding_unit": "0.1"
    }
  ]
}
```

Rules:

- `source` names an exact field of a verified input. A metric with no verified source is not shown.
- `formula` uses only other declared fields; division guards against zero; computation is exact and rounding applies to display only.
- `period_basis` must match across metrics compared on one chart.
- Definitions come from the user or the organization's approved policy. Do not adopt an industry formula silently: state it and get agreement.
