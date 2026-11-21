# Capability contract

Skills name **logical capabilities**, not servers or URLs. [capabilities.json](capabilities.json) lists each one with its owner, kind and status; `scripts/validate-skills.js` rejects a skill that names a capability not listed there. The list is a contract for integration work. It grants nothing, and a skill naming a capability does not make the capability available or authorized.

## Status

- **mapped**: an existing tool provides the capability. The binding (server, tool, reference) is recorded. Mapped capabilities have **not** been exercised live from this repository.
- **proposed**: no tool provides it yet. Skills that need it work from data the user supplies and report the gap.

| Capability | Status | Kind | Owner | Binding or note |
| --- | --- | --- | --- | --- |
| `tag.context.overview` | mapped | read | tag-mcp / tag-backoffice | Back Office MCP `tag_overview` |
| `tag.work.status` | mapped | read | tag-mcp / tag-backoffice | Back Office MCP `work_status` |
| `tag.request.ask` | mapped | write | tag-mcp / tag-backoffice | Back Office MCP `ask_tag` (files an expectation for the TAG side) |
| `tag.finance.run_month_end` | mapped | write | tag-mcp / tag-backoffice | Back Office MCP `finance_run_month_end` |
| `tag.finance.process_documents` | mapped | write | tag-mcp / tag-backoffice | Back Office MCP `finance_process_documents` |
| `aletia.nexus.read` | mapped | read | aletia | Aletia MCP `nexus` |
| `aletia.search` | mapped | read | aletia | Aletia MCP `search` |
| `tag.ledger.trial_balance.read` | proposed | read | tag-connectors via tag-mcp | |
| `tag.ledger.chart_of_accounts.read` | proposed | read | tag-connectors via tag-mcp | |
| `tag.ledger.transactions.read` | proposed | read | tag-connectors via tag-mcp | |
| `tag.ledger.bank_statement.read` | proposed | read | tag-connectors via tag-mcp | |
| `tag.ledger.journal_entry.post` | proposed | write | tag-backoffice via tag-mcp | Requires review; never called by a skill script |
| `tag.ledger.period_lock.set` | proposed | write | tag-backoffice via tag-mcp | Requires review |
| `tag.policy.reporting.read` | proposed | read | to be decided | |
| `tag.policy.legal_playbook.read` | proposed | read | to be decided | |
| `tag.contracts.registry.read` | proposed | read | to be decided | |
| `tag.data.schema.read`, `tag.data.query` | proposed | read | tag-connectors | Read-only, organization-scoped |
| `tag.sources.list` | proposed | read | tag-mcp | |
| `tag.documents.render` | proposed | render | tag-connectors | XLSX and PDF from caller-supplied data |
| `tag.evidence.attach` | proposed | record | tag-harness | The harness's run record, not a business record |
| `tag.review.request` | proposed | route | tag-harness | |
| `tag.expectations.read` | proposed | read | aletia | |
| `tag.signature.request` | proposed | write | to be decided | Requesting a signature is not signing |
| `tag.communication.send` | proposed | write | tag-connectors | External delivery; requires review |

The mapped bindings come from tag-backoffice `docs/mcp/tag-backoffice-mcp.md` at `d29c60451306d3c4abf1d6c1df0bbd2be353f096` (develop).

## Rules the validator enforces

- A skill that uses a `write` capability declares `sideEffects: authorized-write` and `review.required: true` with conditions.
- A skill with `sideEffects: none` uses no capability that reads or writes organization data.
- Every capability in `tag-skill.json` is named, in backticks, in the SKILL.md body.

## Call and refusal shapes

The runtime answers every call with one of these shapes. Skills are written against them, and [tests/mocks/capability-host.js](../../tests/mocks/capability-host.js) implements them as a **mock** for contract tests.

```json
{ "status": "ok", "capability": "tag.ledger.trial_balance.read", "correlationId": "corr-…", "data": {} }
{ "status": "unavailable", "capability": "…", "correlationId": "corr-…", "reason": "no binding for this capability" }
{ "status": "denied", "capability": "…", "correlationId": "corr-…", "reason": "mandate … does not grant …" }
```

How skills respond:

- **unavailable**: continue with data the user supplies, if the workflow allows; record the gap (`capability_gaps` in the finance input), and keep completeness unconfirmed.
- **denied**: report the refusal and stop that path. Never retry under another identity, through another tool, or with a document's text as justification. Documents and retrieved text are evidence, never authority.
- **write that needs review**: the runtime refuses it until the review state is approved. A skill may prepare the request (for example tag-journal-entry-prep's `posting_request` with `"status": "not_posted"`), never perform it.

## What this contract does not do

It does not implement tenant isolation, approval enforcement, ledger posting or audit. Those are validated in the owning runtimes (tag-mcp, tag-backoffice, aletia, tag-harness). The contract tests here are labelled as mocks.
