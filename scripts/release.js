#!/usr/bin/env node
// Skill package releases (ADR 0005). Builds and checks; never publishes.
//
//   node scripts/release.js check
//       Validate packages/*/plugin.json against the pinned Agent Plugins 1.0.0 schema, TAG's
//       extension schema and the repository (each skill in exactly one package, tiers, changelogs).
//   node scripts/release.js build [--previous-index FILE] [--out DIR] [--commit SHA] [--date ISO]
//       Work out which package versions are new against the previous index, enforce the versioning
//       rules, and write each new version's archive and release notes, the merged index.json and
//       plan.json into DIR (default dist/release). --commit and --date default to HEAD's.
//   node scripts/release.js verify [--out DIR]
//       Extract every archive in DIR with the system tar and check it is a conforming plugin whose
//       checksum and skills match index.json.
//
// The release workflow (.github/workflows/release.yml) runs build and verify on every pull
// request as a dry run, and publishes plan.json's releases only on a push to develop.
// Exit codes: 0 success, 1 findings or errors, 2 usage error.

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { hashDirectory, sha256 } from "./lib/hash.js";
import { checkPackages, loadPackageSchemas, schemaErrors } from "./lib/packages.js";
import { checkRepository } from "./lib/repository.js";
import { emptyIndex, mergeIndex, planReleases, serializeIndex } from "./lib/release.js";
import { validateRoot } from "./lib/validate.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function parse() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        "previous-index": { type: "string" },
        out: { type: "string", default: join(root, "dist", "release") },
        commit: { type: "string" },
        date: { type: "string" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
const parsed = parse();
const [command] = parsed.positionals;
if (parsed.values.help || !["check", "build", "verify"].includes(command ?? "")) {
  console.log("usage: node scripts/release.js check | build [--previous-index FILE] [--out DIR] | verify [--out DIR]");
  process.exit(parsed.values.help ? 0 : 2);
}
const out = resolve(parsed.values.out);

/** @param {{ path: string, message: string }[]} findings */
const report = (findings) => {
  for (const f of findings) console.error(`${relative(process.cwd(), f.path) || f.path}: ${f.message}`);
};

/** Runs the repository and package checks; exits on findings. */
async function check() {
  const { repository, findings: repoFindings } = await checkRepository(root);
  const { packages, findings } = await checkPackages(root, repository);
  report([...repoFindings, ...findings]);
  if (repoFindings.length + findings.length > 0) {
    console.error(`packages: ${repoFindings.length + findings.length} problem(s)`);
    process.exit(1);
  }
  return { repository, packages };
}

/** HEAD's full SHA and commit date (UTC), unless given. */
function context() {
  const git = (/** @type {string[]} */ args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const commit = parsed.values.commit ?? git(["rev-parse", "HEAD"]);
  const date = parsed.values.date ?? new Date(Number(git(["log", "-1", "--format=%ct", commit])) * 1000).toISOString();
  const publishedAt = new Date(date).toISOString().replace(/\.\d{3}Z$/, "Z");
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`--commit must be a full 40-character SHA, not ${commit}`);
  return { commit, publishedAt };
}

/** Prepares an empty output directory; only a directory under dist/ is ever cleared. */
async function prepareOut() {
  let existing = [];
  try {
    existing = await readdir(out);
  } catch {
    // Does not exist yet.
  }
  if (existing.length > 0) {
    if (!out.startsWith(join(root, "dist") + sep)) {
      throw new Error(`${out} is not empty; use an empty directory or one under dist/`);
    }
    await rm(out, { recursive: true });
  }
  await mkdir(out, { recursive: true });
}

if (command === "check") {
  const { packages } = await check();
  for (const pkg of packages) {
    console.log(`${pkg.name}@${pkg.version}: ${pkg.skills.length} skill(s)`);
  }
  console.log(`packages valid: ${packages.length} package(s), Agent Plugins 1.0.0`);
  process.exit(0);
}

if (command === "build") {
  const { repository, packages } = await check();
  const schemas = await loadPackageSchemas(root);
  const previousPath = parsed.values["previous-index"];
  const previous = previousPath ? JSON.parse(await readFile(previousPath, "utf8")) : emptyIndex();
  if (previousPath && !schemas.index(previous)) {
    console.error(`${previousPath}: not a valid release index: ${schemaErrors(schemas.index).join("; ")}`);
    process.exit(1);
  }
  const ctx = context();
  const { releases, pending, errors } = await planReleases(packages, repository, previous, ctx);
  for (const p of pending) console.log(`pending: ${p.package}@${p.version} ${p.message}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`error: ${e}`);
    process.exit(1);
  }
  const index = mergeIndex(previous, releases, packages);
  if (!schemas.index(index)) {
    console.error(`generated index is invalid: ${schemaErrors(schemas.index).join("; ")}`);
    process.exit(1);
  }
  await prepareOut();
  const plan = { commit: ctx.commit, publishedAt: ctx.publishedAt, releases: /** @type {any[]} */ ([]), pending };
  for (const { pkg, entry, archive, notes } of releases) {
    const notesName = `${pkg.name}-${pkg.version}.notes.md`;
    await writeFile(join(out, entry.archive.name), archive);
    await writeFile(join(out, notesName), notes);
    plan.releases.push({
      package: pkg.name,
      version: pkg.version,
      tag: entry.tag,
      title: `${pkg.name} ${pkg.version}`,
      prerelease: entry.prerelease,
      archive: entry.archive.name,
      sha256: entry.archive.sha256,
      notes: notesName,
    });
    console.log(
      `release: ${entry.tag} (${entry.previous ? `from ${entry.previous}${entry.breaking ? ", breaking" : ""}` : "first release"}) ` +
        `${entry.archive.name} sha256:${entry.archive.sha256}`,
    );
  }
  await writeFile(join(out, "index.json"), serializeIndex(index));
  await writeFile(join(out, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`wrote ${relative(process.cwd(), out) || out}: ${releases.length} release(s), index.json, plan.json`);
  process.exit(0);
}

// verify
const schemas = await loadPackageSchemas(root);
const plan = JSON.parse(await readFile(join(out, "plan.json"), "utf8"));
const index = JSON.parse(await readFile(join(out, "index.json"), "utf8"));
/** @type {string[]} */
const problems = [];
if (!schemas.index(index)) problems.push(`index.json: ${schemaErrors(schemas.index).join("; ")}`);
for (const release of plan.releases) {
  const entry = index.packages
    .find((/** @type {any} */ p) => p.name === release.package)
    ?.versions.find((/** @type {any} */ v) => v.version === release.version);
  if (!entry) {
    problems.push(`${release.tag}: not in index.json`);
    continue;
  }
  const bytes = await readFile(join(out, release.archive));
  if (sha256(bytes) !== entry.archive.sha256 || bytes.length !== entry.archive.size) {
    problems.push(`${release.archive}: checksum or size differs from index.json`);
  }
  const work = await mkdtemp(join(tmpdir(), "tag-release-"));
  try {
    execFileSync("tar", ["-xzf", join(out, release.archive), "-C", work]);
    const top = await readdir(work);
    if (top.length !== 1 || top[0] !== release.package) {
      problems.push(`${release.archive}: must hold exactly one top-level directory ${release.package}/`);
      continue;
    }
    const pluginRoot = join(work, release.package);
    const manifest = JSON.parse(await readFile(join(pluginRoot, "plugin.json"), "utf8"));
    if (!schemas.plugin(manifest))
      problems.push(`${release.archive}: plugin.json: ${schemaErrors(schemas.plugin).join("; ")}`);
    if (manifest.name !== release.package || manifest.version !== release.version) {
      problems.push(`${release.archive}: plugin.json names ${manifest.name}@${manifest.version}`);
    }
    const children = (await readdir(join(pluginRoot, "skills"))).sort();
    const expected = entry.skills.map((/** @type {any} */ s) => s.name);
    if (JSON.stringify(children) !== JSON.stringify(expected)) {
      problems.push(`${release.archive}: skills/ holds ${children.join(", ")}, the index lists ${expected.join(", ")}`);
    }
    const { findings } = await validateRoot(join(pluginRoot, "skills"), { layout: "flat" });
    for (const f of findings) problems.push(`${release.archive}: ${relative(work, f.path)}: ${f.message}`);
    for (const skill of entry.skills) {
      const { hash } = await hashDirectory(join(pluginRoot, "skills", skill.name));
      if (hash !== skill.contentHash)
        problems.push(`${release.archive}: ${skill.name} content differs from index.json`);
    }
    console.log(`verified ${release.archive}: ${children.length} skill(s), sha256:${entry.archive.sha256}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}
for (const p of problems) console.error(p);
if (problems.length > 0) process.exit(1);
console.log(`verified ${plan.releases.length} release(s) and index.json`);
