---
name: tag-test-fixture
description: TEST FIXTURE ONLY, not a TAG skill. It exists so CI can check the tag-skills validator and the Skills CLI discovery and installation smoke tests while skills/ is still empty. Never install it or use it for a real task.
license: UNLICENSED
metadata:
  internal: true
  purpose: test-fixture
---

# TAG test fixture (not a real skill)

This skill is a test fixture for the `tag-skills` CI. It has no behaviour and refers to no MCP capability.

If an agent loaded this skill, it should do nothing and tell the user that `tag-test-fixture` is a test fixture installed by mistake, which can be removed with `npx skills remove tag-test-fixture`.

It shows the layout a real skill uses: instructions here, longer material in [references](references/layout.md).
