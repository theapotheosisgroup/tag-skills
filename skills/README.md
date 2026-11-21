# Skills

Published TAG skills, one directory per skill under a category: `skills/<category>/<name>/`. The catalog, with what each skill does, is in the [README](../README.md#catalog); the generated index is [catalog.json](../catalog.json).

| Category | Skills |
| --- | --- |
| `finance/` | tag-financial-statements, tag-reconciliation, tag-journal-entry-prep, tag-close-management, tag-variance-analysis, tag-audit-evidence |
| `data/` | tag-sql-queries, tag-explore-data, tag-validate-data, tag-build-dashboard |
| `legal/` | tag-review-contract, tag-triage-nda, tag-vendor-check |
| `knowledge/` | tag-search-strategy, tag-source-management, tag-knowledge-synthesis |
| `operations/` | tag-task-management |
| `engineering/` | tag-tdd, tag-diagnosing-bugs, tag-codebase-design, tag-code-review, tag-domain-modeling |
| `productivity/` | tag-writing-for-agents, tag-handoff |

Each skill holds `SKILL.md`, `tag-skill.json`, `LICENSE`, `NOTICE.md` and the `references/`, `scripts/` and `assets/` it needs ([CONTRIBUTING](../CONTRIBUTING.md#naming-and-layout)). The CI test fixture lives in [`tests/fixtures/skills/`](../tests/fixtures/README.md), never here.
