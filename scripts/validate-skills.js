#!/usr/bin/env node
// Validates skills against the Agent Skills format and TAG's skill rules.
//
//   node scripts/validate-skills.js                 skills/ (categories) and the repository checks
//   node scripts/validate-skills.js --fixtures DIR  a flat root of test fixtures
//
// Without --fixtures, validates the published skills/ root (skills/<category>/<name>/), then the
// repository-level contract: tag-skill.json sidecars, profiles, upstreams.lock.json, the capability
// registry, licence and notice files. With --fixtures, every skill must be marked
// `metadata.internal: true` so the Skills CLI hides it from installers.
// Exit codes: 0 valid, 1 findings, 2 usage error.

import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { checkRepository } from "./lib/repository.js";
import { validateRoot } from "./lib/validate.js";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: { fixtures: { type: "boolean", default: false }, help: { type: "boolean", short: "h" } },
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}
if (parsed.values.help) {
  console.log("usage: node scripts/validate-skills.js [--fixtures <root> ...]");
  process.exit(0);
}

const fixture = parsed.values.fixtures;
if (!fixture && parsed.positionals.length > 0) {
  console.error("roots are only accepted with --fixtures; the published root is always skills/");
  process.exit(2);
}
const roots = fixture ? parsed.positionals : [resolve(repo, "skills")];
if (roots.length === 0) {
  console.error("--fixtures needs at least one root");
  process.exit(2);
}

/** @param {{ path: string, message: string }[]} findings */
const report = (findings) => {
  for (const finding of findings) {
    console.error(`${relative(process.cwd(), finding.path) || finding.path}: ${finding.message}`);
  }
};

let failed = false;
for (const root of roots) {
  const { skills, findings } = await validateRoot(root, { fixture });
  report(findings);
  const kind = fixture ? "test fixture skill(s)" : "skill(s)";
  const label = relative(process.cwd(), root) || root;
  if (findings.length > 0) {
    failed = true;
    console.error(`${label}: ${findings.length} problem(s) in ${skills.length} ${kind}`);
  } else {
    console.log(`${label}: ${skills.length} ${kind} valid${skills.length ? `: ${skills.join(", ")}` : ""}`);
  }
}

if (!fixture) {
  const { repository, findings } = await checkRepository(repo);
  report(findings);
  if (findings.length > 0) {
    failed = true;
    console.error(`repository contract: ${findings.length} problem(s)`);
  } else {
    console.log(
      `repository contract valid: ${repository.skills.length} sidecar(s), ${repository.profiles.length} profile(s), ` +
        `${repository.lock.imports.length} import record(s), ${repository.registry.capabilities.length} capabilities`,
    );
  }
}
process.exit(failed ? 1 : 0);
