#!/usr/bin/env node
// Installs a TAG profile (or explicit skills) with the pinned Skills CLI, expanding TAG skill
// dependencies first. The Skills CLI does not read tag-skill.json, so a profile's dependencies are
// resolved here and passed as an explicit --skill list.
//
//   node scripts/install-profile.js --profile finance-core [--profile ...] [--skill tag-x ...]
//       [--source theapotheosisgroup/tag-skills | <local path>] [--ref <tag | commit | branch>]
//       [--agent universal] [--agent claude-code ...] [--dir <consumer project>]
//       [--mode copy | symlink] [--dry-run] [--allow-ref-mismatch]
//
// Defaults: source theapotheosisgroup/tag-skills, agent universal, dir the current directory,
// mode symlink (the CLI's default). Dependency metadata comes from this checkout, so a remote install
// is always pinned to a revision that matches it: without --ref, to this checkout's HEAD commit
// (<owner>/<repo>#<40-character sha>), which must already be on the remote (push it, pass --ref,
// or install from --source <local path>); with --ref, the checkout must be at that revision (or
// pass --allow-ref-mismatch knowingly). A local path source is installed as it is.
//
// Validation runs before the CLI is invoked, and the CLI is run with an argument array (no shell).
// Existing Git, SSH or GitHub credentials are used by the CLI as they are; nothing here reads,
// stores or passes a credential. Telemetry is turned off.

import { execFile, spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { expandProfiles, expandSkills, loadRepository } from "./lib/repository.js";

const run = promisify(execFile);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_SOURCE = "theapotheosisgroup/tag-skills";
/** Agents whose project paths TAG tests (docs/INSTALLING.md). Others are passed through with a warning. */
export const TESTED_AGENTS = ["universal", "claude-code", "codex"];
const AGENT = /^[a-z0-9][a-z0-9-]*$/;
const REF = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const GITHUB_SHORTHAND = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const COMMIT = /^[0-9a-f]{40}$/;

/** @param {string} source */
export const isLocalSource = (source) => isAbsolute(source) || source.startsWith(".");

/**
 * @typedef {object} InstallOptions
 * @property {string[]} profiles
 * @property {string[]} skills
 * @property {string} source
 * @property {string} [ref]
 * @property {string} [commit]  this checkout's HEAD commit; pins a remote source when --ref is absent
 * @property {string[]} agents
 * @property {string} dir
 * @property {"copy" | "symlink"} mode
 */

/**
 * Validates options and returns the expanded skill list and the CLI arguments.
 * @param {InstallOptions} options
 * @param {import("./lib/repository.js").Repository} repository
 * @returns {{ skills: string[], args: string[], warnings: string[] }}
 */
export function planInstall(options, repository) {
  /** @type {string[]} */
  const warnings = [];
  if (options.profiles.length === 0 && options.skills.length === 0) {
    throw new Error("name at least one --profile or --skill");
  }
  if (!["copy", "symlink"].includes(options.mode))
    throw new Error(`--mode must be copy or symlink, got "${options.mode}"`);
  if (options.agents.length === 0) throw new Error("name at least one --agent");
  for (const agent of options.agents) {
    if (!AGENT.test(agent)) throw new Error(`invalid agent name "${agent}"`);
    if (!TESTED_AGENTS.includes(agent))
      warnings.push(`agent "${agent}" is passed to the Skills CLI but not tested by TAG`);
  }
  const local = isLocalSource(options.source);
  if (!local && !GITHUB_SHORTHAND.test(options.source)) {
    throw new Error(`--source must be <owner>/<repo> or a local path, got "${options.source}"`);
  }
  if (options.ref !== undefined) {
    if (local) throw new Error("--ref applies to a remote source; check out the revision locally instead");
    if (!REF.test(options.ref) || options.ref.includes("..")) throw new Error(`invalid --ref "${options.ref}"`);
  } else if (!local && !(options.commit && COMMIT.test(options.commit))) {
    throw new Error("could not resolve this checkout's HEAD commit to pin the remote source; pass --ref");
  }
  const bySkill = new Map(repository.skills.map((s) => [s.name, s]));
  const fromProfiles = options.profiles.length
    ? expandProfiles(options.profiles, repository.profiles, repository.skills)
    : [];
  const skills = expandSkills([...fromProfiles, ...options.skills], bySkill);
  // `#ref` is unambiguous for every ref; `@ref` would be read as a skill filter unless it is a
  // version tag or a full commit SHA.
  const sourceSpec = local ? resolve(options.source) : `${options.source}#${options.ref ?? options.commit}`;
  const args = ["add", sourceSpec, "--skill", ...skills];
  for (const agent of options.agents) args.push("--agent", agent);
  if (options.mode === "copy") args.push("--copy");
  args.push("--yes");
  return { skills, args, warnings };
}

/** @param {string} source  a validated <owner>/<repo> */
export const remoteUrl = (source) => `https://github.com/${source}.git`;

/**
 * Whether a commit is reachable from a branch or tag of the remote repository. The remote tips are
 * listed with git ls-remote; ancestry is checked against the objects in `cwd`, so a tip this
 * checkout has not fetched counts as not containing the commit.
 * @param {string} url
 * @param {string} commit
 * @param {string} [cwd]
 */
export async function remoteHasCommit(url, commit, cwd = repo) {
  const { stdout } = await run("git", ["ls-remote", "--heads", "--tags", url], { cwd });
  const tips = new Set(
    stdout
      .split("\n")
      .map((line) => line.split("\t")[0])
      .filter(Boolean),
  );
  if (tips.has(commit)) return true;
  for (const tip of tips) {
    try {
      await run("git", ["merge-base", "--is-ancestor", commit, tip], { cwd });
      return true;
    } catch {
      // not an ancestor, or the tip is not in this checkout
    }
  }
  return false;
}

/**
 * Resolves a ref to a commit in this checkout, or null when it is unknown here.
 * @param {string} ref
 */
async function localCommit(ref) {
  try {
    const { stdout } = await run("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], { cwd: repo });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * @param {string[]} argv
 * @param {{ remoteHasCommit?: (url: string, commit: string) => Promise<boolean> }} [deps]
 */
export async function main(argv, { remoteHasCommit: onRemote = remoteHasCommit } = {}) {
  const { values } = parseArgs({
    args: argv,
    options: {
      profile: { type: "string", multiple: true, default: [] },
      skill: { type: "string", multiple: true, default: [] },
      source: { type: "string", default: DEFAULT_SOURCE },
      ref: { type: "string" },
      agent: { type: "string", multiple: true, default: [] },
      dir: { type: "string", default: process.cwd() },
      mode: { type: "string", default: "symlink" },
      "dry-run": { type: "boolean", default: false },
      "allow-ref-mismatch": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) {
    console.log(
      "usage: node scripts/install-profile.js --profile <name> [--skill <name>] [--source <owner/repo|path>] " +
        "[--ref <ref>] [--agent <agent>] [--dir <project>] [--mode copy|symlink] [--dry-run]",
    );
    return 0;
  }
  const repository = await loadRepository(repo);
  /** @type {InstallOptions} */
  const options = {
    profiles: values.profile ?? [],
    skills: values.skill ?? [],
    source: values.source ?? DEFAULT_SOURCE,
    ref: values.ref,
    agents: values.agent && values.agent.length > 0 ? values.agent : ["universal"],
    dir: resolve(values.dir ?? process.cwd()),
    mode: /** @type {"copy" | "symlink"} */ (values.mode),
  };
  const pinToHead = !isLocalSource(options.source) && options.ref === undefined;
  if (pinToHead) options.commit = (await localCommit("HEAD")) ?? undefined;
  const plan = planInstall(options, repository);
  for (const warning of plan.warnings) console.error(`warning: ${warning}`);

  if (options.ref !== undefined) {
    const [head, target] = await Promise.all([localCommit("HEAD"), localCommit(options.ref)]);
    if (head === null || target === null || head !== target) {
      const message = `this checkout is not at ${options.ref}, so its dependency metadata may not match what will be installed`;
      if (!values["allow-ref-mismatch"])
        throw new Error(`${message}; check out ${options.ref} or pass --allow-ref-mismatch`);
      console.error(`warning: ${message}`);
    }
  }
  if (pinToHead && options.commit && !(await onRemote(remoteUrl(options.source), options.commit))) {
    throw new Error(
      `this checkout's HEAD commit ${options.commit} is not on ${options.source}, so the install cannot be pinned ` +
        "to the revision its dependency metadata came from; push the commit (or git fetch if it is already " +
        "pushed), pass --ref <ref>, or install from a local checkout with --source <path>",
    );
  }
  if (values["dry-run"]) {
    const pin = pinToHead ? { commit: options.commit, from: "this checkout's HEAD" } : null;
    console.log(
      JSON.stringify(
        { dir: options.dir, source: plan.args[1], pin, skills: plan.skills, command: ["skills", ...plan.args] },
        null,
        2,
      ),
    );
    return 0;
  }
  const dirStat = await stat(options.dir).catch(() => null);
  if (!dirStat?.isDirectory()) throw new Error(`--dir ${options.dir} is not a directory`);

  const cli = join(repo, "node_modules", ".bin", "skills");
  console.error(`installing ${plan.skills.length} skill(s) into ${options.dir}: ${plan.skills.join(", ")}`);
  return await new Promise((resolveExit) => {
    const child = spawn(cli, plan.args, {
      cwd: options.dir,
      stdio: "inherit",
      env: { ...process.env, DISABLE_TELEMETRY: "1", DO_NOT_TRACK: "1" },
    });
    child.on("close", (code) => resolveExit(code ?? 1));
    child.on("error", (error) => {
      console.error(`could not run ${cli}: ${error.message} (run npm ci first)`);
      resolveExit(1);
    });
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
