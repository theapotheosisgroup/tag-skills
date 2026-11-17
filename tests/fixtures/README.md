# Test fixtures

**Nothing here is a TAG skill.** These files exist only so CI can exercise the validator and the Skills CLI while [`skills/`](../../skills/README.md) is empty.

| Fixture | Purpose |
| --- | --- |
| [`skills/tag-test-fixture/`](skills/tag-test-fixture/SKILL.md) | A minimal valid skill with a `references/` file. Used by the validator tests and by the discovery and installation smoke test. |

Every fixture sets `metadata.internal: true` in its frontmatter. The Skills CLI hides internal skills unless `INSTALL_INTERNAL_SKILLS=1` is set, so `npx skills add theapotheosisgroup/tag-skills` never offers a fixture. `node scripts/validate-skills.js --fixtures` fails if a fixture drops that flag, and the smoke test fails if discovery from the repository root ever lists one.

Fixtures stay outside `skills/` so they are never published, and invalid examples are generated in temporary directories by the tests instead of being committed.
