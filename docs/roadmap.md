# Roadmap

Planned work, kept here rather than shipped as empty skills. Each future skill meets the same standards as the catalog: a `SKILL.md` and `tag-skill.json`, provenance (original TAG work has an empty `provenance` list and no upstream notice), declared capabilities, and evaluations with independently established expected results before it is published.

## TAG-native follow-on skills (proposed, not implemented)

These are original development work, to start after the forked catalog is in use.

| Skill | Scope | Likely capabilities | Evaluation needed |
| --- | --- | --- | --- |
| `tag-client-onboarding` | Collect entity details, mandates, data-source access, accounting policies and onboarding gaps | `aletia.nexus.read`, `tag.policy.reporting.read`, `tag.sources.list`, `tag.request.ask` | Synthetic onboarding cases with known gaps |
| `tag-invoice-intake` | Extract invoice data, identify duplicates, propose coding, attach evidence | `tag.finance.process_documents`, `aletia.search`, `tag.ledger.chart_of_accounts.read`, `tag.evidence.attach` | Synthetic invoices with known duplicates and coding |
| `tag-receivables-follow-up` | Prioritize aging, draft follow-ups, track disputes through authorized communication actions | `tag.ledger.transactions.read`, `tag.communication.send` (authorized-write), `tag.expectations.read` | Synthetic aging with expected priorities; communication only drafted in tests |
| `tag-cash-forecast-13-week` | Rolling 13-week forecast from actual cash, receivables and payables, commitments and explicit assumptions | `tag.ledger.bank_statement.read`, `tag.ledger.transactions.read`, `tag.policy.reporting.read` | Synthetic weeks with hand-computed balances |

## Catalog follow-ups

- Bind the proposed capabilities ([integration dependencies](integration/README.md#dependencies-on-other-repositories)) and replace mocked contract checks with integration tests in the owning repositories.
- tag-financial-statements: consolidation and elimination entries, the direct cash-flow method, and translation of foreign operations are reported as unsupported today; each needs fixtures before it is added.
- Agent-specific plugin manifests (optional packaging beyond the Vercel installer).
- A first release tag (`v0.1.0`) after merge, and a private-repository installation test in CI once a credential decision is made.
- Additional document-generation skills only after a per-skill licence review; renderers come from declared dependencies or `tag.documents.render`.
