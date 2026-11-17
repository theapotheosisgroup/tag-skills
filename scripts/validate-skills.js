#!/usr/bin/env node
// Validates skills against the Agent Skills format and TAG's skill rules.
//
//   node scripts/validate-skills.js [--fixtures] [root ...]
//
// Each root is a flat directory of skills (default: skills). With --fixtures, every skill must be
// marked `metadata.internal: true` so the Skills CLI hides it from installers.
// Exit codes: 0 valid, 1 findings, 2 usage error.

import { relative } from "node:path";
import { parseArgs } from "node:util";
import { validateRoot } from "./lib/validate.js";

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
  console.log("usage: node scripts/validate-skills.js [--fixtures] [root ...]");
  process.exit(0);
}

const roots = parsed.positionals.length > 0 ? parsed.positionals : ["skills"];
const fixture = parsed.values.fixtures;
let failed = false;

for (const root of roots) {
  const { skills, findings } = await validateRoot(root, { fixture });
  for (const finding of findings) {
    console.error(`${relative(process.cwd(), finding.path) || finding.path}: ${finding.message}`);
  }
  const kind = fixture ? "test fixture skill(s)" : "skill(s)";
  if (findings.length > 0) {
    failed = true;
    console.error(`${root}: ${findings.length} problem(s) in ${skills.length} ${kind}`);
  } else {
    console.log(`${root}: ${skills.length} ${kind} valid${skills.length ? `: ${skills.join(", ")}` : ""}`);
  }
}
process.exit(failed ? 1 : 0);
