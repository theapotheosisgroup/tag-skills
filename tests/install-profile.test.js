// Unit tests for the profile installer's validation and argument construction. The installation
// itself, against the pinned Skills CLI, is in scripts/smoke-skills-cli.js (npm run test:install).

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { DEFAULT_SOURCE, main, planInstall, remoteHasCommit, remoteUrl } from "../scripts/install-profile.js";
import { loadRepository } from "../scripts/lib/repository.js";

const run = promisify(execFile);
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const repository = await loadRepository(repo);
const HEAD = (await run("git", ["rev-parse", "HEAD"], { cwd: repo })).stdout.trim();
const SHA = "0123456789abcdef0123456789abcdef01234567";

/** @param {Partial<import("../scripts/install-profile.js").InstallOptions>} overrides */
const options = (overrides = {}) => ({
  profiles: [],
  skills: [],
  source: DEFAULT_SOURCE,
  commit: SHA,
  agents: ["universal"],
  dir: "/tmp/consumer",
  mode: /** @type {"copy" | "symlink"} */ ("symlink"),
  ...overrides,
});

describe("planInstall", () => {
  test("expands a profile and its dependencies into one explicit --skill list", () => {
    const plan = planInstall(options({ profiles: ["legal"] }), repository);
    assert.ok(plan.skills.includes("tag-search-strategy"));
    assert.ok(plan.skills.includes("tag-knowledge-synthesis"));
    assert.deepEqual(plan.args.slice(0, 3), ["add", `${DEFAULT_SOURCE}#${SHA}`, "--skill"]);
    assert.deepEqual(plan.args.slice(3, 3 + plan.skills.length), plan.skills);
    assert.deepEqual(plan.args.slice(-3), ["--agent", "universal", "--yes"]);
  });
  test("a single skill brings its declared dependencies", () => {
    const plan = planInstall(options({ skills: ["tag-close-management"] }), repository);
    assert.deepEqual(plan.skills, [
      "tag-close-management",
      "tag-financial-statements",
      "tag-journal-entry-prep",
      "tag-reconciliation",
    ]);
  });
  test("pins a remote source with #ref, which the CLI never reads as a skill filter", () => {
    const plan = planInstall(
      options({ profiles: ["finance-core"], ref: "v0.1.0", agents: ["claude-code", "codex"], mode: "copy" }),
      repository,
    );
    assert.equal(plan.args[1], `${DEFAULT_SOURCE}#v0.1.0`);
    assert.deepEqual(plan.args.slice(-6), ["--agent", "claude-code", "--agent", "codex", "--copy", "--yes"]);
  });
  test("a remote source without --ref needs a full commit to pin to", () => {
    for (const commit of [undefined, "abc123", "HEAD"]) {
      assert.throws(() => planInstall(options({ profiles: ["legal"], commit }), repository), /pass --ref/);
    }
  });
  test("a local source is passed as an absolute path and refuses --ref", () => {
    assert.equal(planInstall(options({ profiles: ["authoring"], source: repo }), repository).args[1], repo);
    assert.throws(
      () => planInstall(options({ profiles: ["authoring"], source: repo, ref: "main" }), repository),
      /--ref applies to a remote source/,
    );
  });
  test("validates before anything runs", () => {
    assert.throws(() => planInstall(options(), repository), /at least one --profile or --skill/);
    assert.throws(() => planInstall(options({ profiles: ["nope"] }), repository), /unknown profile "nope"/);
    assert.throws(() => planInstall(options({ skills: ["tag-nope"] }), repository), /unknown skill "tag-nope"/);
    assert.throws(
      () => planInstall(options({ profiles: ["legal"], mode: /** @type {any} */ ("hardlink") }), repository),
      /--mode/,
    );
    assert.throws(() => planInstall(options({ profiles: ["legal"], agents: ["--all"] }), repository), /invalid agent/);
    assert.throws(() => planInstall(options({ profiles: ["legal"], agents: [] }), repository), /at least one --agent/);
    assert.throws(
      () => planInstall(options({ profiles: ["legal"], source: "https://evil.example/x" }), repository),
      /--source/,
    );
    assert.throws(
      () => planInstall(options({ profiles: ["legal"], ref: "--upload-pack=x" }), repository),
      /invalid --ref/,
    );
    assert.throws(() => planInstall(options({ profiles: ["legal"], ref: "a/../b" }), repository), /invalid --ref/);
  });
  test("warns about agents TAG does not test", () => {
    const plan = planInstall(options({ profiles: ["legal"], agents: ["cursor"] }), repository);
    assert.match(plan.warnings.join(), /"cursor" is passed to the Skills CLI but not tested/);
  });
});

/**
 * Runs main() with console output captured.
 * @param {string[]} argv
 * @param {(url: string, commit: string) => Promise<boolean>} onRemote
 */
async function runMain(argv, onRemote) {
  /** @type {{ url: string, commit: string }[]} */
  const checks = [];
  const log = console.log;
  /** @type {string[]} */
  const lines = [];
  console.log = (/** @type {unknown} */ line) => lines.push(String(line));
  try {
    const code = await main(argv, {
      remoteHasCommit: async (url, commit) => {
        checks.push({ url, commit });
        return onRemote(url, commit);
      },
    });
    return { code, checks, output: lines.join("\n") };
  } finally {
    console.log = log;
  }
}

describe("main", () => {
  test("by default pins the remote install to this checkout's HEAD commit once it is on the remote", async () => {
    const result = await runMain(["--profile", "legal", "--dry-run"], async () => true);
    assert.equal(result.code, 0);
    assert.deepEqual(result.checks, [{ url: remoteUrl(DEFAULT_SOURCE), commit: HEAD }]);
    const plan = JSON.parse(result.output);
    assert.equal(plan.source, `${DEFAULT_SOURCE}#${HEAD}`);
    assert.equal(plan.command[2], `${DEFAULT_SOURCE}#${HEAD}`);
    assert.deepEqual(plan.pin, { commit: HEAD, from: "this checkout's HEAD" });
  });
  test("refuses when this checkout's HEAD commit is not on the remote", async () => {
    await assert.rejects(
      runMain(["--profile", "legal", "--dry-run"], async () => false),
      (/** @type {Error} */ error) =>
        error.message.includes(`HEAD commit ${HEAD} is not on ${DEFAULT_SOURCE}`) &&
        /push the commit/.test(error.message) &&
        /--ref/.test(error.message) &&
        /--source <path>/.test(error.message),
    );
  });
  test("--ref uses #ref, keeps the checkout check and skips the HEAD pin", async () => {
    const pinned = await runMain(["--profile", "legal", "--ref", HEAD, "--dry-run"], async () => false);
    assert.equal(pinned.code, 0);
    assert.deepEqual(pinned.checks, []);
    assert.equal(JSON.parse(pinned.output).source, `${DEFAULT_SOURCE}#${HEAD}`);
    assert.equal(JSON.parse(pinned.output).pin, null);
    await assert.rejects(
      runMain(["--profile", "legal", "--ref", "no-such-ref-here", "--dry-run"], async () => true),
      /this checkout is not at no-such-ref-here.*--allow-ref-mismatch/,
    );
  });
  test("a local path source is neither pinned nor checked against a remote", async () => {
    const result = await runMain(["--profile", "legal", "--source", repo, "--dry-run"], async () => false);
    assert.equal(result.code, 0);
    assert.deepEqual(result.checks, []);
    assert.equal(JSON.parse(result.output).source, repo);
  });
});

describe("remoteHasCommit", () => {
  test("finds commits reachable from the remote's branches and refuses unpushed ones", async () => {
    const work = await mkdtemp(join(tmpdir(), "tag-install-remote-"));
    const local = join(work, "local");
    const bare = join(work, "remote.git");
    const git = (/** @type {string[]} */ ...args) =>
      run("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", ...args], { cwd: local });
    await run("git", ["init", "--quiet", local]);
    await writeFile(join(local, "a.txt"), "a");
    await git("add", "a.txt");
    await git("commit", "--quiet", "-m", "first");
    const first = (await git("rev-parse", "HEAD")).stdout.trim();
    await writeFile(join(local, "a.txt"), "b");
    await git("commit", "--quiet", "-am", "second");
    const second = (await git("rev-parse", "HEAD")).stdout.trim();
    await run("git", ["clone", "--quiet", "--bare", local, bare]);
    await writeFile(join(local, "a.txt"), "c");
    await git("commit", "--quiet", "-am", "unpushed");
    const unpushed = (await git("rev-parse", "HEAD")).stdout.trim();

    assert.equal(await remoteHasCommit(bare, second, local), true);
    assert.equal(await remoteHasCommit(bare, first, local), true);
    assert.equal(await remoteHasCommit(bare, unpushed, local), false);
  });
});
