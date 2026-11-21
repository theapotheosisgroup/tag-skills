// upstream-check against a local git repository standing in for an upstream source (no network).

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";
import { hashDirectory } from "../scripts/lib/hash.js";
import { hashAt, main } from "../scripts/upstream-check.js";

const run = promisify(execFile);
let work = "";
before(async () => {
  work = await mkdtemp(join(tmpdir(), "tag-skills-upstream-test-"));
});
after(async () => {
  await rm(work, { recursive: true, force: true });
});

/** @param {string[]} args @param {string} cwd */
const git = async (args, cwd) =>
  (
    await run(
      "git",
      ["-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", ...args],
      { cwd },
    )
  ).stdout.trim();

test("verifies the recorded hash, reports upstream changes and writes a proposed diff", async () => {
  const upstream = join(work, "upstream");
  await mkdir(join(upstream, "skills", "demo", "refs"), { recursive: true });
  await writeFile(join(upstream, "skills", "demo", "SKILL.md"), "---\nname: demo\n---\nv1\n");
  await writeFile(join(upstream, "skills", "demo", "refs", "a.md"), "a\n");
  await writeFile(join(upstream, "skills", "other.md"), "unrelated\n");
  await git(["init", "-q"], upstream);
  await git(["add", "-A"], upstream);
  await git(["commit", "-qm", "one"], upstream);
  const first = await git(["rev-parse", "HEAD"], upstream);

  const recorded = await hashAt(upstream, first, "skills/demo");
  assert.equal(
    recorded.hash,
    (await hashDirectory(join(upstream, "skills", "demo"))).hash,
    "git and filesystem hashes agree",
  );
  assert.equal(recorded.count, 2);

  const lock = {
    lockfileVersion: 1,
    sources: {
      "test/upstream": {
        url: "https://github.com/test/upstream",
        commit: first,
        licence: "MIT",
        copyright: "",
        notices: [],
      },
    },
    imports: [
      {
        id: "test/upstream:skills/demo",
        source: "test/upstream",
        commit: first,
        path: "skills/demo",
        tagName: "tag-demo",
        sourceHash: recorded.hash,
      },
    ],
    blocked: [],
  };
  const lockPath = join(work, "lock.json");
  await writeFile(lockPath, JSON.stringify(lock));
  const sourceDir = `test/upstream=${upstream}`;
  assert.equal(await main(["--lock", lockPath, "--source-dir", sourceDir]), 0);

  // An unrelated upstream change leaves the import unchanged.
  await writeFile(join(upstream, "skills", "other.md"), "still unrelated\n");
  await git(["commit", "-qam", "two"], upstream);
  assert.equal(await main(["--lock", lockPath, "--source-dir", sourceDir, "--ref", "HEAD", "--fail-on-change"]), 0);

  // A change inside the folder is reported, with a patch.
  await writeFile(join(upstream, "skills", "demo", "SKILL.md"), "---\nname: demo\n---\nv2\n");
  await git(["commit", "-qam", "three"], upstream);
  const diffs = join(work, "diffs");
  assert.equal(await main(["--lock", lockPath, "--source-dir", sourceDir, "--ref", "HEAD", "--diff-dir", diffs]), 0);
  assert.equal(await main(["--lock", lockPath, "--source-dir", sourceDir, "--ref", "HEAD", "--fail-on-change"]), 1);
  const patch = await readFile(join(diffs, "tag-demo.patch"), "utf8");
  assert.match(patch, /-v1\n\+v2/);
  assert.doesNotMatch(patch, /other\.md/);

  // A lock whose hash does not match the recorded commit fails the integrity check.
  await writeFile(
    lockPath,
    JSON.stringify({ ...lock, imports: [{ ...lock.imports[0], sourceHash: `sha256:${"0".repeat(64)}` }] }),
  );
  assert.equal(await main(["--lock", lockPath, "--source-dir", sourceDir]), 1);
});
