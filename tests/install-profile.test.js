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
import {
  DEFAULT_SOURCE,
  listRemoteTips,
  main,
  planInstall,
  remoteHasCommit,
  RemoteUnreachableError,
} from "../scripts/install-profile.js";
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
    const plan = planInstall(options({ profiles: ["governance"] }), repository);
    assert.ok(plan.skills.includes("governance-search-strategy"));
    assert.ok(plan.skills.includes("governance-knowledge-synthesis"));
    assert.deepEqual(plan.args.slice(0, 3), ["add", `${DEFAULT_SOURCE}#${SHA}`, "--skill"]);
    assert.deepEqual(plan.args.slice(3, 3 + plan.skills.length), plan.skills);
    assert.deepEqual(plan.args.slice(-3), ["--agent", "universal", "--yes"]);
  });
  test("a single skill brings its declared dependencies", () => {
    const plan = planInstall(options({ skills: ["finance-close-management"] }), repository);
    assert.deepEqual(plan.skills, [
      "finance-close-management",
      "finance-financial-statements",
      "finance-journal-entry-prep",
      "finance-reconciliation",
    ]);
  });
  test("pins a remote source with #ref, which the CLI never reads as a skill filter", () => {
    const plan = planInstall(
      options({ profiles: ["finance"], ref: "v0.1.0", agents: ["claude-code", "codex"], mode: "copy" }),
      repository,
    );
    assert.equal(plan.args[1], `${DEFAULT_SOURCE}#v0.1.0`);
    assert.deepEqual(plan.args.slice(-6), ["--agent", "claude-code", "--agent", "codex", "--copy", "--yes"]);
  });
  test("a remote source without --ref needs a full commit to pin to", () => {
    for (const commit of [undefined, "abc123", "HEAD"]) {
      assert.throws(() => planInstall(options({ profiles: ["governance"], commit }), repository), /pass --ref/);
    }
  });
  test("a local source is passed as an absolute path and refuses --ref", () => {
    assert.equal(planInstall(options({ profiles: ["finance"], source: repo }), repository).args[1], repo);
    assert.throws(
      () => planInstall(options({ profiles: ["finance"], source: repo, ref: "main" }), repository),
      /--ref applies to a remote source/,
    );
  });
  test("validates before anything runs", () => {
    assert.throws(() => planInstall(options(), repository), /at least one --profile or --skill/);
    assert.throws(() => planInstall(options({ profiles: ["nope"] }), repository), /unknown profile "nope"/);
    assert.throws(() => planInstall(options({ skills: ["tag-nope"] }), repository), /unknown skill "tag-nope"/);
    assert.throws(
      () => planInstall(options({ profiles: ["governance"], mode: /** @type {any} */ ("hardlink") }), repository),
      /--mode/,
    );
    assert.throws(
      () => planInstall(options({ profiles: ["governance"], agents: ["--all"] }), repository),
      /invalid agent/,
    );
    assert.throws(
      () => planInstall(options({ profiles: ["governance"], agents: [] }), repository),
      /at least one --agent/,
    );
    assert.throws(
      () => planInstall(options({ profiles: ["governance"], source: "https://evil.example/x" }), repository),
      /--source/,
    );
    assert.throws(
      () => planInstall(options({ profiles: ["governance"], ref: "--upload-pack=x" }), repository),
      /invalid --ref/,
    );
    assert.throws(() => planInstall(options({ profiles: ["governance"], ref: "a/../b" }), repository), /invalid --ref/);
  });
  test("warns about agents TAG does not test", () => {
    const plan = planInstall(options({ profiles: ["governance"], agents: ["cursor"] }), repository);
    assert.match(plan.warnings.join(), /"cursor" is passed to the Skills CLI but not tested/);
  });
});

/**
 * Runs main() with console output captured.
 * @param {string[]} argv
 * @param {(source: string, commit: string) => Promise<boolean>} onRemote
 * @param {string[]} [uncommitted]  paths the injected status check reports under skills/ and profiles/
 */
async function runMain(argv, onRemote, uncommitted = []) {
  /** @type {{ source: string, commit: string }[]} */
  const checks = [];
  const log = console.log;
  /** @type {string[]} */
  const lines = [];
  console.log = (/** @type {unknown} */ line) => lines.push(String(line));
  try {
    const code = await main(argv, {
      remoteHasCommit: async (source, commit) => {
        checks.push({ source, commit });
        return onRemote(source, commit);
      },
      uncommittedMetadata: async () => uncommitted,
    });
    return { code, checks, output: lines.join("\n") };
  } finally {
    console.log = log;
  }
}

const missingDir = join(tmpdir(), "tag-install-no-such-dir", String(process.pid));
const remedies = (/** @type {string} */ message) =>
  /push the commit/.test(message) && /--ref/.test(message) && /--source <path>/.test(message);

describe("main", () => {
  test("by default pins the remote install to this checkout's HEAD commit; --dry-run says it is unverified", async () => {
    const result = await runMain(["--profile", "governance", "--dry-run"], async () => false);
    assert.equal(result.code, 0);
    assert.deepEqual(result.checks, []);
    const plan = JSON.parse(result.output);
    assert.equal(plan.source, `${DEFAULT_SOURCE}#${HEAD}`);
    assert.equal(plan.command[2], `${DEFAULT_SOURCE}#${HEAD}`);
    assert.deepEqual(plan.pin, { commit: HEAD, from: "this checkout's HEAD", remote_verified: false });
    assert.deepEqual(plan.metadata_uncommitted, []);
  });
  test("an install checks the HEAD commit on the remote before going further", async () => {
    /** @type {{ source: string, commit: string }[]} */
    const checks = [];
    const result = runMain(["--profile", "governance", "--dir", missingDir], async (source, commit) => {
      checks.push({ source, commit });
      return true;
    });
    await assert.rejects(result, /is not a directory/);
    assert.deepEqual(checks, [{ source: DEFAULT_SOURCE, commit: HEAD }]);
  });
  test("refuses a remote install when skills/ or profiles/ have uncommitted changes", async () => {
    const dirty = ["profiles/governance.json"];
    await assert.rejects(
      runMain(["--profile", "governance", "--dir", missingDir], async () => true, dirty),
      (/** @type {Error} */ error) =>
        error.message.includes("uncommitted changes (profiles/governance.json)") &&
        /commit and push/.test(error.message) &&
        /--source <path>/.test(error.message) &&
        !/--allow-ref-mismatch/.test(error.message),
    );
    await assert.rejects(
      runMain(["--profile", "governance", "--allow-ref-mismatch", "--dir", missingDir], async () => true, dirty),
      /uncommitted changes/,
    );
    await assert.rejects(
      runMain(["--profile", "governance", "--ref", HEAD, "--dir", missingDir], async () => true, dirty),
      /uncommitted changes.*--allow-ref-mismatch/,
    );
    await assert.rejects(
      runMain(
        ["--profile", "governance", "--ref", HEAD, "--allow-ref-mismatch", "--dir", missingDir],
        async () => true,
        dirty,
      ),
      /is not a directory/,
    );
  });
  test("--dry-run with uncommitted metadata proceeds and reports it", async () => {
    const result = await runMain(["--profile", "governance", "--dry-run"], async () => true, [
      "skills/governance/x/tag-skill.json",
    ]);
    assert.equal(result.code, 0);
    assert.deepEqual(JSON.parse(result.output).metadata_uncommitted, ["skills/governance/x/tag-skill.json"]);
  });
  test("a local path source ignores uncommitted metadata", async () => {
    const result = await runMain(["--profile", "governance", "--source", repo, "--dry-run"], async () => true, ["x"]);
    assert.deepEqual(JSON.parse(result.output).metadata_uncommitted, []);
  });
  test("refuses when this checkout's HEAD commit is not on the remote", async () => {
    /** @type {{ source: string, commit: string }[]} */
    const checks = [];
    await assert.rejects(
      runMain(["--profile", "governance", "--dir", missingDir], async (source, commit) => {
        checks.push({ source, commit });
        return false;
      }),
      (/** @type {Error} */ error) =>
        error.message.includes(`HEAD commit ${HEAD} is not on ${DEFAULT_SOURCE}`) && remedies(error.message),
    );
    assert.deepEqual(checks, [{ source: DEFAULT_SOURCE, commit: HEAD }]);
  });
  test("refuses with the cause when the remote cannot be reached or authenticated", async () => {
    await assert.rejects(
      runMain(["--profile", "governance", "--dir", missingDir], async () => {
        throw new RemoteUnreachableError("ssh: Permission denied (publickey)");
      }),
      (/** @type {Error} */ error) =>
        /could not be reached or authenticated/.test(error.message) &&
        error.message.includes("Permission denied (publickey)") &&
        remedies(error.message),
    );
  });
  test("--ref uses #ref, keeps the checkout check and skips the HEAD pin", async () => {
    const pinned = await runMain(["--profile", "governance", "--ref", HEAD, "--dry-run"], async () => false);
    assert.equal(pinned.code, 0);
    assert.deepEqual(pinned.checks, []);
    assert.equal(JSON.parse(pinned.output).source, `${DEFAULT_SOURCE}#${HEAD}`);
    assert.equal(JSON.parse(pinned.output).pin, null);
    await assert.rejects(
      runMain(["--profile", "governance", "--ref", "no-such-ref-here", "--dry-run"], async () => true),
      /this checkout is not at no-such-ref-here.*--allow-ref-mismatch/,
    );
  });
  test("a local path source is neither pinned nor checked against a remote", async () => {
    const result = await runMain(["--profile", "governance", "--source", repo, "--dry-run"], async () => false);
    assert.equal(result.code, 0);
    assert.deepEqual(result.checks, []);
    assert.equal(JSON.parse(result.output).source, repo);
  });
});

describe("remoteHasCommit", async () => {
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
  const missing = join(work, "missing.git");

  test("finds commits reachable from the remote's branches and refuses unpushed ones", async () => {
    assert.equal(await remoteHasCommit([bare], second, { cwd: local }), true);
    assert.equal(await remoteHasCommit([bare], first, { cwd: local }), true);
    assert.equal(await remoteHasCommit([bare], unpushed, { cwd: local }), false);
  });
  test("falls back to the next URL when the first cannot be read", async () => {
    /** @type {string[]} */
    const tried = [];
    const listTips = async (/** @type {string} */ url, /** @type {string} */ cwd) => {
      tried.push(url);
      if (url.startsWith("https://"))
        throw Object.assign(new Error("failed"), { stderr: "fatal: Authentication failed" });
      return listRemoteTips(bare, cwd);
    };
    const urls = ["https://github.com/o/r.git", "git@github.com:o/r.git"];
    assert.equal(await remoteHasCommit(urls, second, { cwd: local, listTips }), true);
    assert.deepEqual(tried, urls);
  });
  test("reports an unreachable remote, with each URL's cause, instead of 'not on the remote'", async () => {
    await assert.rejects(
      remoteHasCommit([missing, join(work, "also-missing.git")], second, { cwd: local }),
      (/** @type {Error} */ error) =>
        error instanceof RemoteUnreachableError &&
        error.message.includes(missing) &&
        error.message.includes("also-missing.git"),
    );
  });
});
