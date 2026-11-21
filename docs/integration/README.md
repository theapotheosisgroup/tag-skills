# Integration boundaries

What this repository provides to the rest of TAG, what it assumes from other repositories, and the work that remains there. Nothing here is a live binding: skills describe workflows, and the owning runtimes authorize and execute every operation.

| Repository | Owns | What skills rely on |
| --- | --- | --- |
| `tag-skills` (this repository) | Workflow knowledge, reporting templates, portable helper scripts, metadata, evaluations | — |
| `tag-connectors` | Provider adapters (Xero and other ledgers, documents, mail, storage including OpenDAL), provider credentials and their custody, normalization of source data | The data behind the proposed `tag.ledger.*`, `tag.data.*`, `tag.documents.render` and `tag.communication.send` capabilities |
| `tag-harness` | Running agents through TrueForge: skill discovery and selection, execution state, retries, evidence capture, review routing | Loading a filtered catalog, recording evidence (`tag.evidence.attach`), routing review (`tag.review.request`) |
| `aletia` | Organizations, persons, roles, nexuses, delegated authority and audit records; expectations in the TRUSS ledger | The run context (organization, principal, delegation, nexus) and the authority decision behind every call; `aletia.nexus.read`, `aletia.search`, `tag.expectations.read` |
| `tag-mcp` | The MCP surface for TAG's back office: the client-facing facade, the Back Office MCP tools, A2A and APIs | Exposing authorized business operations; today's mapped tools (`tag_overview`, `work_status`, `ask_tag`, `finance_run_month_end`, `finance_process_documents`) |
| `tag-backoffice` | Back-office domain services and workflows; hosts the Back Office MCP server until it moves to `tag-mcp` | Domain rules behind posting, period locks and month-end |
| `tag-platform` | Deployment, edge and the Hydra authorization server | Nothing directly; infrastructure for the runtimes above |

Contracts in this directory:

- [capability-contract.md](capability-contract.md) and [capabilities.json](capabilities.json): the logical capability names skills use, their status (mapped or proposed), and the call and refusal shapes.
- [context-model.md](context-model.md): the run context a skill expects.
- [harness-consumption.md](harness-consumption.md): how the harness should consume releases and filter the catalog.

## What was tested, and how

| Integration | How it was tested here |
| --- | --- |
| Vercel Skills CLI 1.9.0: discovery, selected installs for codex, claude-code and universal, copy and symlink modes, lockfile restore | **Live**, against the pinned CLI and a local checkout, in CI (`npm run test:install`) |
| Upstream sources (anthropics/knowledge-work-plugins, mattpocock/skills) | **Live** with `npm run upstream:check` on 2026-11-20 (all 24 records then in the lock verified; upstream HEADs equal the pinned commits). The 16 remaining records are unchanged since. Not in CI; a local-repository test runs in CI |
| Missing tool, missing policy, refused capability, unauthorized write | **Mocked** contract checks ([tests/contracts](../../tests/contracts/capability-contract.test.js), [tests/mocks/capability-host.js](../../tests/mocks/capability-host.js)) |
| TAG Back Office MCP tools, Aletia MCP, tag-connectors, tag-harness, aletia authority | **Pending**: no live call is made from this repository |
| Installation from the private GitHub repository with real credentials | **Pending**: needs a merged default branch and a CI credential decision |

## Dependencies on other repositories

Each item below is work outside this repository. None is done by this change.

1. **tag-harness: consume a release.** TrueForge loads a skill only from a public git repository and with the sandbox on (tag-harness `packages/core/src/trueforge-kit/agents/README.md` at `03daffbdda8182e518bdb8c79a5b901611f19ee9`). This repository is private, so the harness needs a runtime bundle built with `npx skills add theapotheosisgroup/tag-skills@<tag> --skill <names> -a universal --copy -y` and mounted into the sandbox, or a decision to change visibility. See [harness-consumption.md](harness-consumption.md).
2. **tag-harness: catalog filtering and invocation mode.** Load `catalog.json`, filter by `audiences`, honour `invocation: user`, apply `dependencies`.
3. **tag-harness: evidence and review.** Bind `tag.evidence.attach` and `tag.review.request`.
4. **tag-mcp / tag-connectors: ledger reads.** Bind `tag.ledger.trial_balance.read`, `tag.ledger.chart_of_accounts.read`, `tag.ledger.transactions.read`, `tag.ledger.bank_statement.read` (Xero MCP surface over tag-connectors). A period-status read (`tag.ledger.periods.read`) is a likely addition.
5. **tag-backoffice / tag-mcp: authorized writes.** Define `tag.ledger.journal_entry.post` and `tag.ledger.period_lock.set` with confirmation, idempotency and attribution. Skills never call them without an authorized grant and an approved review.
6. **Owner decision: policy capabilities.** Decide who owns `tag.policy.reporting.read` and `tag.policy.legal_playbook.read` (tag-backoffice or aletia) and their schemas. Until then, policies come from documents the organization supplies.
7. **aletia: expectations and Matters.** Bind `tag.expectations.read`. "Matter" is not implemented anywhere; the mapping in governance-task-management is proposed until a model exists.
8. **tag-connectors: rendering and communication.** Bind `tag.documents.render` (XLSX, PDF) and `tag.communication.send`.
9. **.github: standards.** Update `standards/AGENTS-AND-SKILLS.md` for category directories ([ADR 0003](../adr/0003-categories-and-tag-skill-metadata.md)).
