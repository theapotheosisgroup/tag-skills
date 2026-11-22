# Roadmap

Planned work, kept here rather than shipped as empty skills. Each future skill meets the same standards as the catalog: a `SKILL.md` and `tag-skill.json`, provenance (original TAG work has an empty `provenance` list and no upstream notice), declared capabilities, and evaluations with independently established expected results before it is published.

## TAG-native follow-on skills (proposed, not implemented)

These are original development work, to start after the forked catalog is in use.

| Skill | Scope | Likely capabilities | Evaluation needed |
| --- | --- | --- | --- |
| `governance-client-onboarding` | Collect entity details, mandates, data-source access, accounting policies and onboarding gaps | `aletia.nexus.read`, `tag.policy.reporting.read`, `tag.sources.list`, `tag.request.ask` | Synthetic onboarding cases with known gaps |
| `finance-invoice-intake` | Extract invoice data, identify duplicates, propose coding, attach evidence | `tag.finance.process_documents`, `aletia.search`, `tag.ledger.chart_of_accounts.read`, `tag.evidence.attach` | Synthetic invoices with known duplicates and coding |
| `finance-receivables-follow-up` | Prioritize aging, draft follow-ups, track disputes through authorized communication actions | `tag.ledger.transactions.read`, `tag.communication.send` (authorized-write), `tag.expectations.read` | Synthetic aging with expected priorities; communication only drafted in tests |
| `finance-cash-forecast-13-week` | Rolling 13-week forecast from actual cash, receivables and payables, commitments and explicit assumptions | `tag.ledger.bank_statement.read`, `tag.ledger.transactions.read`, `tag.policy.reporting.read` | Synthetic weeks with hand-computed balances |

## People pillar (proposed, not implemented)

The `people` pillar has no skills yet, so there is no `skills/people/` directory and no `people` profile. Candidates, each `people-` prefixed and published only once it meets the standards above:

| Skill | Scope | Likely capabilities | Evaluation needed |
| --- | --- | --- | --- |
| `people-payroll` | Prepare and check a payroll run: hours, rates, deductions, remittances and the payroll journal, against the approved register; never submits a run | proposed payroll read capabilities, `tag.ledger.chart_of_accounts.read`, `tag.review.request` | Synthetic payroll periods with hand-computed gross-to-net and remittances |
| `people-onboarding` | Onboarding and offboarding checklists: documents, access requests, equipment, payroll set-up, with owners and due dates | proposed HR record read capabilities, `tag.request.ask` | Synthetic hires and departures with known missing items |
| `people-hr-records` | Check employee records for completeness, expiring documents and policy acknowledgements; personal data never repeated in outputs | proposed HR record read capabilities, `tag.policy.reporting.read` | Synthetic records with known gaps and expiries |

Each needs its capabilities registered in [capabilities.json](integration/capabilities.json) (proposed until bound) before publication.

## Removed from the catalog (2026-11-21)

The catalog is limited to back-office G&A work ([ADR 0004](adr/0004-pillar-categories-and-prefixes.md)). The engineering skills (`tdd`, `diagnosing-bugs`, `codebase-design`, `code-review`, `domain-modeling`), the productivity skills (`writing-for-agents`, `handoff`) and `sql-queries` were removed. Their provenance is kept as `removed` records in [upstreams.lock.json](../upstreams.lock.json); bringing one back means a fresh fork with a pillar name and a new licence and hash check.

## Catalog follow-ups

- Bind the proposed capabilities ([integration dependencies](integration/README.md#dependencies-on-other-repositories)) and replace mocked contract checks with integration tests in the owning repositories.
- finance-financial-statements: consolidation and elimination entries, the direct cash-flow method, and translation of foreign operations are reported as unsupported today; each needs fixtures before it is added.
- A first release tag (`v0.1.0`) after merge, and a private-repository installation test in CI once a credential decision is made.
- Additional document-generation skills only after a per-skill licence review; renderers come from declared dependencies or `tag.documents.render`.
