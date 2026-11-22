// Package releases: version rules, the package archive and the release index (ADR 0005).
//
// Everything is a pure function of the repository tree, the previous index, the commit and its
// date, so the same inputs always produce byte-identical archives and index. Nothing here touches
// the network or GitHub; the release workflow publishes what this module builds.

import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { hashDirectory, listFiles, sha256 } from "./hash.js";
import { REPOSITORY } from "./catalog.js";
import {
  AGENT_PLUGINS_VERSION,
  PLUGIN_SCHEMA_ID,
  SEMVER,
  TIERS,
  changelogSection,
  packageDependencies,
  skillOwners,
  skillsByTier,
  tierRank,
} from "./packages.js";
import { tarGzip } from "./tar.js";

/** @typedef {import("./packages.js").Package} Package */
/** @typedef {import("./repository.js").Repository} Repository */

export const INDEX_RELEASE_TAG = "skills-index";
export const INDEX_ASSET = "index.json";
export const INDEX_URL = `https://github.com/${REPOSITORY}/releases/download/${INDEX_RELEASE_TAG}/${INDEX_ASSET}`;

/** Side-effect levels, least to most consequential (schemas/tag-skill.schema.json). */
const SIDE_EFFECTS = ["none", "read", "draft", "authorized-write"];
/** Change levels, least to most severe. */
export const LEVELS = /** @type {const} */ (["fix", "feature", "breaking"]);
/** @typedef {(typeof LEVELS)[number]} Level */

// ---------------------------------------------------------------------------------------------
// Semantic versions

/** @param {string} version */
export function parseSemver(version) {
  const match = SEMVER.exec(version);
  if (!match) throw new Error(`not a semantic version: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ? match[4].split(".") : [],
  };
}

/**
 * Orders two semantic versions (SemVer 2.0.0 precedence).
 * @param {string} a @param {string} b
 * @returns {number} negative, zero or positive
 */
export function compareSemver(a, b) {
  const x = parseSemver(a);
  const y = parseSemver(b);
  for (const key of /** @type {const} */ (["major", "minor", "patch"])) {
    if (x[key] !== y[key]) return x[key] - y[key];
  }
  if (x.pre.length === 0 || y.pre.length === 0) return y.pre.length - x.pre.length;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    if (i >= x.pre.length) return -1;
    if (i >= y.pre.length) return 1;
    const p = x.pre[i];
    const q = y.pre[i];
    const pn = /^\d+$/.test(p);
    const qn = /^\d+$/.test(q);
    if (pn && qn && Number(p) !== Number(q)) return Number(p) - Number(q);
    if (pn !== qn) return pn ? -1 : 1;
    if (p !== q) return p < q ? -1 : 1;
  }
  return 0;
}

/**
 * The level a version increase signals: a major bump, or a minor bump while the major version is 0,
 * is breaking; a minor bump from 1.0.0 on is a feature; anything else is a fix.
 * @param {string} previous @param {string} next
 * @returns {Level}
 */
export function versionLevel(previous, next) {
  if (compareSemver(next, previous) <= 0) throw new Error(`${next} is not greater than ${previous}`);
  const a = parseSemver(previous);
  const b = parseSemver(next);
  if (b.major !== a.major) return "breaking";
  if (b.minor !== a.minor) return a.major === 0 ? "breaking" : "feature";
  return "fix";
}

/**
 * Whether going from `previous` to `next` is a large enough bump for a change of `level`.
 * While the major version is 0, any bump covers a feature (SemVer item 4).
 * @param {Level} level @param {string} previous @param {string} next
 */
export function bumpCovers(level, previous, next) {
  const signalled = versionLevel(previous, next);
  if (level === "breaking") return signalled === "breaking";
  if (level === "feature") return parseSemver(previous).major === 0 || signalled !== "fix";
  return true;
}

/**
 * Whether `version` satisfies the caret range `^floor`: at least the floor, on the floor's
 * compatible line (same major from 1.0.0, same minor below it, same patch below 0.1.0), and a
 * pre-release only of the floor's own major.minor.patch.
 * @param {string} version @param {string} range
 */
export function satisfiesCaret(version, range) {
  if (!range.startsWith("^")) return false;
  const floor = parseSemver(range.slice(1));
  const v = parseSemver(version);
  if (compareSemver(version, range.slice(1)) < 0) return false;
  const sameTuple = v.major === floor.major && v.minor === floor.minor && v.patch === floor.patch;
  if (v.pre.length > 0 && !sameTuple) return false;
  if (v.major !== floor.major) return false;
  if (floor.major > 0) return true;
  if (v.minor !== floor.minor) return false;
  return floor.minor > 0 || v.patch === floor.patch;
}

/** @param {any[]} versions @returns {any} */
const latest = (versions) =>
  versions.length > 0 ? versions.reduce((a, b) => (compareSemver(a.version, b.version) > 0 ? a : b)) : null;

/** @param {Level[]} levels @returns {Level | null} */
const highest = (levels) =>
  levels.reduce(
    (/** @type {Level | null} */ top, level) =>
      top === null || LEVELS.indexOf(level) > LEVELS.indexOf(top) ? level : top,
    null,
  );

// ---------------------------------------------------------------------------------------------
// Index entries

/**
 * @typedef {object} SkillFacts
 * @property {string} name
 * @property {string} version
 * @property {string} tier
 * @property {string} contentHash
 * @property {string} sideEffects
 * @property {string} invocation
 * @property {string[]} requiredCapabilities
 * @property {string[]} requiredInputs
 * @property {string[]} outputs
 * @property {string[]} dependencies
 */

/**
 * The release-relevant facts of a package's skills, sorted by name.
 * @param {Package} pkg
 * @param {Repository} repository
 * @returns {Promise<SkillFacts[]>}
 */
export async function skillFacts(pkg, repository) {
  const bySkill = new Map(repository.skills.map((s) => [s.name, s]));
  const result = [];
  for (const { name, tier } of [...pkg.skills].sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const skill = bySkill.get(name);
    const meta = skill?.meta;
    if (!skill || !meta) throw new Error(`${pkg.name}: skill "${name}" is missing or has no tag-skill.json`);
    result.push({
      name,
      version: meta.version,
      tier,
      contentHash: (await hashDirectory(skill.dir)).hash,
      sideEffects: meta.sideEffects,
      invocation: meta.invocation,
      requiredCapabilities: meta.capabilities
        .filter((c) => c.required)
        .map((c) => c.name)
        .sort(),
      requiredInputs: meta.inputs
        .filter((i) => i.required)
        .map((i) => i.name)
        .sort(),
      outputs: meta.outputs.map((o) => o.name).sort(),
      dependencies: [...meta.dependencies.skills].sort(),
    });
  }
  return result;
}

/**
 * Compares a package's skills and requirements with its previous published version and returns
 * every detected change with its level (the package versioning rules, packages/README.md).
 * `errors` lists changes no version bump can make valid, such as a skill whose content changed
 * while its own version did not.
 * @param {{ skills: SkillFacts[], requires: Record<string, string>, agentPlugins: string }} previous
 * @param {{ skills: SkillFacts[], requires: Record<string, string>, agentPlugins: string }} current
 * @returns {{ level: Level | null, changes: { level: Level, message: string }[], errors: string[] }}
 */
export function diffPackage(previous, current) {
  /** @type {{ level: Level, message: string }[]} */
  const changes = [];
  /** @type {string[]} */
  const errors = [];
  const add = (/** @type {Level} */ level, /** @type {string} */ message) => changes.push({ level, message });
  const before = new Map(previous.skills.map((s) => [s.name, s]));
  const after = new Map(current.skills.map((s) => [s.name, s]));
  /** @param {string[]} a @param {string[]} b */
  const added = (a, b) => b.filter((x) => !a.includes(x));

  for (const name of before.keys()) {
    if (!after.has(name)) add("breaking", `removed skill ${name}`);
  }
  for (const [name, now] of after) {
    const old = before.get(name);
    if (!old) {
      add("feature", `added skill ${name} (${now.tier})`);
      continue;
    }
    if (old.tier !== now.tier) {
      const raised = tierRank(now.tier) > tierRank(old.tier);
      add(raised ? "breaking" : "feature", `${name} moved from ${old.tier} to ${now.tier}`);
    }
    const order = compareSemver(now.version, old.version);
    if (order < 0) errors.push(`${name} version went down from ${old.version} to ${now.version}`);
    else if (order === 0 && old.contentHash !== now.contentHash) {
      errors.push(`${name} changed since the previous release but its tag-skill.json version is still ${now.version}`);
    } else if (order > 0) {
      add(versionLevel(old.version, now.version), `${name} ${old.version} -> ${now.version}`);
    }
    const s0 = SIDE_EFFECTS.indexOf(old.sideEffects);
    const s1 = SIDE_EFFECTS.indexOf(now.sideEffects);
    if (s1 > s0) add("breaking", `${name} side effects escalated from ${old.sideEffects} to ${now.sideEffects}`);
    else if (s1 < s0) add("fix", `${name} side effects reduced from ${old.sideEffects} to ${now.sideEffects}`);
    if (old.invocation !== now.invocation) {
      add(
        now.invocation === "user" ? "breaking" : "feature",
        `${name} invocation ${old.invocation} -> ${now.invocation}`,
      );
    }
    for (const c of added(old.requiredCapabilities, now.requiredCapabilities)) {
      add("breaking", `${name} now requires capability ${c}`);
    }
    for (const i of added(old.requiredInputs, now.requiredInputs)) add("breaking", `${name} now requires input "${i}"`);
    for (const o of added(now.outputs, old.outputs)) add("breaking", `${name} no longer produces "${o}"`);
    for (const o of added(old.outputs, now.outputs)) add("feature", `${name} adds output "${o}"`);
    for (const d of added(old.dependencies, now.dependencies)) add("feature", `${name} now depends on ${d}`);
  }
  for (const [name, range] of Object.entries(current.requires)) {
    const old = previous.requires[name];
    if (old === undefined) add("breaking", `now requires package ${name} ${range}`);
    else if (old !== range) add("breaking", `requires ${name} ${range} (was ${old})`);
  }
  if (previous.agentPlugins !== current.agentPlugins) {
    add("breaking", `targets Agent Plugins ${current.agentPlugins} (was ${previous.agentPlugins})`);
  }
  return { level: highest(changes.map((c) => c.level)), changes, errors };
}

/**
 * The archive of one package: the plugin directory `<name>/` with plugin.json, CHANGELOG.md and
 * skills/<skill>/..., every file byte-for-byte from the repository.
 * @param {Package} pkg
 * @param {Repository} repository
 * @param {number} mtime  Seconds since the epoch.
 */
export async function buildArchive(pkg, repository, mtime) {
  const bySkill = new Map(repository.skills.map((s) => [s.name, s]));
  /** @type {import("./tar.js").TarEntry[]} */
  const entries = [];
  const dirs = new Set();
  /** @param {string} path */
  const addDirs = (path) => {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) dirs.add(`${parts.slice(0, i).join("/")}/`);
  };
  /** @param {string} path @param {Buffer} data @param {boolean} executable */
  const addFile = (path, data, executable) => {
    addDirs(path);
    entries.push({ path, data, executable });
  };
  addFile(`${pkg.name}/plugin.json`, await readFile(join(pkg.dir, "plugin.json")), false);
  addFile(`${pkg.name}/CHANGELOG.md`, await readFile(join(pkg.dir, "CHANGELOG.md")), false);
  dirs.add(`${pkg.name}/skills/`);
  for (const { name } of pkg.skills) {
    const skill = bySkill.get(name);
    if (!skill) throw new Error(`${pkg.name}: skill "${name}" is not in the repository`);
    for (const rel of await listFiles(skill.dir)) {
      const source = join(skill.dir, rel);
      const executable = ((await stat(source)).mode & 0o111) !== 0;
      addFile(`${pkg.name}/skills/${name}/${rel}`, await readFile(source), executable);
    }
  }
  const all = [...[...dirs].map((path) => ({ path })), ...entries];
  all.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return tarGzip(all, mtime);
}

// ---------------------------------------------------------------------------------------------
// Planning and the index

/**
 * @typedef {object} Context
 * @property {string} commit       Full SHA of the commit being released.
 * @property {string} publishedAt  The commit's date, UTC, "YYYY-MM-DDTHH:MM:SSZ".
 */

/** An empty index, used when nothing has been published yet. */
export function emptyIndex() {
  return {
    indexVersion: 1,
    repository: REPOSITORY,
    agentPlugins: { version: AGENT_PLUGINS_VERSION, schema: PLUGIN_SCHEMA_ID },
    tiers: [...TIERS],
    packages: /** @type {any[]} */ ([]),
  };
}

/** @param {string} name @param {string} version */
export const releaseTag = (name, version) => `${name}@${version}`;
/** @param {string} name @param {string} version */
export const archiveName = (name, version) => `${name}-${version}.tar.gz`;

/**
 * Works out which packages to release and builds their archives and index entries.
 *
 * A package is released when its manifest version is not yet in the previous index. Its changes
 * against the previous published version must be covered by the version bump. A package whose
 * version is already published but whose content changed has pending changes: they ship once the
 * version is bumped.
 * @param {Package[]} packages  Checked packages (checkPackages reported no findings).
 * @param {Repository} repository
 * @param {any} previousIndex
 * @param {Context} context
 */
export async function planReleases(packages, repository, previousIndex, context) {
  const owners = skillOwners(packages);
  const bySkill = new Map(repository.skills.map((s) => [s.name, s]));
  const published = new Map((previousIndex.packages ?? []).map((/** @type {any} */ p) => [p.name, p]));
  const releasing = new Set(
    packages
      .filter((p) => !published.get(p.name)?.versions.some((/** @type {any} */ v) => v.version === p.version))
      .map((p) => p.name),
  );
  const mtime = Math.floor(Date.parse(context.publishedAt) / 1000);
  if (!Number.isFinite(mtime)) throw new Error(`invalid publishedAt: ${context.publishedAt}`);

  /** @type {string[]} */
  const errors = [];
  /** @type {{ package: string, version: string, message: string }[]} */
  const pending = [];
  /** @type {{ pkg: Package, entry: any, archive: Buffer, notes: string }[]} */
  const releases = [];

  for (const pkg of packages) {
    const history = published.get(pkg.name)?.versions ?? [];
    /** @type {[string, string][]} */
    const deps = [];
    for (const dep of packageDependencies(pkg, owners, bySkill)) {
      const target = packages.find((p) => p.name === dep);
      if (!target) continue;
      const depPublished = published.get(dep)?.versions.some((/** @type {any} */ v) => v.version === target.version);
      if (!depPublished && !releasing.has(dep)) {
        errors.push(`${pkg.name} needs ${dep}@${target.version}, which is neither published nor being released`);
      }
      deps.push([dep, target.version]);
    }
    const skills = await skillFacts(pkg, repository);
    /** @param {any} baseline */
    const currentAgainst = (baseline) => {
      /** @type {Record<string, string>} */
      const requires = {};
      for (const [dep, version] of deps) {
        const kept = baseline?.requires?.[dep];
        requires[dep] = kept && satisfiesCaret(version, kept) ? kept : `^${version}`;
      }
      return { skills, requires, agentPlugins: AGENT_PLUGINS_VERSION };
    };

    const existing = history.find((/** @type {any} */ v) => v.version === pkg.version);
    if (existing) {
      const diff = diffPackage(existing, currentAgainst(existing));
      if (diff.changes.length > 0 || diff.errors.length > 0) {
        pending.push({
          package: pkg.name,
          version: pkg.version,
          message: `changed since ${releaseTag(pkg.name, pkg.version)}; bump "version" and add a CHANGELOG section to release`,
        });
      }
      continue;
    }

    const stable = !parseSemver(pkg.version).pre.length;
    const comparable = stable ? history.filter((/** @type {any} */ v) => !parseSemver(v.version).pre.length) : history;
    const higher = comparable.filter((/** @type {any} */ v) => compareSemver(v.version, pkg.version) > 0);
    if (stable && higher.length > 0) {
      errors.push(`${pkg.name}@${pkg.version} is lower than the published ${latest(higher).version}`);
      continue;
    }
    const below = (/** @type {any[]} */ versions) =>
      versions.filter((/** @type {any} */ v) => compareSemver(v.version, pkg.version) < 0);
    const previous = latest(below(comparable)) ?? latest(below(history));
    const current = currentAgainst(previous);
    let breaking = false;
    let changes = ["initial release"];
    if (previous) {
      const diff = diffPackage(previous, current);
      for (const e of diff.errors) errors.push(`${pkg.name}: ${e}`);
      if (diff.level && !bumpCovers(diff.level, previous.version, pkg.version)) {
        errors.push(
          `${pkg.name}: ${previous.version} -> ${pkg.version} is too small for a ${diff.level} change ` +
            `(${diff.changes
              .filter((c) => c.level === diff.level)
              .map((c) => c.message)
              .join("; ")})`,
        );
      }
      breaking = versionLevel(previous.version, pkg.version) === "breaking";
      changes = diff.changes.map((c) => `${c.level}: ${c.message}`);
      if (changes.length === 0) changes = ["fix: package metadata or changelog only"];
    }

    const archive = await buildArchive(pkg, repository, mtime);
    const tag = releaseTag(pkg.name, pkg.version);
    const name = archiveName(pkg.name, pkg.version);
    const changelog = changelogSection(pkg.changelog ?? "", pkg.version) ?? "";
    const entry = {
      version: pkg.version,
      tag,
      commit: context.commit,
      publishedAt: context.publishedAt,
      prerelease: parseSemver(pkg.version).pre.length > 0,
      previous: previous ? previous.version : null,
      breaking,
      changes,
      agentPlugins: AGENT_PLUGINS_VERSION,
      archive: {
        name,
        url: `https://github.com/${REPOSITORY}/releases/download/${tag}/${name}`,
        sha256: sha256(archive),
        size: archive.length,
      },
      requires: current.requires,
      skills,
      tiers: skillsByTier(pkg.skills),
      changelog,
    };
    releases.push({ pkg, entry, archive, notes: releaseNotes(pkg, entry) });
  }
  return { releases, pending, errors };
}

/**
 * The GitHub release body for a package version.
 * @param {Package} pkg @param {any} entry
 */
export function releaseNotes(pkg, entry) {
  const lines = [
    `${pkg.manifest.description}`,
    "",
    entry.changelog,
    "",
    "## Package",
    "",
    `- Format: [Agent Plugins ${entry.agentPlugins}](https://agent-plugins.org/specification) (\`${PLUGIN_SCHEMA_ID}\`)`,
    `- Archive: \`${entry.archive.name}\`, SHA-256 \`${entry.archive.sha256}\``,
    `- Previous version: ${entry.previous ?? "none (first release)"}${entry.breaking ? " (breaking)" : ""}`,
    `- Requires: ${
      Object.entries(entry.requires)
        .map(([n, r]) => `${n} ${r}`)
        .join(", ") || "no other package"
    }`,
    `- Release index: ${INDEX_URL}`,
    "",
    "## Skills by tier",
    "",
    ...TIERS.map((tier) => `- ${tier}: ${entry.tiers[tier].join(", ") || "none"}`),
    "",
    "## Detected changes",
    "",
    ...entry.changes.map((/** @type {string} */ c) => `- ${c}`),
  ];
  return `${lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()}\n`;
}

/**
 * Adds released entries to the previous index. Published entries never change; packages and
 * versions are sorted, so the result depends only on its inputs.
 * @param {any} previousIndex
 * @param {{ pkg: Package, entry: any }[]} releases
 * @param {Package[]} packages  Current packages (for descriptions).
 */
export function mergeIndex(previousIndex, releases, packages) {
  const index = emptyIndex();
  /** @type {Map<string, any>} */
  const byName = new Map();
  for (const p of previousIndex.packages ?? []) {
    byName.set(p.name, { name: p.name, description: p.description, versions: [...p.versions] });
  }
  for (const { pkg, entry } of releases) {
    const record = byName.get(pkg.name) ?? { name: pkg.name, description: "", versions: [] };
    if (record.versions.some((/** @type {any} */ v) => v.version === entry.version)) {
      throw new Error(`${entry.tag} is already in the index; published versions are immutable`);
    }
    record.versions.push(entry);
    byName.set(pkg.name, record);
  }
  for (const pkg of packages) {
    const record = byName.get(pkg.name);
    if (record && pkg.manifest?.description) record.description = pkg.manifest.description;
  }
  index.packages = [...byName.values()]
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .map((record) => {
      const versions = [...record.versions].sort((a, b) => compareSemver(b.version, a.version));
      const stable = versions.find((v) => !v.prerelease);
      return {
        name: record.name,
        description: record.description,
        channels: stable ? { stable: stable.version } : {},
        versions,
      };
    });
  return index;
}

/** @param {any} index */
export const serializeIndex = (index) => `${JSON.stringify(index, null, 2)}\n`;
