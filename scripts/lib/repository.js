// Repository-level checks: TAG sidecars (tag-skill.json), profiles, the upstream import record
// (upstreams.lock.json) and the logical capability registry (docs/integration/capabilities.json).
//
// Per-skill format checks are in validate.js. Everything here reads; nothing writes.

import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join, relative, sep } from "node:path";
import { parseDocument } from "yaml";
import { Ajv2020 } from "ajv/dist/2020.js";
import { hashFileList, sha256 } from "./hash.js";
import { splitFrontmatter, validateRoot } from "./validate.js";

/** @typedef {import("./validate.js").Finding} Finding */

/**
 * @typedef {object} SkillMeta
 * @property {string} name
 * @property {string} version
 * @property {string} domain
 * @property {string} priority
 * @property {string[]} audiences
 * @property {string} invocation
 * @property {{ name: string, required: boolean, use: string }[]} capabilities
 * @property {{ name: string, required: boolean, source: string }[]} inputs
 * @property {{ name: string, format: string, description?: string }[]} outputs
 * @property {{ skills: string[], runtime: { name: string, version: string, purpose?: string }[] }} dependencies
 * @property {string} sideEffects
 * @property {{ required: boolean, conditions: string[] }} review
 * @property {string[]} provenance
 */

/**
 * @typedef {object} Skill
 * @property {string} name        Directory name.
 * @property {string} category    Category directory name.
 * @property {string} dir         Absolute path.
 * @property {string} path        POSIX path relative to the repository root.
 * @property {string} description Frontmatter description ("" when unreadable).
 * @property {string} body        SKILL.md body.
 * @property {SkillMeta | null} meta  Parsed tag-skill.json, or null when missing or not JSON.
 */

/**
 * @typedef {object} Profile
 * @property {string} name
 * @property {string} description
 * @property {string[]} [extends]
 * @property {string[]} skills
 */

/**
 * @typedef {object} Capability
 * @property {string} name
 * @property {"mapped" | "proposed"} status
 * @property {string} owner
 * @property {"read" | "render" | "route" | "record" | "write"} kind
 * @property {string} description
 * @property {{ server: string, tool: string, reference: string }} [binding]
 * @property {boolean} [requiresReview]
 */

/**
 * @typedef {object} Repository
 * @property {string} root
 * @property {Skill[]} skills
 * @property {Profile[]} profiles
 * @property {any} lock
 * @property {{ registryVersion: number, capabilities: Capability[] }} registry
 * @property {Finding[]} findings  Problems found while loading (unreadable or invalid JSON).
 */

/** @param {string} path */
async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

/** @param {string} root @param {string} path */
const posix = (root, path) => relative(root, path).split(sep).join("/");

const SCHEMAS = ["tag-skill", "profile", "catalog", "upstreams-lock", "capabilities"];

/**
 * Compiles the repository's JSON Schemas.
 * @param {string} root
 * @returns {Promise<Record<string, import("ajv").ValidateFunction>>}
 */
export async function loadSchemas(root) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  /** @type {Record<string, import("ajv").ValidateFunction>} */
  const validators = {};
  for (const name of SCHEMAS) {
    validators[name] = ajv.compile(await readJson(join(root, "schemas", `${name}.schema.json`)));
  }
  return validators;
}

/**
 * Formats Ajv errors as readable strings.
 * @param {import("ajv").ValidateFunction} validate
 */
function schemaErrors(validate) {
  return (validate.errors ?? []).map((e) => `${e.instancePath || "(root)"} ${e.message ?? "is invalid"}`);
}

/**
 * Loads skills, profiles, the lock and the registry.
 * @param {string} root  Repository root.
 * @returns {Promise<Repository>}
 */
export async function loadRepository(root) {
  /** @type {Finding[]} */
  const findings = [];
  const { dirs } = await validateRoot(join(root, "skills"), { layout: "categories" });
  /** @type {Skill[]} */
  const skills = [];
  for (const dir of dirs) {
    let description = "";
    let body = "";
    try {
      const parts = splitFrontmatter(await readFile(join(dir, "SKILL.md"), "utf8"));
      if (parts) {
        const data = parseDocument(parts.frontmatter).toJS();
        if (data && typeof data.description === "string") description = data.description;
        body = parts.body;
      }
    } catch {
      // validateRoot reports a missing or unreadable SKILL.md.
    }
    /** @type {SkillMeta | null} */
    let meta = null;
    try {
      meta = await readJson(join(dir, "tag-skill.json"));
    } catch (error) {
      const missing = error instanceof Error && "code" in error && error.code === "ENOENT";
      if (!missing) findings.push({ path: join(dir, "tag-skill.json"), message: "tag-skill.json is not valid JSON" });
    }
    skills.push({
      name: basename(dir),
      category: basename(dirname(dir)),
      dir,
      path: posix(root, dir),
      description,
      body,
      meta,
    });
  }

  /** @type {Profile[]} */
  const profiles = [];
  for (const entry of (await readdir(join(root, "profiles"))).sort()) {
    if (!entry.endsWith(".json")) continue;
    try {
      profiles.push({ ...(await readJson(join(root, "profiles", entry))), file: entry });
    } catch {
      findings.push({ path: join(root, "profiles", entry), message: "profile is not valid JSON" });
    }
  }
  const lock = await readJson(join(root, "upstreams.lock.json"));
  const registry = await readJson(join(root, "docs", "integration", "capabilities.json"));
  return { root, skills, profiles, lock, registry, findings };
}

/**
 * Expands profiles into a sorted list of skill names: the profile's own skills, those of the
 * profiles it extends, and every skill dependency declared in tag-skill.json, transitively.
 * @param {string[]} names  Profile names.
 * @param {Profile[]} profiles
 * @param {Skill[]} skills
 * @returns {string[]}
 */
export function expandProfiles(names, profiles, skills) {
  const byProfile = new Map(profiles.map((p) => [p.name, p]));
  const bySkill = new Map(skills.map((s) => [s.name, s]));
  /** @type {Set<string>} */
  const selected = new Set();
  /** @type {Set<string>} */
  const visiting = new Set();
  /** @param {string} name */
  const addProfile = (name) => {
    const profile = byProfile.get(name);
    if (!profile) throw new Error(`unknown profile "${name}"`);
    if (visiting.has(name)) throw new Error(`profile "${name}" extends itself through ${[...visiting].join(" -> ")}`);
    visiting.add(name);
    for (const parent of profile.extends ?? []) addProfile(parent);
    for (const skill of profile.skills) selected.add(skill);
    visiting.delete(name);
  };
  for (const name of names) addProfile(name);
  return expandSkills([...selected], bySkill);
}

/**
 * Adds every transitive skill dependency to a selection.
 * @param {string[]} names
 * @param {Map<string, Skill>} bySkill
 * @returns {string[]}
 */
export function expandSkills(names, bySkill) {
  /** @type {Set<string>} */
  const result = new Set();
  /** @param {string} name @param {string[]} path */
  const visit = (name, path) => {
    if (path.includes(name)) throw new Error(`skill dependency cycle: ${[...path, name].join(" -> ")}`);
    const skill = bySkill.get(name);
    if (!skill) throw new Error(`unknown skill "${name}"${path.length ? ` (required by ${path.at(-1)})` : ""}`);
    if (result.has(name)) return;
    result.add(name);
    for (const dep of skill.meta?.dependencies.skills ?? []) visit(dep, [...path, name]);
  };
  for (const name of names) visit(name, []);
  return [...result].sort();
}

/**
 * Runs every repository-level check.
 * @param {string} root
 * @returns {Promise<{ repository: Repository, findings: Finding[] }>}
 */
export async function checkRepository(root) {
  const repository = await loadRepository(root);
  const schemas = await loadSchemas(root);
  const findings = [...repository.findings];
  const add = (/** @type {string} */ path, /** @type {string} */ message) => findings.push({ path, message });
  const { skills, profiles, lock, registry } = repository;

  // Capability registry.
  const registryPath = join(root, "docs", "integration", "capabilities.json");
  if (!schemas.capabilities(registry)) {
    for (const e of schemaErrors(schemas.capabilities)) add(registryPath, e);
  }
  /** @type {Map<string, Capability>} */
  const capabilities = new Map();
  for (const capability of registry.capabilities ?? []) {
    if (capabilities.has(capability.name)) add(registryPath, `capability "${capability.name}" is listed twice`);
    capabilities.set(capability.name, capability);
  }

  // Upstream import record.
  const lockPath = join(root, "upstreams.lock.json");
  if (!schemas["upstreams-lock"](lock)) {
    for (const e of schemaErrors(schemas["upstreams-lock"])) add(lockPath, e);
  }
  /** @type {Map<string, any>} */
  const imports = new Map();
  for (const entry of lock.imports ?? []) {
    if (imports.has(entry.id)) add(lockPath, `import id "${entry.id}" is listed twice`);
    imports.set(entry.id, entry);
    const source = lock.sources?.[entry.source];
    if (!source) add(lockPath, `import "${entry.id}" names unknown source "${entry.source}"`);
    else if (source.commit !== entry.commit) {
      add(lockPath, `import "${entry.id}" is at ${entry.commit}, but its source is recorded at ${source.commit}`);
    }
    if (hashFileList(entry.files ?? []) !== entry.sourceHash) {
      add(lockPath, `import "${entry.id}": sourceHash does not match its file list`);
    }
    if (!(entry.dependencyPaths ?? []).some((/** @type {{ path: string }} */ d) => d.path === entry.licenceFile)) {
      add(lockPath, `import "${entry.id}": licenceFile ${entry.licenceFile} is not among its dependencyPaths`);
    }
  }
  for (const [name, source] of Object.entries(lock.sources ?? {})) {
    for (const notice of source.notices ?? []) {
      try {
        await readFile(join(root, notice));
      } catch {
        add(lockPath, `source "${name}": notice file ${notice} does not exist`);
      }
    }
  }

  // Skills.
  const bySkill = new Map(skills.map((s) => [s.name, s]));
  for (const skill of skills) {
    const metaPath = join(skill.dir, "tag-skill.json");
    const meta = skill.meta;
    if (!meta) continue; // validateRoot reports the missing file; loadRepository reports bad JSON.
    if (!schemas["tag-skill"](meta)) {
      for (const e of schemaErrors(schemas["tag-skill"])) add(metaPath, e);
      continue;
    }
    if (meta.name !== skill.name) add(metaPath, `"name" is "${meta.name}" but the directory is "${skill.name}"`);
    if (meta.domain !== skill.category) {
      add(metaPath, `"domain" is "${meta.domain}" but the skill is in the "${skill.category}" category`);
    }

    let writes = false;
    let reads = false;
    for (const use of meta.capabilities) {
      const capability = capabilities.get(use.name);
      if (!capability) {
        add(metaPath, `capability "${use.name}" is not in docs/integration/capabilities.json`);
        continue;
      }
      if (capability.kind === "write") writes = true;
      if (capability.kind === "read") reads = true;
      if (!skill.body.includes(`\`${use.name}\``)) {
        add(
          join(skill.dir, "SKILL.md"),
          `SKILL.md does not name capability \`${use.name}\` declared in tag-skill.json`,
        );
      }
    }
    if (writes && meta.sideEffects !== "authorized-write") {
      add(metaPath, `uses a write capability, so "sideEffects" must be "authorized-write", not "${meta.sideEffects}"`);
    }
    if (meta.sideEffects === "authorized-write" && !meta.review.required) {
      add(metaPath, `"sideEffects" is "authorized-write", so "review.required" must be true`);
    }
    if (meta.sideEffects === "none" && (reads || writes)) {
      add(metaPath, `"sideEffects" is "none" but the skill uses capabilities that read or write organization data`);
    }
    if (meta.review.required && meta.review.conditions.length === 0) {
      add(metaPath, `"review.required" is true, so "review.conditions" must say when`);
    }

    for (const dep of meta.dependencies.skills) {
      if (dep === skill.name) add(metaPath, "a skill cannot depend on itself");
      else if (!bySkill.has(dep)) add(metaPath, `dependency "${dep}" is not a published skill`);
      if (!skill.body.includes(dep)) {
        add(
          join(skill.dir, "SKILL.md"),
          `SKILL.md does not name its prerequisite skill ${dep}; a single-skill install must say so`,
        );
      }
    }

    let hasScripts;
    try {
      hasScripts = (await readdir(join(skill.dir, "scripts"))).length > 0;
    } catch {
      hasScripts = false;
    }
    if (hasScripts && meta.dependencies.runtime.length === 0) {
      add(metaPath, "the skill ships scripts/, so dependencies.runtime must declare the interpreter they need");
    }

    // Provenance: lock entry, licence text and notice inside the installable folder.
    for (const id of meta.provenance) {
      const entry = imports.get(id);
      if (!entry) {
        add(metaPath, `provenance "${id}" is not an import in upstreams.lock.json`);
        continue;
      }
      if (entry.tagName !== skill.name)
        add(lockPath, `import "${id}" names "${entry.tagName}", used by "${skill.name}"`);
      if (entry.destination !== skill.path) {
        add(lockPath, `import "${id}" destination is "${entry.destination}", but the skill is at "${skill.path}"`);
      }
      const licence = (entry.dependencyPaths ?? []).find(
        (/** @type {{ path: string }} */ d) => d.path === entry.licenceFile,
      );
      let licenceText;
      try {
        licenceText = await readFile(join(skill.dir, "LICENSE"));
      } catch {
        add(skill.dir, `LICENSE is missing: the skill is derived from "${id}" and must carry its licence text`);
      }
      if (licenceText && licence && sha256(licenceText) !== licence.sha256) {
        add(join(skill.dir, "LICENSE"), `LICENSE differs from ${entry.source}:${entry.licenceFile} at ${entry.commit}`);
      }
      let notice = "";
      try {
        notice = await readFile(join(skill.dir, "NOTICE.md"), "utf8");
      } catch {
        add(skill.dir, `NOTICE.md is missing: the skill is derived from "${id}" and must say so and what changed`);
      }
      const url = lock.sources?.[entry.source]?.url;
      if (notice && (!notice.includes(entry.commit) || (url && !notice.includes(url)))) {
        add(join(skill.dir, "NOTICE.md"), `NOTICE.md must name the source ${url} and commit ${entry.commit}`);
      }
      if (notice && !/modified/i.test(notice)) {
        add(join(skill.dir, "NOTICE.md"), "NOTICE.md must state that the files were modified by TAG");
      }
    }
  }
  for (const entry of imports.values()) {
    if (!bySkill.has(entry.tagName))
      add(lockPath, `import "${entry.id}" names "${entry.tagName}", which is not a skill`);
    else if (!bySkill.get(entry.tagName)?.meta?.provenance.includes(entry.id)) {
      add(lockPath, `import "${entry.id}" is not listed in ${entry.tagName}'s tag-skill.json provenance`);
    }
  }
  // Dependency cycles.
  for (const skill of skills) {
    try {
      expandSkills([skill.name], bySkill);
    } catch (error) {
      add(join(skill.dir, "tag-skill.json"), error instanceof Error ? error.message : String(error));
    }
  }

  // Profiles.
  const profileNames = new Set(profiles.map((p) => p.name));
  for (const profile of profiles) {
    const path = join(root, "profiles", /** @type {any} */ (profile).file);
    const { file, ...data } = /** @type {any} */ (profile);
    if (!schemas.profile(data)) {
      for (const e of schemaErrors(schemas.profile)) add(path, e);
      continue;
    }
    if (`${profile.name}.json` !== file) add(path, `profile name "${profile.name}" does not match the file name`);
    for (const parent of profile.extends ?? []) {
      if (!profileNames.has(parent)) add(path, `extends unknown profile "${parent}"`);
    }
    for (const name of profile.skills) {
      if (!bySkill.has(name)) add(path, `skill "${name}" is not a published skill`);
    }
    try {
      expandProfiles([profile.name], profiles, skills);
    } catch (error) {
      add(path, error instanceof Error ? error.message : String(error));
    }
  }
  return { repository, findings };
}
