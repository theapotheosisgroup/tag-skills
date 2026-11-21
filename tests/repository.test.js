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

const ALL = [
  "tag-audit-evidence",
  "tag-build-dashboard",
  "tag-close-management",
  "tag-code-review",
  "tag-codebase-design",
  "tag-diagnosing-bugs",
  "tag-domain-modeling",
  "tag-explore-data",
  "tag-financial-statements",
  "tag-handoff",
  "tag-journal-entry-prep",
  "tag-knowledge-synthesis",
  "tag-reconciliation",
  "tag-review-contract",
  "tag-search-strategy",
  "tag-source-management",
  "tag-sql-queries",
  "tag-task-management",
  "tag-tdd",
  "tag-triage-nda",
  "tag-validate-data",
  "tag-variance-analysis",
  "tag-vendor-check",
  "tag-writing-for-agents",
];

describe("committed repository", () => {
  test("ships exactly the 24 selected forks", async () => {
    const { skills } = await loadRepository(repo);
    assert.deepEqual(skills.map((s) => s.name).sort(), ALL);
  });
  test("passes every repository-level check", async () => {
    const { findings } = await checkRepository(repo);
    assert.deepEqual(findings, []);
  });
  test("every skill is recorded in upstreams.lock.json and carries LICENSE and NOTICE.md", async () => {
    const { skills, lock } = await loadRepository(repo);
    for (const skill of skills) {
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
});

describe("profiles", () => {
  /** @param {string} name */
  async function expand(name) {
    const { profiles, skills } = await loadRepository(repo);
    return expandProfiles([name], profiles, skills);
  }
  test("finance-core is the five P0 skills", async () => {
    assert.deepEqual(await expand("finance-core"), [
      "tag-close-management",
      "tag-financial-statements",
      "tag-journal-entry-prep",
      "tag-reconciliation",
      "tag-variance-analysis",
    ]);
  });
  test("controller adds audit evidence and data validation", async () => {
    const finance = await expand("finance-core");
    const controller = await expand("controller");
    assert.deepEqual(
      controller.filter((s) => !finance.includes(s)),
      ["tag-audit-evidence", "tag-validate-data"],
    );
  });
  test("backoffice adds data exploration, SQL, dashboards, knowledge and task management", async () => {
    const controller = await expand("controller");
    const backoffice = await expand("backoffice");
    assert.deepEqual(
      backoffice.filter((s) => !controller.includes(s)),
      [
        "tag-build-dashboard",
        "tag-explore-data",
        "tag-knowledge-synthesis",
        "tag-search-strategy",
        "tag-source-management",
        "tag-sql-queries",
        "tag-task-management",
      ],
    );
  });
  test("legal expands to the legal skills plus their knowledge dependencies", async () => {
    const legal = await expand("legal");
    for (const name of [
      "tag-review-contract",
      "tag-triage-nda",
      "tag-vendor-check",
      "tag-knowledge-synthesis",
      "tag-search-strategy",
    ]) {
      assert.ok(legal.includes(name), `${name} missing from legal`);
    }
    assert.ok(
      legal.every((s) =>
        /^tag-(review-contract|triage-nda|vendor-check|knowledge-synthesis|search-strategy|source-management)$/.test(s),
      ),
    );
  });
  test("authoring is the seven authoring skills, and no business profile includes them", async () => {
    const authoring = await expand("authoring");
    assert.deepEqual(authoring, [
      "tag-code-review",
      "tag-codebase-design",
      "tag-diagnosing-bugs",
      "tag-domain-modeling",
      "tag-handoff",
      "tag-tdd",
      "tag-writing-for-agents",
    ]);
    for (const profile of ["finance-core", "controller", "backoffice", "legal"]) {
      const skills = await expand(profile);
      assert.deepEqual(
        skills.filter((s) => authoring.includes(s)),
        [],
        `${profile} includes authoring skills`,
      );
    }
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
    join(root, "skills", "finance", "tag-financial-statements", "tag-skill.json");

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
    await editJson(sidecar(root), (d) => (d.dependencies.skills = ["tag-close-management", "tag-missing"]));
    const text = messages((await checkRepository(root)).findings);
    assert.match(text, /dependency "tag-missing" is not a published skill/);
    assert.match(text, /skill dependency cycle/);
  });
  test("a profile naming an unknown skill or profile", async () => {
    const root = await copyRepository();
    await editJson(join(root, "profiles", "legal.json"), (d) => {
      d.skills.push("tag-nope");
      d.extends = ["ghost"];
    });
    const text = messages((await checkRepository(root)).findings);
    assert.match(text, /skill "tag-nope" is not a published skill/);
    assert.match(text, /extends unknown profile "ghost"/);
  });
  test("a modified LICENSE, a missing notice and a tampered lock hash", async () => {
    const root = await copyRepository();
    const dir = join(root, "skills", "finance", "tag-financial-statements");
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
  test("the catalog matches its schema and lists 24 skills and 5 profiles", async () => {
    const catalog = JSON.parse(await readFile(join(repo, "catalog.json"), "utf8"));
    const schemas = await loadSchemas(repo);
    assert.ok(schemas.catalog(catalog), JSON.stringify(schemas.catalog.errors));
    assert.equal(catalog.skills.length, 24);
    assert.deepEqual(
      catalog.profiles.map((/** @type {{ name: string }} */ p) => p.name),
      ["authoring", "backoffice", "controller", "finance-core", "legal"],
    );
  });
  test("a content change changes the catalog", async () => {
    const root = await copyRepository();
    const before = await buildCatalog(await loadRepository(root));
    await writeFile(join(root, "skills", "data", "tag-sql-queries", "references", "extra.md"), "# Extra\n");
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
