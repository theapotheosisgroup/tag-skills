# Third-party notices

The skills in this repository are forks of third-party skills. Each forked skill carries its upstream licence text in its own `LICENSE` file and a `NOTICE.md` that names the source, the commit, the files that came from it and what TAG modified, so a skill installed on its own keeps its notices. The machine-readable record, with content hashes, is [upstreams.lock.json](upstreams.lock.json).

TAG's original additions (the tooling, schemas, scripts written by TAG, and the TAG-written parts of each skill) are not licensed under the upstream licences: they are `UNLICENSED`, all rights reserved, as stated in [package.json](package.json). One repository-level licence does not replace the upstream terms that apply to each fork.

## anthropics/knowledge-work-plugins

- Source: <https://github.com/anthropics/knowledge-work-plugins> at commit `0e0fcacddcc892eb92a1b7873ff9d68159c47571`.
- Licence: Apache License, Version 2.0. Text: [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt), identical to the `LICENSE` file of each selected domain folder (`finance/`, `data/`, `legal/`, `enterprise-search/`, `productivity/`).
- No NOTICE file exists in the repository at that commit, and the selected folders carry no copyright line. The repository-root `LICENSE` has trailing text that is not part of the Apache licence; the clean domain-folder copies are used.
- Modified files are marked in each skill's `NOTICE.md` and in a comment at the top of each `references/upstream-guide.md`, as section 4(b) of the licence requires.
- Skills: finance-financial-statements, finance-reconciliation, finance-journal-entry-prep, finance-close-management, finance-variance-analysis, finance-audit-evidence, finance-explore-data, finance-validate-data, finance-build-dashboard, governance-review-contract, governance-triage-nda, governance-vendor-check, governance-search-strategy, governance-source-management, governance-knowledge-synthesis, governance-task-management.

## mattpocock/skills

- Source: <https://github.com/mattpocock/skills> at commit `abeeaf95660ba9e8b7c753eb38f441ca707a8823`.
- Licence: MIT. Copyright (c) 2026 Matt Pocock. Text: [LICENSES/MIT-mattpocock-skills.txt](LICENSES/MIT-mattpocock-skills.txt).
- Skills: none since 2026-11-21. The seven engineering and productivity skills forked from this source were removed from the catalog, which is limited to back-office G&A work; their import history is kept as `removed` records in [upstreams.lock.json](upstreams.lock.json). The licence text stays here because earlier commits of this repository distributed them.

## vercel-labs/skills

The Skills CLI is a development dependency (`skills` 1.9.0 from npm, MIT), installed from `package-lock.json`. No source from it is copied here. The reviewed source commit `57217cf86ba38148a57af9e90d14a4c049558330` was the compatibility reference.

## Excluded

`samuelclk/dinoclaw_guides` (`financial-statements`) is not imported: its repository root exposed no licence when the brief was reviewed. It is recorded under `blocked` in [upstreams.lock.json](upstreams.lock.json).
