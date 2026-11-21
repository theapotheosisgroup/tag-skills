#!/usr/bin/env node
// Compares each forked skill's upstream folder with the record in upstreams.lock.json.
//
//   node scripts/upstream-check.js [--ref <ref>] [--source <key>] [--diff-dir <dir>]
//                                  [--source-dir <key>=<path>] [--lock <path>] [--fail-on-change]
//
// For every source in the lock it obtains the recorded commit (a shallow fetch into a temporary
// repository, or an existing local clone given with --source-dir) and:
//   1. verifies that each import's folder still hashes to the recorded sourceHash (integrity of the
//      record: a mismatch exits 1);
//   2. with --ref (a branch, tag or commit; default: the source's default branch HEAD), hashes the
//      same folders at that ref and reports which changed, and with --diff-dir writes one proposed
//      patch per changed import (git diff <recorded commit> <ref> -- <folder>).
//
// The patches show upstream changes only. Apply them to the TAG folder by hand, through review,
// keeping TAG's adaptations, then rerun the affected evaluations and update the lock entry. Never
// install an upstream collection over skills/.
//
// Needs git and network access to GitHub unless every source is given with --source-dir. CI does not
// run it; it is a maintenance command (`npm run upstream:check`).

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { hashFileList, sha256 } from "./lib/hash.js";

const run = promisify(execFile);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Runs git with an argument array.
 * @param {string[]} args
 * @param {string} cwd
 * @param {"utf8" | "buffer"} [encoding]
 */
async function git(args, cwd, encoding = "utf8") {
  const { stdout } = await run("git", args, {
    cwd,
    encoding: encoding === "buffer" ? "buffer" : "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
  return stdout;
}

/**
 * Hashes the files under `path` at `commit` without checking anything out.
 * @param {string} dir   git repository
 * @param {string} commit
 * @param {string} path  folder inside the repository
 */
export async function hashAt(dir, commit, path) {
  const listing = /** @type {string} */ (await git(["ls-tree", "-r", "-z", "--name-only", commit, "--", path], dir));
  const files = [];
  for (const name of listing.split("\0").filter(Boolean)) {
    const content = /** @type {Buffer} */ (await git(["show", `${commit}:${name}`], dir, "buffer"));
    files.push({ path: name.slice(path.length + 1), sha256: sha256(content) });
  }
  return { hash: hashFileList(files), count: files.length };
}

/**
 * @param {string[]} argv
 */
export async function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      ref: { type: "string" },
      source: { type: "string" },
      "diff-dir": { type: "string" },
      "source-dir": { type: "string", multiple: true, default: [] },
      lock: { type: "string" },
      "fail-on-change": { type: "boolean", default: false },
    },
  });
  const lockPath = resolve(values.lock ?? join(repo, "upstreams.lock.json"));
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  /** @type {Map<string, string>} */
  const localDirs = new Map();
  for (const pair of values["source-dir"] ?? []) {
    const at = pair.lastIndexOf("=");
    if (at <= 0) throw new Error(`--source-dir expects <key>=<path>, got "${pair}"`);
    localDirs.set(pair.slice(0, at), resolve(pair.slice(at + 1)));
  }
  const work = await mkdtemp(join(tmpdir(), "tag-skills-upstream-"));
  let integrityFailures = 0;
  let changes = 0;
  try {
    for (const [key, source] of Object.entries(lock.sources)) {
      if (values.source && values.source !== key) continue;
      const imports = lock.imports.filter((/** @type {{ source: string }} */ i) => i.source === key);
      if (imports.length === 0) continue;
      let dir = localDirs.get(key);
      if (!dir) {
        dir = join(work, key.replace(/[^a-z0-9]+/gi, "_"));
        await mkdir(dir, { recursive: true });
        await git(["init", "-q"], dir);
        await git(["fetch", "-q", "--depth", "1", source.url, source.commit], dir);
      }
      let target = null;
      if (values.ref !== undefined || !localDirs.has(key)) {
        const ref = values.ref ?? "HEAD";
        if (localDirs.has(key)) {
          target = /** @type {string} */ (await git(["rev-parse", `${ref}^{commit}`], dir)).trim();
        } else {
          await git(["fetch", "-q", "--depth", "1", source.url, ref], dir);
          target = /** @type {string} */ (await git(["rev-parse", "FETCH_HEAD"], dir)).trim();
        }
      }
      console.log(`${key}: recorded ${source.commit}${target ? `, comparing with ${target}` : ""}`);
      for (const entry of imports) {
        const recorded = await hashAt(dir, entry.commit, entry.path);
        if (recorded.hash !== entry.sourceHash) {
          integrityFailures++;
          console.error(
            `  FAIL ${entry.tagName}: ${entry.path} at ${entry.commit} is ${recorded.hash}, lock says ${entry.sourceHash}`,
          );
          continue;
        }
        if (!target || target === entry.commit) {
          console.log(`  ok   ${entry.tagName}: record verified`);
          continue;
        }
        const current = await hashAt(dir, target, entry.path);
        if (current.count === 0) {
          changes++;
          console.log(`  GONE ${entry.tagName}: ${entry.path} no longer exists at ${target}`);
        } else if (current.hash === entry.sourceHash) {
          console.log(`  ok   ${entry.tagName}: unchanged upstream`);
        } else {
          changes++;
          console.log(`  CHANGED ${entry.tagName}: ${entry.path} (${current.hash})`);
          if (values["diff-dir"]) {
            const out = resolve(values["diff-dir"]);
            await mkdir(out, { recursive: true });
            const patch = /** @type {string} */ (await git(["diff", entry.commit, target, "--", entry.path], dir));
            const file = join(out, `${entry.tagName}.patch`);
            await writeFile(file, patch);
            console.log(`       proposed upstream diff: ${file}`);
          }
        }
      }
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }
  if (integrityFailures > 0) {
    console.error(`${integrityFailures} import record(s) do not match their recorded upstream content`);
    return 1;
  }
  console.log(`${changes} upstream change(s) to review`);
  return changes > 0 && values["fail-on-change"] ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
