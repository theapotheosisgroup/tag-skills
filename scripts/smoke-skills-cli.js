#!/usr/bin/env node
// Discovery and installation smoke test with the pinned Vercel Skills CLI (node_modules/.bin/skills,
// installed from package-lock.json; no network install).
//
// 1. Discovery from the repository root lists every published skill under skills/ and never the
//    test fixture, which is hidden by `metadata.internal: true`.
// 2. Discovery of tests/fixtures with INSTALL_INTERNAL_SKILLS=1 lists the fixture.
// 3. Installation into a disposable consumer project, with a disposable HOME, puts each skill where
//    the Claude Code and Codex clients read project skills, byte-for-byte equal to the source.
//
// Telemetry is turned off. Nothing is written outside a temporary directory, which is removed.

import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify, stripVTControlCharacters } from "node:util";

const run = promisify(execFile);
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(repo, "node_modules", ".bin", "skills");
const fixturesRoot = join(repo, "tests", "fixtures");
const FIXTURE = "tag-test-fixture";

/** Project-level skill directory per client, as the pinned Skills CLI installs them. */
const CLIENTS = { "claude-code": ".claude/skills", codex: ".agents/skills" };

/** @param {string} text */
const plain = (text) => stripVTControlCharacters(text);

/**
 * Runs the Skills CLI and returns its exit code and combined output.
 * @param {string[]} args
 * @param {{ cwd: string, home: string, internal?: boolean }} context
 */
async function skills(args, { cwd, home, internal = false }) {
  const env = {
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
  try {
    const { stdout, stderr } = await run(cli, args, { cwd, env, timeout: 120_000 });
    return { code: 0, output: plain(stdout + stderr) };
  } catch (error) {
    const e = /** @type {{ code?: number, stdout?: string, stderr?: string }} */ (error);
    return { code: typeof e.code === "number" ? e.code : 1, output: plain(`${e.stdout ?? ""}${e.stderr ?? ""}`) };
  }
}

/** @param {string} message */
function fail(message) {
  throw new Error(message);
}

/** @param {string} root */
async function skillNames(root) {
  const names = [];
  for (const entry of await readdir(root)) {
    if ((await stat(join(root, entry))).isDirectory()) names.push(entry);
  }
  return names.sort();
}

/** Matches a skill name as a whole word in CLI output. @param {string} output @param {string} name */
const lists = (output, name) => new RegExp(`(^|[^a-z0-9-])${name}([^a-z0-9-]|$)`, "m").test(output);

const work = await mkdtemp(join(tmpdir(), "tag-skills-smoke-"));
try {
  const home = join(work, "home");
  const published = await skillNames(join(repo, "skills"));

  // 1. Repository root: published skills only, never the fixture.
  const root = await skills(["add", repo, "--list"], { cwd: work, home });
  if (lists(root.output, FIXTURE)) fail(`discovery from the repository root exposes the test fixture:\n${root.output}`);
  for (const name of published) {
    if (!lists(root.output, name)) fail(`discovery from the repository root does not list "${name}":\n${root.output}`);
  }
  if (published.length > 0 && root.code !== 0)
    fail(`discovery from the repository root failed (exit ${root.code}):\n${root.output}`);
  console.log(`ok - repository root lists ${published.length} published skill(s) and hides the fixture`);

  // 2. Fixture discovery.
  const fixtures = await skills(["add", fixturesRoot, "--list"], { cwd: work, home, internal: true });
  if (fixtures.code !== 0 || !lists(fixtures.output, FIXTURE)) {
    fail(`fixture discovery failed (exit ${fixtures.code}):\n${fixtures.output}`);
  }
  console.log(`ok - tests/fixtures lists ${FIXTURE}`);

  // 3. Installation into a disposable consumer project.
  const targets = [
    { source: fixturesRoot, name: FIXTURE, sourceDir: join(fixturesRoot, "skills", FIXTURE), internal: true },
    ...published.map((name) => ({ source: repo, name, sourceDir: join(repo, "skills", name), internal: false })),
  ];
  for (const [client, dir] of Object.entries(CLIENTS)) {
    for (const target of targets) {
      const consumer = await mkdtemp(join(work, "consumer-"));
      const install = await skills(
        ["add", target.source, "--skill", target.name, "--agent", client, "--copy", "--yes"],
        {
          cwd: consumer,
          home,
          internal: target.internal,
        },
      );
      if (install.code !== 0)
        fail(`installing ${target.name} for ${client} failed (exit ${install.code}):\n${install.output}`);
      const installed = join(consumer, dir, target.name, "SKILL.md");
      let copy;
      try {
        copy = await readFile(installed);
      } catch {
        fail(
          `installing ${target.name} for ${client} did not create ${dir}/${target.name}/SKILL.md:\n${install.output}`,
        );
      }
      const original = await readFile(join(target.sourceDir, "SKILL.md"));
      if (!copy || !original.equals(copy)) fail(`${dir}/${target.name}/SKILL.md differs from the source`);
      console.log(`ok - ${target.name} installs for ${client} into ${dir}/${target.name}`);
    }
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
