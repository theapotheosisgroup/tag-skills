// Repository contract: sidecars, profiles, provenance, capability registry and catalog.
// Mutations are made on temporary copies of the repository's contract files, never in place.

import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildCatalog } from "../scripts/lib/catalog.js";
import { checkRepository, expandProfiles, loadRepository, loadSchemas } from "../scripts/lib/repository.js";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
let work = "";
let counter = 0;

before(async () => {
  work = await mkdtemp(join(tmpdir(), "tag-skills-repo-test-"));
});
after(async () => {
  await rm(work, { recursive: true, force: true });
});

/** Copies the contract files into a fresh temporary repository root. */
async function copyRepository() {
  const root = join(work, `repo-${counter++}`);
  for (const path of [
    "skills",
    "profiles",
    "schemas",
    "docs/integration",
    "upstreams.lock.json",
    "LICENSES",
    "THIRD_PARTY_NOTICES.md",
  ]) {
    await cp(join(repo, path), join(root, path), { recursive: true });
  }
  return root;
}

/** @param {string} path @param {(data: any) => void} change */
async function editJson(path, change) {
  const data = JSON.parse(await readFile(path, "utf8"));
  change(data);
  await writeFile(path, JSON.stringify(data, null, 2));
}

/** @param {{ message: string }[]} findings */
const messages = (findings) => findings.map((f) => f.message).join("\n");

const FINANCE = [
  "finance-audit-evidence",
  "finance-build-dashboard",
  "finance-close-management",
  "finance-explore-data",
  "finance-financial-statements",
  "finance-journal-entry-prep",
  "finance-reconciliation",
  "finance-validate-data",
  "finance-variance-analysis",
];
/** TAG-original skills: the agent instructions of the agent packages (ADR 0006). No upstream. */
const ORIGINAL = ["governance-concierge", "governance-due-diligence"];
const GOVERNANCE = [
  "governance-concierge",
  "governance-due-diligence",
  "governance-knowledge-synthesis",
  "governance-review-contract",
  "governance-search-strategy",
  "governance-source-management",
  "governance-task-management",
  "governance-triage-nda",
  "governance-vendor-check",
];
const ALL = [...FINANCE, ...GOVERNANCE];

/** Imports removed from the catalog on 2026-11-21: engineering, authoring and SQL skills. */
const REMOVED = [
  "anthropics/knowledge-work-plugins:data/skills/sql-queries",
  "mattpocock/skills:skills/engineering/code-review",
  "mattpocock/skills:skills/engineering/codebase-design",
  "mattpocock/skills:skills/engineering/diagnosing-bugs",
  "mattpocock/skills:skills/engineering/domain-modeling",
  "mattpocock/skills:skills/engineering/tdd",
  "mattpocock/skills:skills/productivity/handoff",
  "mattpocock/skills:skills/productivity/writing-for-agents",
];

describe("committed repository", () => {
  test("ships exactly the 16 back-office forks and the 2 TAG-original agent skills, each prefixed with its pillar", async () => {
    const { skills } = await loadRepository(repo);
    assert.deepEqual(skills.map((s) => s.name).sort(), ALL);
    assert.equal(ALL.filter((name) => !ORIGINAL.includes(name)).length, 16);
    for (const skill of skills) assert.ok(skill.name.startsWith(`${skill.category}-`), skill.name);
  });
  test("passes every repository-level check", async () => {
    const { findings } = await checkRepository(repo);
    assert.deepEqual(findings, []);
  });
  test("every forked skill is recorded in upstreams.lock.json; original skills have no provenance", async () => {
    const { skills, lock } = await loadRepository(repo);
    for (const skill of skills) {
      if (ORIGINAL.includes(skill.name)) {
        assert.deepEqual(skill.meta?.provenance, [], `${skill.name} is TAG-original`);
        assert.ok(!lock.imports.some((/** @type {{ tagName: string }} */ i) => i.tagName === skill.name));
        continue;
      }
      const entry = lock.imports.find((/** @type {{ tagName: string }} */ i) => i.tagName === skill.name);
      assert.ok(entry, `${skill.name} has no import record`);
      assert.deepEqual(skill.meta?.provenance, [entry.id]);
      assert.equal(entry.destination, skill.path);
    }
  });
  test("the dinoclaw_guides skill is recorded as excluded, not imported", async () => {
    const { lock } = await loadRepository(repo);
    assert.equal(lock.blocked[0].status, "excluded");
    assert.match(lock.blocked[0].id, /dinoclaw_guides/);
  });
  test("removed skills keep their provenance as removed records, not imports", async () => {
    const { lock } = await loadRepository(repo);
    const removed = lock.blocked.filter((/** @type {{ status: string }} */ b) => b.status === "removed");
    assert.deepEqual(removed.map((/** @type {{ id: string }} */ b) => b.id).sort(), REMOVED);
    for (const id of REMOVED) {
      assert.ok(!lock.imports.some((/** @type {{ id: string }} */ i) => i.id === id), `${id} is still imported`);
    }
  });
});

describe("profiles", () => {
  /** @param {string} name */
  async function expand(name) {
    const { profiles, skills } = await loadRepository(repo);
    return expandProfiles([name], profiles, skills);
  }
  test("the profiles are the pillars plus backoffice", async () => {
    const { profiles } = await loadRepository(repo);
    assert.deepEqual(profiles.map((p) => p.name).sort(), ["backoffice", "finance", "governance"]);
  });
  test("finance is every finance- skill", async () => {
    assert.deepEqual(await expand("finance"), FINANCE);
  });
  test("governance is every governance- skill", async () => {
    assert.deepEqual(await expand("governance"), GOVERNANCE);
  });
  test("backoffice is the whole catalog", async () => {
    assert.deepEqual(await expand("backoffice"), ALL);
  });
  test("every profile's expansion is closed under dependencies", async () => {
    const { profiles, skills } = await loadRepository(repo);
    const byName = new Map(skills.map((s) => [s.name, s]));
    for (const profile of profiles) {
      const expanded = expandProfiles([profile.name], profiles, skills);
      for (const name of expanded) {
        for (const dep of byName.get(name)?.meta?.dependencies.skills ?? []) {
          assert.ok(expanded.includes(dep), `${profile.name}: ${name} needs ${dep}`);
        }
      }
    }
  });
});

describe("repository checks reject broken contracts", () => {
  const sidecar = (/** @type {string} */ root) =>
    join(root, "skills", "finance", "finance-financial-statements", "tag-skill.json");

  test("an unknown capability", async () => {
    const root = await copyRepository();
    await editJson(sidecar(root), (d) => d.capabilities.push({ name: "tag.nothing.here", required: false, use: "x" }));
    assert.match(
      messages((await checkRepository(root)).findings),
      /"tag.nothing.here" is not in docs\/integration\/capabilities.json/,
    );
  });
  test("a write capability without authorized-write and review", async () => {
    const root = await copyRepository();
    await editJson(sidecar(root), (d) =>
      d.capabilities.push({ name: "tag.ledger.journal_entry.post", required: false, use: "post" }),
    );
    const text = messages((await checkRepository(root)).findings);
    assert.match(text, /must be "authorized-write"/);
    assert.match(text, /does not name capability `tag.ledger.journal_entry.post`/);
  });
  test("a domain that differs from the category, and a schema violation", async () => {
    const root = await copyRepository();
    await editJson(sidecar(root), (d) => {
      d.domain = "legal";
      d.version = "one";
    });
    const text = messages((await checkRepository(root)).findings);
    assert.match(text, /\/version must match pattern/);
  });
  test("a dependency cycle and an unknown dependency", async () => {
    const root = await copyRepository();
    await editJson(sidecar(root), (d) => (d.dependencies.skills = ["finance-close-management", "finance-missing"]));
    const text = messages((await checkRepository(root)).findings);
    assert.match(text, /dependency "finance-missing" is not a published skill/);
    assert.match(text, /skill dependency cycle/);
  });
  test("a profile naming an unknown skill or profile", async () => {
    const root = await copyRepository();
    await editJson(join(root, "profiles", "governance.json"), (d) => {
      d.skills.push("governance-nope");
      d.extends = ["ghost"];
    });
    const text = messages((await checkRepository(root)).findings);
    assert.match(text, /skill "governance-nope" is not a published skill/);
    assert.match(text, /extends unknown profile "ghost"/);
  });
  test("a modified LICENSE, a missing notice and a tampered lock hash", async () => {
    const root = await copyRepository();
    const dir = join(root, "skills", "finance", "finance-financial-statements");
    await writeFile(join(dir, "LICENSE"), "changed");
    await writeFile(join(dir, "NOTICE.md"), "# Notice\n");
    await editJson(join(root, "upstreams.lock.json"), (d) => (d.imports[1].files[0].sha256 = "0".repeat(64)));
    const text = messages((await checkRepository(root)).findings);
    assert.match(text, /LICENSE differs from anthropics\/knowledge-work-plugins:finance\/LICENSE/);
    assert.match(text, /NOTICE.md must name the source/);
    assert.match(text, /sourceHash does not match its file list/);
  });
});

describe("catalog", () => {
  test("generation is reproducible and matches the committed catalog.json", async () => {
    const repository = await loadRepository(repo);
    const first = await buildCatalog(repository);
    const second = await buildCatalog(await loadRepository(repo));
    assert.equal(first, second);
    assert.equal(first, await readFile(join(repo, "catalog.json"), "utf8"));
  });
  test("the catalog matches its schema and lists 18 skills and 3 profiles", async () => {
    const catalog = JSON.parse(await readFile(join(repo, "catalog.json"), "utf8"));
    const schemas = await loadSchemas(repo);
    assert.ok(schemas.catalog(catalog), JSON.stringify(schemas.catalog.errors));
    assert.equal(catalog.skills.length, 18);
    assert.deepEqual(
      catalog.profiles.map((/** @type {{ name: string }} */ p) => p.name),
      ["backoffice", "finance", "governance"],
    );
  });
  test("a content change changes the catalog", async () => {
    const root = await copyRepository();
    const before = await buildCatalog(await loadRepository(root));
    await writeFile(join(root, "skills", "finance", "finance-explore-data", "references", "extra.md"), "# Extra\n");
    assert.notEqual(await buildCatalog(await loadRepository(root)), before);
  });
});

describe("documentation", () => {
  test("the README catalog and profile tables name every skill and profile", async () => {
    const readme = await readFile(join(repo, "README.md"), "utf8");
    const { skills, profiles } = await loadRepository(repo);
    for (const skill of skills)
      assert.ok(readme.includes(`[\`${skill.name}\`](${skill.path}/SKILL.md)`), `${skill.name} missing from README`);
    for (const profile of profiles)
      assert.ok(readme.includes(`| \`${profile.name}\` |`), `profile ${profile.name} missing from README`);
  });
});
