// The example outputs in docs/finance/examples/ are the script's real output for three fixtures.
// This test regenerates them and compares every file byte for byte, so the documentation cannot
// drift from the code. Regenerate with:
//   python3 -I skills/finance/finance-financial-statements/scripts/build_statements.py \
//     --input tests/fixtures/finance/<case>/input.json --out-dir docs/finance/examples/<case>

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { buildStatements, repo } from "../../helpers.js";

const examples = join(repo, "docs", "finance", "examples");

for (const name of (await readdir(examples)).sort()) {
  if (name.endsWith(".md")) continue;
  test(`docs/finance/examples/${name} matches the script's output`, async () => {
    const { out } = await buildStatements(join(repo, "tests", "fixtures", "finance", name, "input.json"));
    const committed = (await readdir(join(examples, name))).sort();
    assert.deepEqual((await readdir(out)).sort(), committed);
    for (const file of committed) {
      assert.equal(await readFile(join(out, file), "utf8"), await readFile(join(examples, name, file), "utf8"), file);
    }
  });
}
