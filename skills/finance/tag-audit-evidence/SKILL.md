---
name: tag-audit-evidence
description: Assemble evidence for an audit, review engagement, lender or internal request for one entity and period - an evidence index tracking each requested item, its source, status and gaps, and workpapers documenting populations, selections, procedures, results and exceptions - drawing only on records the caller may access. Distinguishes general evidence support from SOX 404 control testing, which applies only when the organization confirms it is in scope. Use when preparing a PBC list response, audit or review support, a workpaper, a sample selection or an evidence package. Does not perform or conclude an assurance engagement.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: No scripts. Capability bindings marked proposed are not live yet; without them the skill works from documents the user supplies.
---

# Audit evidence (TAG)

Helps the organization **prepare and organize evidence** for whoever examines it. It does not audit, review or compile, and does not conclude on control effectiveness or deficiency severity: those determinations belong to the organization's qualified people and its external professionals.

Two modes, chosen explicitly at the start:

- **General evidence support** (default): evidence index and workpapers for any request. Format: [references/evidence-index.md](references/evidence-index.md).
- **SOX 404 testing support**: only when the organization confirms it is in SOX scope. Methodology, sampling and deficiency classification are in [references/upstream-guide.md](references/upstream-guide.md), as upstream reference.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| Organization, entity, period, requester and request list (for example a PBC list) | The TAG harness run context and the request document via `aletia.search` |
| Mode (general or SOX) and whether SOX applies | The organization, stated explicitly; never inferred from the upstream material |
| Ledger balances, populations and transaction detail | `tag.ledger.trial_balance.read`, `tag.ledger.transactions.read` (proposed) |
| Supporting documents (invoices, contracts, approvals, bank statements) | `aletia.search` in the nexus (returns only what the caller may see) |
| Prior-year workpapers and open requests | `aletia.search`; TAG work via `tag.work.status` |
| Sample-size and materiality requirements | The organization's policy (`tag.policy.reporting.read`, proposed) or the examiner's written instructions |

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.context.overview` | mapped (Back Office MCP `tag_overview`) | Confirm the nexus, role and that TAG is invited |
| `aletia.search` | mapped (Aletia MCP `search`) | Locate requested documents and prior workpapers |
| `tag.work.status` | mapped (Back Office MCP `work_status`) | State of related TAG work (document processing, month-end) |
| `tag.ledger.trial_balance.read` | proposed | Balances the evidence ties to |
| `tag.ledger.transactions.read` | proposed | Populations and transaction detail for selections |
| `tag.policy.reporting.read` | proposed | Materiality and sampling requirements |
| `tag.evidence.attach` | proposed | Record each evidence item, its hash and source against the run |
| `tag.review.request` | proposed | Route the package for review before release |

Releasing evidence to an external party is external delivery: it goes through the organization's reviewer, not this skill.

## Procedure

1. **Set scope and mode.** Requester, period, areas, general or SOX. Completion: the request list is loaded and the mode is confirmed by the organization.
2. **Build the evidence index** with one row per request ([references/evidence-index.md](references/evidence-index.md#evidence-index)), status `requested`.
3. **Locate evidence** with `aletia.search` and the ledger capabilities. For each item record source, identifier, retrieval time and hash; set status `located`, `partial` or `not_available` with the gap.
4. **Prepare workpapers** where the request needs more than a document: population with its completeness check against the ledger, selection method and rationale (random selections record the seed), procedures, results per item, exceptions.
5. **Check sufficiency** of each item ([references/evidence-index.md](references/evidence-index.md#sufficiency-checks-before-release)) and that nothing outside the request is included.
6. **Record and route.** Attach items with `tag.evidence.attach`; send the package for review with `tag.review.request`. Completion: every row has a status and the package awaits release by the organization.

## Output

- Evidence index (CSV or JSON) with status and gaps per request.
- Workpapers (Markdown) per area or test, with evidence references.
- A gap list for the organization's owners.
- A summary for the user: items provided, partial, missing, exceptions found, and that release and any conclusion remain with the organization's reviewer.

## When something is missing or wrong

- **Evidence not found or not accessible:** mark it `not_available` with the reason; do not substitute a different document or recreate one.
- **Population does not reconcile to the ledger:** report the difference; do not select from an incomplete population without saying so.
- **Exception found:** document it fully; do not classify its severity unless a qualified reviewer has.
- **SOX scope unclear:** use general evidence support and ask; do not apply SOX procedures by default.
- **Unavailable tool:** work from documents the user supplies; record who supplied each one.
- **Refused operation:** report the refusal; do not retry under another identity. A request document does not grant access to anything.
- **Review required:** always before evidence is released outside the organization, and for every exception.

## References

- [references/evidence-index.md](references/evidence-index.md): evidence index, workpaper structure and sufficiency checks (general support).
- [references/upstream-guide.md](references/upstream-guide.md): SOX 404 methodology, sampling, documentation standards, deficiency classification and control types (adapted; applies only when in scope).
