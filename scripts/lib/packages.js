// Skill packages: Agent Plugins 1.0.0 manifests under packages/<name>/ (ADR 0005).
//
// A package is a release unit. Its source is packages/<name>/plugin.json (the manifest, with the
// version, the skill list and each skill's lowest plan tier under TAG's extension namespace) and
// packages/<name>/CHANGELOG.md. The skills themselves stay in skills/<pillar>/<name>/; the release
// script assembles the plugin directory (plugin.json, CHANGELOG.md, skills/<skill>/...) into an
// archive. Everything here reads; nothing writes.

import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";

/** @typedef {import("./validate.js").Finding} Finding */

export const AGENT_PLUGINS_VERSION = "1.0.0";
export const PLUGIN_SCHEMA_ID = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
/** The vendored copy of PLUGIN_SCHEMA_ID, byte-for-byte as published, and its SHA-256 (ADR 0005). */
export const PLUGIN_SCHEMA_FILE = "schemas/vendor/agent-plugins/1.0.0/plugin.schema.json";
export const PLUGIN_SCHEMA_SHA256 = "0a4aad95ce337878ad38802ebf0daa3fde76abe3f65400c86bcbb1ec0b3ab883";
/** TAG's client extension namespace in plugin.json (reverse domain, Agent Plugins section 8). */
export const NAMESPACE = "com.theapotheosisgroup.tag-skills";
/** Plan tiers, lowest first. Each tier includes every skill of the tiers before it. */
export const TIERS = /** @type {const} */ (["foundation", "structure", "turnkey"]);
export const PACKAGE_PREFIX = "tag-";
/** The only files a package source directory holds. */
export const PACKAGE_FILES = new Set(["plugin.json", "CHANGELOG.md"]);

export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?$/;

/**
 * @typedef {object} PackageSkill
 * @property {string} name
 * @property {(typeof TIERS)[number]} tier
 */

/**
 * @typedef {object} Package
 * @property {string} name        Directory name under packages/.
 * @property {string} dir         Absolute path.
 * @property {any} manifest       Parsed plugin.json (null when unreadable).
 * @property {Buffer | null} manifestBytes
 * @property {string | null} changelog
 * @property {string} version     manifest.version, or "" when missing.
 * @property {PackageSkill[]} skills  The TAG extension's skill list ([] when invalid).
 */

/** @param {Buffer | string} data */
const sha256 = (data) => createHash("sha256").update(data).digest("hex");

/**
 * Compiles the pinned Agent Plugins manifest schema and TAG's extension schema.
 * @param {string} root
 */
export async function loadPackageSchemas(root) {
  const pluginBytes = await readFile(join(root, PLUGIN_SCHEMA_FILE));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return {
    pluginBytes,
    plugin: ajv.compile(JSON.parse(pluginBytes.toString("utf8"))),
    extension: ajv.compile(JSON.parse(await readFile(join(root, "schemas", "tag-package.schema.json"), "utf8"))),
    index: ajv.compile(JSON.parse(await readFile(join(root, "schemas", "release-index.schema.json"), "utf8"))),
  };
}

/** @param {import("ajv").ValidateFunction} validate */
export function schemaErrors(validate) {
  return (validate.errors ?? []).map((e) => `${e.instancePath || "(root)"} ${e.message ?? "is invalid"}`);
}

/**
 * Loads every package source directory under packages/.
 * @param {string} root
 * @returns {Promise<{ packages: Package[], findings: Finding[] }>}
 */
export async function loadPackages(root) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Package[]} */
  const packages = [];
  const base = join(root, "packages");
  for (const entry of (await readdir(base)).sort()) {
    const dir = join(base, entry);
    if (!(await stat(dir)).isDirectory()) continue;
    /** @type {Package} */
    const pkg = { name: entry, dir, manifest: null, manifestBytes: null, changelog: null, version: "", skills: [] };
    try {
      pkg.manifestBytes = await readFile(join(dir, "plugin.json"));
      pkg.manifest = JSON.parse(pkg.manifestBytes.toString("utf8"));
    } catch (error) {
      const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
      findings.push({ path: join(dir, "plugin.json"), message: missing ? "plugin.json is missing" : "not valid JSON" });
    }
    try {
      pkg.changelog = await readFile(join(dir, "CHANGELOG.md"), "utf8");
    } catch {
      findings.push({ path: join(dir, "CHANGELOG.md"), message: "CHANGELOG.md is missing" });
    }
    for (const file of await readdir(dir)) {
      if (!PACKAGE_FILES.has(file)) {
        findings.push({
          path: join(dir, file),
          message: `a package source holds only ${[...PACKAGE_FILES].join(" and ")}; skills stay in skills/`,
        });
      }
    }
    if (pkg.manifest && typeof pkg.manifest === "object") {
      if (typeof pkg.manifest.version === "string") pkg.version = pkg.manifest.version;
      const skills = pkg.manifest.extensions?.[NAMESPACE]?.skills;
      if (Array.isArray(skills)) pkg.skills = skills.filter((s) => s && typeof s.name === "string");
    }
    packages.push(pkg);
  }
  return { packages, findings };
}

/**
 * Returns a version's section of a Keep a Changelog file ("## [x.y.z]..." up to the next "## "),
 * without its heading, trimmed; null when there is no such heading.
 * @param {string} text
 * @param {string} version
 */
export function changelogSection(text, version) {
  const lines = text.split(/\r?\n/);
  const heading = new RegExp(`^## \\[${version.replace(/[.+-]/g, "\\$&")}\\](?:\\s|$)`);
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;
  let end = lines.findIndex((line, i) => i > start && line.startsWith("## "));
  if (end === -1) end = lines.length;
  return lines
    .slice(start + 1, end)
    .join("\n")
    .trim();
}

/** @param {string} tier */
export const tierRank = (tier) => TIERS.indexOf(/** @type {any} */ (tier));

/**
 * Lists a package's skills by tier, cumulatively: tier name to sorted skill names.
 * @param {PackageSkill[]} skills
 * @returns {Record<string, string[]>}
 */
export function skillsByTier(skills) {
  /** @type {Record<string, string[]>} */
  const result = {};
  for (const tier of TIERS) {
    result[tier] = skills
      .filter((s) => tierRank(s.tier) <= tierRank(tier))
      .map((s) => s.name)
      .sort();
  }
  return result;
}

/**
 * Maps each skill name to the package that ships it (first occurrence).
 * @param {Package[]} packages
 * @returns {Map<string, { pkg: Package, tier: string }>}
 */
export function skillOwners(packages) {
  const owners = new Map();
  for (const pkg of packages) {
    for (const skill of pkg.skills) if (!owners.has(skill.name)) owners.set(skill.name, { pkg, tier: skill.tier });
  }
  return owners;
}

/**
 * The packages a package depends on because one of its skills depends on a skill they ship.
 * @param {Package} pkg
 * @param {Map<string, { pkg: Package, tier: string }>} owners
 * @param {Map<string, import("./repository.js").Skill>} bySkill
 * @returns {string[]} Sorted package names.
 */
export function packageDependencies(pkg, owners, bySkill) {
  const result = new Set();
  for (const skill of pkg.skills) {
    for (const dep of bySkill.get(skill.name)?.meta?.dependencies.skills ?? []) {
      const owner = owners.get(dep);
      if (owner && owner.pkg.name !== pkg.name) result.add(owner.pkg.name);
    }
  }
  return [...result].sort();
}

/**
 * Checks every package against the pinned Agent Plugins schema, TAG's extension schema and the
 * repository: each published skill in exactly one package, tiers that respect skill dependencies,
 * no package dependency cycle, and a CHANGELOG section for the manifest version.
 * @param {string} root
 * @param {import("./repository.js").Repository} repository
 * @returns {Promise<{ packages: Package[], findings: Finding[] }>}
 */
export async function checkPackages(root, repository) {
  const schemas = await loadPackageSchemas(root);
  const { packages, findings } = await loadPackages(root);
  const add = (/** @type {string} */ path, /** @type {string} */ message) => findings.push({ path, message });

  if (sha256(schemas.pluginBytes) !== PLUGIN_SCHEMA_SHA256) {
    add(
      join(root, PLUGIN_SCHEMA_FILE),
      `differs from the pinned Agent Plugins ${AGENT_PLUGINS_VERSION} schema (ADR 0005)`,
    );
  }
  if (packages.length === 0) add(join(root, "packages"), "no packages: every published skill must ship in one");

  const bySkill = new Map(repository.skills.map((s) => [s.name, s]));
  /** @type {Map<string, string[]>} */
  const listedIn = new Map();
  for (const pkg of packages) {
    const path = join(pkg.dir, "plugin.json");
    /** @type {any} */
    const manifest = pkg.manifest;
    if (!manifest) continue;
    if (!schemas.plugin(pkg.manifest)) {
      for (const e of schemaErrors(schemas.plugin)) add(path, `Agent Plugins ${AGENT_PLUGINS_VERSION}: ${e}`);
      continue;
    }
    if (manifest.name !== pkg.name) add(path, `"name" is "${manifest.name}" but the directory is "${pkg.name}"`);
    if (!pkg.name.startsWith(PACKAGE_PREFIX)) add(path, `a package name starts with "${PACKAGE_PREFIX}"`);
    if (!SEMVER.test(pkg.version))
      add(path, `"version" must be a semantic version, not ${JSON.stringify(manifest.version)}`);
    if (!manifest.description) add(path, `"description" is required for TAG packages`);
    const namespaces = Object.keys(manifest.extensions ?? {});
    for (const ns of namespaces)
      if (ns !== NAMESPACE) add(path, `extension namespace "${ns}" is not TAG's (${NAMESPACE})`);
    const extension = manifest.extensions?.[NAMESPACE];
    if (!extension) {
      add(path, `extensions["${NAMESPACE}"] is required: it lists the package's skills and tiers`);
      continue;
    }
    if (!schemas.extension(manifest.extensions[NAMESPACE])) {
      for (const e of schemaErrors(schemas.extension)) add(path, `extensions["${NAMESPACE}"]${e}`);
      pkg.skills = [];
      continue;
    }
    for (const skill of pkg.skills) {
      listedIn.set(skill.name, [...(listedIn.get(skill.name) ?? []), pkg.name]);
      if (!bySkill.has(skill.name)) add(path, `skill "${skill.name}" is not a published skill`);
    }

    if (pkg.changelog !== null) {
      const changelogPath = join(pkg.dir, "CHANGELOG.md");
      if (!/^## \[Unreleased\]/m.test(pkg.changelog)) add(changelogPath, "needs an `## [Unreleased]` section");
      const section = SEMVER.test(pkg.version) ? changelogSection(pkg.changelog, pkg.version) : "";
      if (section === null) add(changelogPath, `has no \`## [${pkg.version}]\` section for the manifest version`);
      else if (section === "" && SEMVER.test(pkg.version)) add(changelogPath, `the [${pkg.version}] section is empty`);
    }
  }

  for (const [name, owners] of listedIn) {
    if (owners.length > 1) add(join(root, "packages"), `skill "${name}" is listed in ${owners.join(" and ")}`);
  }
  for (const skill of repository.skills) {
    if (!listedIn.has(skill.name)) {
      add(join(root, "packages"), `skill "${skill.name}" is in no package: add it to one packages/*/plugin.json`);
    }
  }

  // A skill is available from its tier up, so everything it depends on must be available at that tier.
  const owners = skillOwners(packages);
  for (const pkg of packages) {
    for (const skill of pkg.skills) {
      for (const dep of bySkill.get(skill.name)?.meta?.dependencies.skills ?? []) {
        const owner = owners.get(dep);
        if (owner && tierRank(owner.tier) > tierRank(skill.tier)) {
          add(
            join(pkg.dir, "plugin.json"),
            `"${skill.name}" (${skill.tier}) depends on "${dep}", which is only in ${owner.tier} (${owner.pkg.name})`,
          );
        }
      }
    }
  }

  // Package dependency cycles.
  const byName = new Map(packages.map((p) => [p.name, p]));
  /** @param {string} name @param {string[]} path */
  const visit = (name, path) => {
    if (path.includes(name)) throw new Error(`package dependency cycle: ${[...path, name].join(" -> ")}`);
    const pkg = byName.get(name);
    if (!pkg) return;
    for (const dep of packageDependencies(pkg, owners, bySkill)) visit(dep, [...path, name]);
  };
  for (const pkg of packages) {
    try {
      visit(pkg.name, []);
    } catch (error) {
      add(join(pkg.dir, "plugin.json"), error instanceof Error ? error.message : String(error));
    }
  }
  return { packages, findings };
}
