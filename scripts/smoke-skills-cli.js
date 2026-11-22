#!/usr/bin/env node
// Discovery and installation tests with the pinned Vercel Skills CLI (node_modules/.bin/skills,
// installed from package-lock.json; no network install). `npm run test:install`.
//
//  1. Discovery from the repository root lists every published skill under skills/<pillar>/ (all
//     18) and never the test fixture, which is hidden by `metadata.internal: true`.
//  2. Discovery of tests/fixtures with INSTALL_INTERNAL_SKILLS=1 lists the fixture.
//  3. For codex, claude-code and universal, a selected-skill install into a fresh consumer project
//     puts exactly the selected skills where that client reads them, every file byte-for-byte equal
//     to the source (LICENSE, NOTICE.md, tag-skill.json, references, scripts, assets), and nothing
//     unrelated.
//  4. Installing every skill at once for universal: each installed folder hashes like its source.
//  5. The consumer lockfile restores the same content (experimental_install, frozen lockfile).
//  6. The profile installer expands dependencies and installs in copy mode and in symlink mode.
//  7. Installed scripts run from a copy outside this repository, with python3 -I and a bare
//     environment: no access to the source repository's files or development dependencies.
//
// Telemetry is off. HOME and XDG directories are disposable. Everything is under one temporary
// directory, which is removed.

import { execFile } from "node:child_process";
import { cp, lstat, mkdtemp, readdir, readFile, readlink, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify, stripVTControlCharacters } from "node:util";
import { hashDirectory } from "./lib/hash.js";
import { loadRepository } from "./lib/repository.js";

const run = promisify(execFile);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repo, "node_modules", ".bin", "skills");
const fixturesRoot = join(repo, "tests", "fixtures");
const FIXTURE = "tag-test-fixture";
const EXPECTED_SKILLS = 18;

/** Project-level skill directory per client, as the pinned Skills CLI installs them. */
const CLIENTS = { codex: ".agents/skills", "claude-code": ".claude/skills", universal: ".agents/skills" };

/** @param {string} home */
function environment(home, internal = false) {
  return {
    PATH: process.env.PATH ?? "",
    HOME: home,
    XDG_CONFIG_HOME: join(home, ".config"),
    XDG_STATE_HOME: join(home, ".local", "state"),
    XDG_DATA_HOME: join(home, ".local", "share"),
    DISABLE_TELEMETRY: "1",
    DO_NOT_TRACK: "1",
    CI: "1",
    NO_COLOR: "1",
    ...(internal ? { INSTALL_INTERNAL_SKILLS: "1" } : {}),
  };
}

/**
 * Runs a command and returns its exit code and combined output.
 * @param {string} file @param {string[]} args @param {{ cwd: string, env: NodeJS.ProcessEnv }} options
 */
async function exec(file, args, { cwd, env }) {
  try {
    const { stdout, stderr } = await run(file, args, { cwd, env, timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
    return { code: 0, output: stripVTControlCharacters(stdout + stderr) };
  } catch (error) {
    const e = /** @type {{ code?: number, stdout?: string, stderr?: string }} */ (error);
    return {
      code: typeof e.code === "number" ? e.code : 1,
      output: stripVTControlCharacters(`${e.stdout ?? ""}${e.stderr ?? ""}`),
    };
  }
}

/** @param {string} message */
function fail(message) {
  throw new Error(message);
}

/** Matches a skill name as a whole word in CLI output. @param {string} output @param {string} name */
const lists = (output, name) => new RegExp(`(^|[^a-z0-9-])${name}([^a-z0-9-]|$)`, "m").test(output);

/** @param {string} dir */
async function entries(dir) {
  try {
    return (await readdir(dir)).filter((e) => !e.startsWith(".")).sort();
  } catch {
    return [];
  }
}

const { skills: published } = await loadRepository(repo);
const byName = new Map(published.map((s) => [s.name, s]));
if (published.length !== EXPECTED_SKILLS)
  fail(`expected ${EXPECTED_SKILLS} published skills, found ${published.length}`);

const work = await mkdtemp(join(tmpdir(), "tag-skills-install-"));
const home = join(work, "home");
const env = environment(home);
let consumers = 0;
const consumer = async () => {
  const dir = join(work, `consumer-${consumers++}`);
  await cp(join(repo, "tests", "README.md"), join(dir, "README.md")); // creates the directory
  return dir;
};

/**
 * Checks that an installed folder is byte-for-byte the source folder.
 * @param {string} installed @param {string} name
 */
async function sameAsSource(installed, name) {
  const skill = byName.get(name);
  if (!skill) fail(`unknown skill ${name}`);
  const [a, b] = await Promise.all([hashDirectory(installed), hashDirectory(/** @type {any} */ (skill).dir)]);
  if (a.hash !== b.hash) {
    const missing = b.files
      .filter((f) => !a.files.some((g) => g.path === f.path && g.sha256 === f.sha256))
      .map((f) => f.path);
    fail(`${installed} differs from the source (missing or changed: ${missing.join(", ") || "extra files"})`);
  }
}

try {
  // 1. Discovery from the repository root.
  const root = await exec(cli, ["add", repo, "--list"], { cwd: work, env });
  if (root.code !== 0) fail(`discovery from the repository root failed (exit ${root.code}):\n${root.output}`);
  if (lists(root.output, FIXTURE)) fail(`discovery from the repository root exposes the test fixture:\n${root.output}`);
  for (const { name } of published) {
    if (!lists(root.output, name)) fail(`discovery from the repository root does not list "${name}":\n${root.output}`);
  }
  console.log(`ok - repository root lists all ${published.length} published skills and hides the fixture`);

  // 2. Fixture discovery.
  const fixtures = await exec(cli, ["add", fixturesRoot, "--list"], { cwd: work, env: environment(home, true) });
  if (fixtures.code !== 0 || !lists(fixtures.output, FIXTURE))
    fail(`fixture discovery failed (exit ${fixtures.code}):\n${fixtures.output}`);
  console.log(`ok - tests/fixtures lists ${FIXTURE}`);

  // 3. Selected-skill installs per client.
  const selection = ["finance-financial-statements", "finance-journal-entry-prep", "governance-triage-nda"];
  for (const [client, dir] of Object.entries(CLIENTS)) {
    const project = await consumer();
    const install = await exec(cli, ["add", repo, "--skill", ...selection, "--agent", client, "--copy", "--yes"], {
      cwd: project,
      env,
    });
    if (install.code !== 0)
      fail(`installing ${selection.join(", ")} for ${client} failed (exit ${install.code}):\n${install.output}`);
    const installed = await entries(join(project, dir));
    if (JSON.stringify(installed) !== JSON.stringify([...selection].sort())) {
      fail(`${client}: ${dir} holds [${installed.join(", ")}], expected exactly [${selection.join(", ")}]`);
    }
    for (const name of selection) await sameAsSource(join(project, dir, name), name);
    for (const required of [
      "LICENSE",
      "NOTICE.md",
      "tag-skill.json",
      "scripts/build_statements.py",
      "assets/example-input.json",
    ]) {
      await stat(join(project, dir, "finance-financial-statements", required));
    }
    console.log(`ok - ${client}: ${selection.length} selected skills in ${dir}, byte-for-byte, nothing unrelated`);
  }

  // 4. Every skill installs (universal, one command).
  const all = await consumer();
  const everything = await exec(
    cli,
    ["add", repo, "--skill", ...published.map((s) => s.name), "--agent", "universal", "--copy", "--yes"],
    {
      cwd: all,
      env,
    },
  );
  if (everything.code !== 0) fail(`installing every skill failed (exit ${everything.code}):\n${everything.output}`);
  for (const { name } of published) await sameAsSource(join(all, ".agents", "skills", name), name);
  console.log(`ok - all ${published.length} skills install for universal, each identical to its source`);

  // 5. Restore from the consumer lockfile.
  const lock = JSON.parse(await readFile(join(all, "skills-lock.json"), "utf8"));
  if (Object.keys(lock.skills ?? {}).length !== published.length)
    fail("skills-lock.json does not record every installed skill");
  await rm(join(all, ".agents"), { recursive: true, force: true });
  const restore = await exec(cli, ["experimental_install", "--agent", "universal", "--frozen-lockfile"], {
    cwd: all,
    env,
  });
  if (restore.code !== 0) fail(`restoring from skills-lock.json failed (exit ${restore.code}):\n${restore.output}`);
  for (const { name } of published) await sameAsSource(join(all, ".agents", "skills", name), name);
  const after = JSON.parse(await readFile(join(all, "skills-lock.json"), "utf8"));
  if (JSON.stringify(after) !== JSON.stringify(lock)) fail("restoring changed skills-lock.json");
  console.log("ok - skills-lock.json restores every skill unchanged (frozen lockfile)");

  // 6. Profile installer: dependency expansion, copy and symlink modes.
  const installer = join(repo, "scripts", "install-profile.js");
  const copyProject = await consumer();
  const copyRun = await exec(
    process.execPath,
    [
      installer,
      "--source",
      repo,
      "--profile",
      "governance",
      "--agent",
      "claude-code",
      "--mode",
      "copy",
      "--dir",
      copyProject,
    ],
    { cwd: work, env },
  );
  if (copyRun.code !== 0) fail(`profile install (copy) failed (exit ${copyRun.code}):\n${copyRun.output}`);
  const governance = await entries(join(copyProject, ".claude", "skills"));
  const expectedGovernance = published
    .map((s) => s.name)
    .filter((name) => name.startsWith("governance-"))
    .sort();
  if (JSON.stringify(governance) !== JSON.stringify(expectedGovernance)) {
    fail(`profile "governance" installed [${governance.join(", ")}], expected [${expectedGovernance.join(", ")}]`);
  }
  for (const name of governance) {
    if ((await lstat(join(copyProject, ".claude", "skills", name))).isSymbolicLink())
      fail(`copy mode left a symlink for ${name}`);
    await sameAsSource(join(copyProject, ".claude", "skills", name), name);
  }
  console.log(
    `ok - install-profile --profile governance --mode copy: exactly the ${governance.length} governance- skills`,
  );

  const linkProject = await consumer();
  const linkRun = await exec(
    process.execPath,
    [
      installer,
      "--source",
      repo,
      "--skill",
      "finance-close-management",
      "--agent",
      "claude-code",
      "--agent",
      "codex",
      "--mode",
      "symlink",
      "--dir",
      linkProject,
    ],
    { cwd: work, env },
  );
  if (linkRun.code !== 0) fail(`profile install (symlink) failed (exit ${linkRun.code}):\n${linkRun.output}`);
  const expected = [
    "finance-close-management",
    "finance-financial-statements",
    "finance-journal-entry-prep",
    "finance-reconciliation",
  ];
  const linked = await entries(join(linkProject, ".claude", "skills"));
  if (JSON.stringify(linked) !== JSON.stringify(expected))
    fail(`symlink install: .claude/skills holds [${linked.join(", ")}]`);
  for (const name of expected) {
    const link = join(linkProject, ".claude", "skills", name);
    if (!(await lstat(link)).isSymbolicLink()) fail(`symlink mode did not link ${name} for claude-code`);
    const target = resolve(dirname(link), await readlink(link));
    if (target !== join(linkProject, ".agents", "skills", name)) fail(`${name} links to ${target}`);
    await sameAsSource(target, name);
  }
  console.log(
    "ok - install-profile --skill finance-close-management --mode symlink: dependencies expanded, claude-code links to .agents/skills",
  );

  // 7. Installed scripts run outside the repository, without its files or dependencies.
  const isolated = join(work, "isolated");
  await cp(join(all, ".agents", "skills"), isolated, { recursive: true });
  const bare = { PATH: process.env.PATH ?? "" };
  const statements = join(isolated, "finance-financial-statements");
  const fsRun = await exec(
    "python3",
    ["-I", "scripts/build_statements.py", "--input", "assets/example-input.json", "--out-dir", join(work, "fs-out")],
    {
      cwd: statements,
      env: bare,
    },
  );
  if (fsRun.code !== 0) fail(`installed build_statements.py failed (exit ${fsRun.code}):\n${fsRun.output}`);
  const report = JSON.parse(await readFile(join(work, "fs-out", "report.json"), "utf8"));
  const totals = report.statements;
  if (
    totals.income_statement.totals.net_income !== "300.00" ||
    totals.cash_flow_statement.totals.closing_cash !== "1300.00" ||
    totals.balance_sheet.totals.total_equity !== "1300.00"
  ) {
    fail(`installed build_statements.py produced unexpected totals: ${JSON.stringify(totals.income_statement.totals)}`);
  }
  console.log(
    "ok - installed finance-financial-statements script runs in isolation: profit 300, closing cash 1300, equity 1300",
  );

  const entriesSkill = join(isolated, "finance-journal-entry-prep");
  const jeOut = join(work, "je-result.json");
  const jeRun = await exec(
    "python3",
    ["-I", "scripts/check_entries.py", "--input", "assets/example-entries.json", "--out", jeOut],
    {
      cwd: entriesSkill,
      env: bare,
    },
  );
  if (jeRun.code !== 0) fail(`installed check_entries.py failed (exit ${jeRun.code}):\n${jeRun.output}`);
  const je = JSON.parse(await readFile(jeOut, "utf8"));
  if (je.summary.invalid !== 0 || !JSON.stringify(je).includes('"not_posted"')) {
    fail(`installed check_entries.py produced an unexpected result: ${JSON.stringify(je.summary)}`);
  }
  console.log("ok - installed finance-journal-entry-prep script runs in isolation and never posts (not_posted)");
} finally {
  await rm(work, { recursive: true, force: true });
}
