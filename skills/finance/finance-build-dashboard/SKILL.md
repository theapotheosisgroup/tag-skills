---
name: finance-build-dashboard
description: Build a management dashboard (a self-contained HTML file with KPI cards, trend and breakdown charts and a detail table) from verified report data, such as a finance-financial-statements report.json or query results that passed finance-validate-data, using declared metric definitions, with each figure traced to its source. Use when asked for a management, KPI, finance or month-end dashboard, a visual summary of statements or results, or a shareable one-page report. Not for inventing sample figures or for live BI tooling.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: Default output needs only a web browser (inline CSS and SVG, no network). The optional upstream Chart.js template loads chart.js 4.5.1 and chartjs-adapter-date-fns 3.0.0 from cdn.jsdelivr.net in the viewer's browser; use it only when asked and say so.
---

# Build a management dashboard (TAG)

Turns **verified** figures into a single HTML dashboard. The dashboard displays numbers; it does not compute new accounting figures. Every value shown comes from a verified input and a declared metric definition.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| Verified report data | `report.json` from finance-financial-statements (status and exceptions included), or query results with a finance-validate-data report |
| Metric definitions: name, formula over input fields, unit, sign, period basis, source | Declared by the user or the organization's reporting policy (`tag.policy.reporting.read`, proposed); format in [references/metric-definitions.md](references/metric-definitions.md) |
| Audience, purpose, period, entity, language | The user's request and the run context |
| Organization, nexus, correlation id | The TAG harness run context |

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.policy.reporting.read` | proposed | Approved metric definitions, thresholds and presentation language |
| `tag.data.query` | proposed | Read-only queries only, and only for figures that then pass finance-validate-data |
| `tag.evidence.attach` | proposed | Record the dashboard file, its hash and the input identities |
| `tag.review.request` | proposed | Route the dashboard to a reviewer before it is shared |

## Procedure

1. **Confirm inputs are verified.** For `report.json`, read `status` and `exceptions`; for query results, require a finance-validate-data report. Completion: each input has a verification reference. If an input is `blocked` or failed validation, either stop or show the affected figures with a visible "unresolved exception" marker; never present them as final.
2. **Declare the metrics** in the format of [references/metric-definitions.md](references/metric-definitions.md). Compute derived metrics only from declared formulas, with exact decimal arithmetic; round only for display. Completion: every KPI and chart series maps to one definition.
3. **Design the layout:** 2 to 4 KPI cards, 1 to 3 charts, an optional detail table, filters only where the data supports them. Layout guidance: [references/upstream-guide.md](references/upstream-guide.md#3-design-the-dashboard-layout).
4. **Build the HTML.** Default: one file with inline CSS, inline SVG charts and the data embedded as JSON; no external scripts, fonts or network calls. Use the upstream Chart.js template only when the user asks for it, and state that viewers' browsers will load two libraries from cdn.jsdelivr.net (pinned with integrity hashes).
5. **Label and trace.** Title with entity, period and "management draft" when the source is a draft; a footer listing each source (snapshot id and input hash, or query and validation report), metric-definition version, generation time and open exceptions. Completion: a reader can trace every figure.
6. **Check the output:** each displayed figure equals its source value after rounding; totals agree with the source totals. Record the file and its hash with `tag.evidence.attach`; route with `tag.review.request` when it will be shared.

## Output

- `<name>_dashboard.html`: self-contained, opens offline (default mode).
- A short note: sources and verification references, metric definitions used, figures with open exceptions, and whether the CDN template was used.

## When something is missing or wrong

- **No verified data:** ask for it. If the user wants a layout first, build a template with every value visibly marked as a placeholder and titled "template"; never generate realistic sample figures for a management dashboard.
- **Undefined metric:** ask for its definition; do not choose a formula silently.
- **Exceptions in the source:** show them on the dashboard next to the affected figures.
- **Unavailable or refused capability:** use the files the user supplies and say so; do not try another route.
- **Review:** dashboards shared outside the finance function or the organization go to a reviewer; a dashboard is not an assurance report.

## Dependencies

Requires finance-validate-data for any figures that do not come from a finance-financial-statements report.

## References

- [references/metric-definitions.md](references/metric-definitions.md): how to declare metrics and sources.
- [references/upstream-guide.md](references/upstream-guide.md): upstream layout guidance, Chart.js template, filters and styling (adapted).
