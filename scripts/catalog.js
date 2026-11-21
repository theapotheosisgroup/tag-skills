#!/usr/bin/env node
// Generates or checks catalog.json.
//
//   node scripts/catalog.js           write catalog.json
//   node scripts/catalog.js --check   exit 1 if catalog.json is not what generation would write
//
// Run the validator first: generation assumes valid sidecars.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { buildCatalog } from "./lib/catalog.js";
import { loadRepository, loadSchemas } from "./lib/repository.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } });
const target = join(root, "catalog.json");

const content = await buildCatalog(await loadRepository(root));
const schemas = await loadSchemas(root);
if (!schemas.catalog(JSON.parse(content))) {
  console.error(
    `generated catalog does not match schemas/catalog.schema.json: ${JSON.stringify(schemas.catalog.errors)}`,
  );
  process.exit(1);
}
if (values.check) {
  let current;
  try {
    current = await readFile(target, "utf8");
  } catch {
    current = "";
  }
  if (current !== content) {
    console.error("catalog.json is out of date: run `npm run catalog:generate` and commit the result");
    process.exit(1);
  }
  console.log(`catalog.json is up to date (${JSON.parse(content).skills.length} skills)`);
} else {
  await writeFile(target, content);
  console.log(`wrote catalog.json (${JSON.parse(content).skills.length} skills)`);
}
