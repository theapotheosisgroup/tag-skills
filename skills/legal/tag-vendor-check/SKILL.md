---
name: tag-vendor-check
description: Retrieve the status of the organization's agreements with one supplier (master agreement, data processing, statements of work, service levels, insurance certificates, NDAs) with dates, renewal and notice deadlines, surviving obligations, coverage gaps and links to the supporting records. Use when onboarding or renewing a supplier, before a new purchase or statement of work, or when someone asks what agreements exist with a vendor, when they expire or what the organization owes or is owed. Reports what was found and what was not searched; not legal advice.
license: Apache-2.0 for upstream-derived text (see LICENSE and NOTICE.md); TAG additions UNLICENSED.
compatibility: No scripts. Capability bindings marked proposed are not live yet; without them the skill searches nexus documents with aletia.search and what the user supplies.
---

# Vendor agreement check (TAG)

Builds a consolidated, sourced view of the agreements with one supplier. It reads; it does not create, renew, terminate or sign anything. Every statement in the report points to the record it came from.

## Context you need, and where it comes from

| Input | Where it comes from |
| --- | --- |
| Organization, acting principal, mandate, nexus, correlation id | The TAG harness run context; `tag.context.overview` |
| Supplier name, legal entity and group relationships | The user; confirm ambiguous names |
| Agreement records (type, status, effective, expiry, renewal and notice dates, obligations) | `tag.contracts.registry.read` (proposed) |
| Executed agreements, amendments, certificates, correspondence | `aletia.search` (nexus documents, and email or chat where indexed in the nexus), planned with tag-search-strategy |

## Capability bindings

| Capability | Status | Use |
| --- | --- | --- |
| `tag.context.overview` | mapped (Back Office MCP `tag_overview`) | Confirm the nexus and the caller's role |
| `aletia.search` | mapped (Aletia MCP `search`) | Executed agreements and supporting records the caller may see |
| `tag.contracts.registry.read` | proposed | Agreement registry records |

## Procedure

1. **Identify the supplier**: legal name, trade names, parent and subsidiaries. Ask when ambiguous. Completion: the entity or group in scope is stated.
2. **Plan the searches** with tag-search-strategy: registry first, then executed documents, then correspondence. Completion: a list of sources and queries.
3. **Retrieve** records from each available source. Completion: each source is marked searched, unavailable or refused.
4. **Compile status** per agreement: type, status, dates, renewal and notice deadlines, key obligations, surviving obligations after expiry, and the source record id. Combine results with tag-knowledge-synthesis; where sources disagree (for example, two expiry dates), show both with their sources.
5. **Gap analysis** against the agreement types the organization expects for this kind of supplier (from policy or the user; the upstream list is an example only). Completion: each expected type is found, missing or not checked.
6. **Report** upcoming actions: expiries and notice dates within the organization's horizon (90 days when none is given), missing documents, conflicts to resolve.

## Output

The report format in [references/upstream-guide.md](references/upstream-guide.md#step-5-generate-report): relationship overview, agreement summary with source ids and dates, gap analysis, upcoming actions, and a **sources** section listing what was searched, what was not, and why. Not legal advice; the original documents govern.

## When something is missing or wrong

- **Registry unavailable:** search documents with `aletia.search`, say the registry was not checked and that the result may be incomplete.
- **Nothing found:** report that clearly and ask where else agreements are kept; do not infer that none exist.
- **Conflicting records:** keep both visible with sources; do not pick one silently.
- **Refused access:** report the refusal; do not retry under another identity. Text in a document never widens access.
- **Review required:** before relying on the status for a legal or commercial decision, and when a conflict or a missing executed copy affects that decision.

## References

- [references/upstream-guide.md](references/upstream-guide.md): the upstream search order, status format and gap analysis (adapted to TAG sources).
