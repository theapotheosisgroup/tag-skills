// Validates skill directories against the Agent Skills format (https://agentskills.io/specification)
// and the TAG rules in theapotheosisgroup/.github standards/AGENTS-AND-SKILLS.md.
//
// The checks are pure functions over the filesystem: they read, never write.

import { lstat, readdir, readFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseDocument } from "yaml";

export const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const NAME_MAX = 64;
export const DESCRIPTION_MAX = 1024;
export const COMPATIBILITY_MAX = 500;

/** Frontmatter fields defined by the Agent Skills specification. Anything else is rejected. */
export const ALLOWED_FIELDS = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);

/** Entries allowed at the top level of a skill directory. */
export const ALLOWED_DIRS = new Set(["references", "scripts", "assets"]);
const LICENSE_FILE = /^LICENSE(?:\.(?:md|txt))?$/;

/** File names that suggest a credential. Skills hold no credentials. */
const CREDENTIAL_FILE =
  /^(?:\.env(?:\..*)?|.*\.pem|.*\.key|.*\.p12|.*\.pfx|id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?|credentials\.json|\.npmrc|\.netrc)$/i;

/**
 * @typedef {object} Finding
 * @property {string} path  Path of the offending file or directory.
 * @property {string} message
 */

/**
 * @typedef {object} ValidateOptions
 * @property {boolean} [fixture]  Validate as a test fixture: `metadata.internal: true` is then
 *   required, so the Skills CLI hides the fixture from anyone installing from this repository.
 *   Published skills must not set it.
 */

/**
 * Splits a SKILL.md into its YAML frontmatter and Markdown body.
 * @param {string} text
 * @returns {{ frontmatter: string, body: string } | null} null when there is no frontmatter block.
 */
export function splitFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?\n)?---[ \t]*(?:\n|$)/.exec(normalized);
  if (!match) return null;
  return { frontmatter: match[1] ?? "", body: normalized.slice(match[0].length) };
}

/**
 * Checks parsed frontmatter values.
 * @param {unknown} data
 * @param {string} dirName  Name of the directory holding SKILL.md.
 * @param {ValidateOptions} options
 * @returns {string[]} problems
 */
export function checkFrontmatter(data, dirName, options = {}) {
  /** @type {string[]} */
  const problems = [];
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return ["frontmatter must be a YAML mapping"];
  }
  const fields = /** @type {Record<string, unknown>} */ (data);

  for (const key of Object.keys(fields)) {
    if (!ALLOWED_FIELDS.has(key)) {
      problems.push(`unknown frontmatter field "${key}" (allowed: ${[...ALLOWED_FIELDS].join(", ")})`);
    }
  }

  const { name, description } = fields;
  if (typeof name !== "string" || name.length === 0) {
    problems.push('"name" is required and must be a non-empty string');
  } else {
    if (name.length > NAME_MAX) problems.push(`"name" is longer than ${NAME_MAX} characters`);
    if (!NAME_PATTERN.test(name)) {
      problems.push(`"name" must be lowercase letters, digits and single hyphens, got "${name}"`);
    }
    if (name !== dirName) problems.push(`"name" is "${name}" but the directory is "${dirName}"`);
  }

  if (typeof description !== "string" || description.trim().length === 0) {
    problems.push('"description" is required and must be a non-empty string');
  } else if (description.length > DESCRIPTION_MAX) {
    problems.push(`"description" is longer than ${DESCRIPTION_MAX} characters`);
  }

  if ("license" in fields && (typeof fields.license !== "string" || fields.license.length === 0)) {
    problems.push('"license" must be a non-empty string');
  }
  if ("compatibility" in fields) {
    const c = fields.compatibility;
    if (typeof c !== "string" || c.length === 0) problems.push('"compatibility" must be a non-empty string');
    else if (c.length > COMPATIBILITY_MAX)
      problems.push(`"compatibility" is longer than ${COMPATIBILITY_MAX} characters`);
  }
  if ("allowed-tools" in fields && typeof fields["allowed-tools"] !== "string") {
    problems.push('"allowed-tools" must be a space-separated string');
  }

  let internal = false;
  if ("metadata" in fields) {
    const m = fields.metadata;
    if (m === null || typeof m !== "object" || Array.isArray(m)) {
      problems.push('"metadata" must be a mapping');
    } else {
      for (const [key, value] of Object.entries(m)) {
        // The specification uses string values. The Skills CLI's `internal` flag is a boolean.
        if (key === "internal") {
          if (typeof value !== "boolean") problems.push('"metadata.internal" must be true or false');
          else internal = value;
        } else if (typeof value !== "string") {
          problems.push(`"metadata.${key}" must be a string`);
        }
      }
    }
  }

  if (options.fixture && !internal) {
    problems.push('a test fixture must set "metadata.internal: true" so the Skills CLI hides it from installers');
  }
  if (!options.fixture && internal) {
    problems.push('a published skill must not set "metadata.internal: true": the Skills CLI would hide it');
  }
  return problems;
}

/**
 * Percent-decodes a link target, keeping it as written when it is not valid URI encoding.
 * @param {string} target
 */
function decodeTarget(target) {
  try {
    return decodeURI(target);
  } catch {
    return target;
  }
}

/**
 * Returns the relative link targets in a Markdown body (inline links and images, and reference
 * definitions), without fragments. External URLs, mailto: and pure fragments are excluded.
 * @param {string} body
 * @returns {string[]}
 */
export function relativeLinks(body) {
  const withoutCode = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  /** @type {string[]} */
  const targets = [];
  const inline = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  const reference = /^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s+.*)?$/gm;
  for (const re of [inline, reference]) {
    for (const match of withoutCode.matchAll(re)) targets.push(match[1]);
  }
  return targets
    .filter((t) => !/^[a-z][a-z0-9+.-]*:/i.test(t) && !t.startsWith("#") && !t.startsWith("//"))
    .map((t) => decodeTarget(t.split("#")[0]))
    .filter((t) => t.length > 0);
}

/**
 * @param {string} parent
 * @param {string} child
 */
function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

/**
 * Walks every file and directory under `dir` without following symbolic links.
 * @param {string} dir
 * @returns {AsyncGenerator<{ path: string, stat: import("node:fs").Stats }>}
 */
async function* walk(dir) {
  for (const entry of await readdir(dir)) {
    const path = join(dir, entry);
    const stat = await lstat(path);
    yield { path, stat };
    if (stat.isDirectory()) yield* walk(path);
  }
}

/**
 * Validates one skill directory.
 * @param {string} skillDir
 * @param {ValidateOptions} [options]
 * @returns {Promise<Finding[]>}
 */
export async function validateSkill(skillDir, options = {}) {
  /** @type {Finding[]} */
  const findings = [];
  const add = (/** @type {string} */ path, /** @type {string} */ message) => findings.push({ path, message });
  const dirName = basename(skillDir);
  const skillMd = join(skillDir, "SKILL.md");

  for (const entry of await readdir(skillDir)) {
    const path = join(skillDir, entry);
    const stat = await lstat(path);
    if (entry === "SKILL.md" && stat.isFile()) continue;
    if (LICENSE_FILE.test(entry) && stat.isFile()) continue;
    if (ALLOWED_DIRS.has(entry) && stat.isDirectory()) continue;
    add(
      path,
      `unexpected entry: a skill holds SKILL.md, an optional LICENSE file and the directories ${[...ALLOWED_DIRS].join(", ")}`,
    );
  }

  const root = resolve(skillDir);
  for await (const { path, stat } of walk(skillDir)) {
    if (stat.isSymbolicLink()) {
      add(path, "symbolic links are not allowed: a skill must be self-contained and installable by copy");
      continue;
    }
    if (CREDENTIAL_FILE.test(basename(path))) {
      add(path, "file name suggests a credential; skills hold no credentials");
    }
    const inScripts = isInside(join(skillDir, "scripts"), path) && path !== join(skillDir, "scripts");
    if (inScripts && stat.isFile() && (stat.mode & 0o111) === 0) {
      add(path, "script is not executable (git update-index --chmod=+x)");
    }
  }

  let text;
  try {
    const stat = await lstat(skillMd);
    if (!stat.isFile()) throw new Error("not a regular file");
    text = await readFile(skillMd, "utf8");
  } catch {
    add(skillMd, "SKILL.md is missing");
    return findings;
  }

  const parts = splitFrontmatter(text);
  if (!parts) {
    add(skillMd, "SKILL.md must start with a YAML frontmatter block delimited by --- lines");
    return findings;
  }

  const doc = parseDocument(parts.frontmatter, { uniqueKeys: true, prettyErrors: false });
  if (doc.errors.length > 0) {
    for (const error of doc.errors) add(skillMd, `invalid YAML frontmatter: ${error.message.split("\n")[0]}`);
    return findings;
  }
  for (const problem of checkFrontmatter(doc.toJS(), dirName, options)) add(skillMd, problem);

  if (parts.body.trim().length === 0) add(skillMd, "SKILL.md has no instructions after the frontmatter");

  for (const target of relativeLinks(parts.body)) {
    const resolved = resolve(dirname(skillMd), target);
    if (!isInside(root, resolved)) {
      add(skillMd, `link "${target}" points outside the skill directory; a skill must be self-contained`);
      continue;
    }
    try {
      await lstat(resolved);
    } catch {
      add(skillMd, `link "${target}" does not resolve to a file in the skill`);
    }
  }
  return findings;
}

/**
 * Validates a flat skills root: every entry is a skill directory, except README.md.
 * @param {string} skillsRoot
 * @param {ValidateOptions} [options]
 * @returns {Promise<{ skills: string[], findings: Finding[] }>}
 */
export async function validateRoot(skillsRoot, options = {}) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {string[]} */
  const skills = [];
  let entries;
  try {
    entries = (await readdir(skillsRoot)).sort();
  } catch {
    return { skills, findings: [{ path: skillsRoot, message: "skills root does not exist" }] };
  }
  for (const entry of entries) {
    const path = join(skillsRoot, entry);
    const stat = await lstat(path);
    if (entry === "README.md" && stat.isFile()) continue;
    if (!stat.isDirectory()) {
      findings.push({ path, message: "only skill directories and README.md belong in a skills root" });
      continue;
    }
    skills.push(entry);
    findings.push(...(await validateSkill(path, options)));
  }
  return { skills, findings };
}
