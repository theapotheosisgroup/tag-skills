// Skill packages and releases (ADR 0005): manifests conform to the pinned Agent Plugins 1.0.0
// schema, every published skill ships in exactly one package, the versioning rules hold, and the
// archives and release index are reproducible.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { sha256 } from "../scripts/lib/hash.js";
import {
  NAMESPACE,
  PLUGIN_SCHEMA_FILE,
  PLUGIN_SCHEMA_ID,
  PLUGIN_SCHEMA_SHA256,
  TIERS,
  changelogSection,
  checkPackages,
  loadPackageSchemas,
  loadPackages,
} from "../scripts/lib/packages.js";
import {
  bumpCovers,
  compareSemver,
  diffPackage,
  emptyIndex,
  mergeIndex,
  planReleases,
  serializeIndex,
  versionLevel,
} from "../scripts/lib/release.js";
import { checkRepository, loadRepository } from "../scripts/lib/repository.js";
import { tar } from "../scripts/lib/tar.js";
import { repo } from "./helpers.js";

const CONTEXT = { commit: "0123456789abcdef0123456789abcdef01234567", publishedAt: "2026-11-22T12:00:00Z" };
const LATER = { commit: "89abcdef0123456789abcdef0123456789abcdef", publishedAt: "2026-12-01T09:30:00Z" };

/** Copies the repository (without node_modules, .git and dist) into a temporary directory. */
async function copyRepo() {
  const dir = await mkdtemp(join(tmpdir(), "tag-release-repo-"));
  const skip = new Set(["node_modules", ".git", "dist"]);
  await cp(repo, dir, {
    recursive: true,
    filter: (source) => !skip.has(source.slice(repo.length + 1).split("/")[0]),
  });
  return dir;
}

/** @param {string} root @param {string} name @param {(manifest: any) => void} change */
async function editManifest(root, name, change) {
  const path = join(root, "packages", name, "plugin.json");
  const manifest = JSON.parse(await readFile(path, "utf8"));
  change(manifest);
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** @param {string} root @param {string} name @param {string} version @param {string} body */
async function addChangelogSection(root, name, version, body) {
  const path = join(root, "packages", name, "CHANGELOG.md");
  const text = await readFile(path, "utf8");
  await writeFile(path, text.replace("## [Unreleased]\n", `## [Unreleased]\n\n## [${version}]\n\n${body}\n`));
}

/** @param {string} root @param {string} skillPath @param {string} version */
async function setSkillVersion(root, skillPath, version) {
  const path = join(root, skillPath, "tag-skill.json");
  const meta = JSON.parse(await readFile(path, "utf8"));
  meta.version = version;
  await writeFile(path, `${JSON.stringify(meta, null, 2)}\n`);
}

/** Checks and plans a repository tree against a previous index. */
async function plan(/** @type {string} */ root, /** @type {any} */ previous, context = CONTEXT) {
  const { repository, findings: repoFindings } = await checkRepository(root);
  const { packages, findings } = await checkPackages(root, repository);
  assert.deepEqual([...repoFindings, ...findings], [], "the tree must be valid before planning");
  const result = await planReleases(packages, repository, previous, context);
  return { ...result, packages, index: mergeIndex(previous, result.releases, packages) };
}

/** @param {string} root */
const findingsOf = async (root) =>
  (await checkPackages(root, await loadRepository(root))).findings.map((f) => f.message);

describe("package manifests", () => {
  test("the vendored Agent Plugins schema is the pinned 1.0.0 schema, byte for byte", async () => {
    const bytes = await readFile(join(repo, PLUGIN_SCHEMA_FILE));
    assert.equal(sha256(bytes), PLUGIN_SCHEMA_SHA256);
    assert.equal(JSON.parse(bytes.toString("utf8")).$id, PLUGIN_SCHEMA_ID);
  });

  test("every manifest validates against the pinned schema and TAG's extension schema", async () => {
    const schemas = await loadPackageSchemas(repo);
    const { packages, findings } = await loadPackages(repo);
    assert.deepEqual(findings, []);
    assert.ok(packages.length > 0);
    for (const pkg of packages) {
      /** @type {any} */
      const manifest = pkg.manifest;
      assert.ok(Boolean(schemas.plugin(manifest)), `${pkg.name}: ${JSON.stringify(schemas.plugin.errors)}`);
      assert.equal(manifest.$schema, PLUGIN_SCHEMA_ID);
      assert.ok(schemas.extension(manifest.extensions[NAMESPACE]), `${pkg.name} extension`);
    }
  });

  test("the committed packages pass every package check", async () => {
    assert.deepEqual(await findingsOf(repo), []);
  });

  test("every published skill appears in exactly one package", async () => {
    const repository = await loadRepository(repo);
    const { packages } = await loadPackages(repo);
    const listed = packages.flatMap((p) => p.skills.map((s) => s.name)).sort();
    assert.deepEqual(listed, repository.skills.map((s) => s.name).sort());
    assert.equal(new Set(listed).size, listed.length);
  });

  test("the packages are the pillars with skills, plus the shared knowledge package", async () => {
    const { packages } = await loadPackages(repo);
    assert.deepEqual(
      packages.map((p) => p.name),
      ["tag-finance", "tag-governance", "tag-knowledge"],
    );
  });

  test("rejects a skill listed twice, a skill in no package and an unknown skill", async () => {
    const root = await copyRepo();
    try {
      await editManifest(root, "tag-governance", (m) => {
        m.extensions[NAMESPACE].skills.push({ name: "governance-search-strategy", tier: "foundation" });
      });
      await editManifest(root, "tag-finance", (m) => {
        m.extensions[NAMESPACE].skills = m.extensions[NAMESPACE].skills.filter(
          (/** @type {any} */ s) => s.name !== "finance-explore-data",
        );
        m.extensions[NAMESPACE].skills.push({ name: "finance-not-a-skill", tier: "turnkey" });
      });
      const messages = await findingsOf(root);
      assert.ok(
        messages.some((m) => m.includes('"governance-search-strategy" is listed in tag-governance and tag-knowledge')),
      );
      assert.ok(messages.some((m) => m.includes('"finance-explore-data" is in no package')));
      assert.ok(messages.some((m) => m.includes('"finance-not-a-skill" is not a published skill')));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects fields outside the closed Agent Plugins schema, a bad version and a foreign namespace", async () => {
    const root = await copyRepo();
    try {
      await editManifest(root, "tag-finance", (m) => {
        m.skills = "skills";
      });
      await editManifest(root, "tag-knowledge", (m) => {
        m.version = "1.0";
        m.extensions["com.example.client"] = {};
      });
      const messages = await findingsOf(root);
      assert.ok(messages.some((m) => m.startsWith("Agent Plugins 1.0.0:") && m.includes("additional properties")));
      assert.ok(messages.some((m) => m.includes('"version" must be a semantic version')));
      assert.ok(messages.some((m) => m.includes('"com.example.client" is not TAG')));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects a tier below a dependency's tier, a missing changelog section and stray files", async () => {
    const root = await copyRepo();
    try {
      await editManifest(root, "tag-finance", (m) => {
        for (const s of m.extensions[NAMESPACE].skills) if (s.name === "finance-reconciliation") s.tier = "turnkey";
        m.version = "0.9.0";
      });
      await writeFile(join(root, "packages", "tag-finance", "mcp.json"), "{}\n");
      const messages = await findingsOf(root);
      assert.ok(
        messages.some((m) => m.includes('"finance-close-management" (structure) depends on "finance-reconciliation"')),
      );
      assert.ok(messages.some((m) => m.includes("no `## [0.9.0]` section")));
      assert.ok(messages.some((m) => m.includes("holds only plugin.json and CHANGELOG.md")));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("the packages README tier table matches the manifests", async () => {
    const readme = await readFile(join(repo, "packages", "README.md"), "utf8");
    const { packages } = await loadPackages(repo);
    for (const pkg of packages) {
      const row = readme.split("\n").find((line) => line.startsWith(`| \`${pkg.name}\``));
      assert.ok(row, `${pkg.name} missing from packages/README.md`);
      const cells = row
        .split("|")
        .slice(2, 2 + TIERS.length)
        .map((cell) =>
          cell
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
            .sort(),
        );
      TIERS.forEach((tier, i) => {
        const expected = pkg.skills
          .filter((skill) => skill.tier === tier)
          .map((skill) => skill.name)
          .sort();
        assert.deepEqual(cells[i], expected, `${pkg.name} ${tier}`);
      });
    }
  });

  test("changelogSection returns one version's section", () => {
    const text = "# C\n\n## [Unreleased]\n\n## [1.2.0] - 2026-11-22\n\n### Added\n\n- x\n\n## [1.1.0]\n\n- y\n";
    assert.equal(changelogSection(text, "1.2.0"), "### Added\n\n- x");
    assert.equal(changelogSection(text, "1.1.0"), "- y");
    assert.equal(changelogSection(text, "1.0.0"), null);
  });
});

describe("versioning rules", () => {
  test("compareSemver follows SemVer precedence", () => {
    const ordered = [
      "0.1.0",
      "0.1.1",
      "0.2.0",
      "1.0.0-alpha",
      "1.0.0-alpha.1",
      "1.0.0-beta.2",
      "1.0.0-beta.11",
      "1.0.0",
      "1.10.0",
    ];
    for (let i = 1; i < ordered.length; i++) assert.ok(compareSemver(ordered[i - 1], ordered[i]) < 0, ordered[i]);
    assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
  });

  test("a minor bump below 1.0.0 and a major bump are breaking", () => {
    assert.equal(versionLevel("0.1.0", "0.2.0"), "breaking");
    assert.equal(versionLevel("0.1.0", "0.1.1"), "fix");
    assert.equal(versionLevel("1.2.3", "2.0.0"), "breaking");
    assert.equal(versionLevel("1.2.3", "1.3.0"), "feature");
    assert.equal(versionLevel("1.2.3", "1.2.4"), "fix");
    assert.throws(() => versionLevel("1.0.0", "1.0.0"));
    assert.ok(bumpCovers("feature", "0.1.0", "0.1.1"));
    assert.ok(!bumpCovers("feature", "1.0.0", "1.0.1"));
    assert.ok(!bumpCovers("breaking", "0.1.0", "0.1.1"));
    assert.ok(bumpCovers("breaking", "0.1.0", "0.2.0"));
  });

  test("diffPackage classifies skill changes", () => {
    const skill = {
      name: "finance-x",
      version: "1.0.0",
      tier: "foundation",
      contentHash: `sha256:${"a".repeat(64)}`,
      sideEffects: "read",
      invocation: "model",
      requiredCapabilities: ["tag.a"],
      requiredInputs: ["period"],
      outputs: ["report"],
      dependencies: [],
    };
    const base = { skills: [skill], requires: {}, agentPlugins: "1.0.0" };
    /** @param {object} change */
    const level = (change, requires = {}) =>
      diffPackage(base, {
        ...base,
        requires,
        skills: [{ ...skill, contentHash: `sha256:${"b".repeat(64)}`, version: "1.0.1", ...change }],
      }).level;
    assert.equal(level({}), "fix");
    assert.equal(level({ version: "1.1.0" }), "feature");
    assert.equal(level({ version: "2.0.0" }), "breaking");
    assert.equal(level({ tier: "structure" }), "breaking");
    assert.equal(level({ sideEffects: "authorized-write" }), "breaking");
    assert.equal(level({ invocation: "user" }), "breaking");
    assert.equal(level({ requiredCapabilities: ["tag.a", "tag.b"] }), "breaking");
    assert.equal(level({ requiredInputs: ["period", "entity"] }), "breaking");
    assert.equal(level({ outputs: [] }), "breaking");
    assert.equal(level({ outputs: ["report", "chart"] }), "feature");
    assert.equal(level({}, { "tag-knowledge": "^0.1.0" }), "breaking");
    assert.equal(diffPackage(base, { ...base, skills: [] }).level, "breaking");
    const unchangedVersion = diffPackage(base, {
      ...base,
      skills: [{ ...skill, contentHash: `sha256:${"b".repeat(64)}` }],
    });
    assert.match(unchangedVersion.errors[0], /changed since the previous release/);
  });
});

describe("release index and archives", () => {
  test("planning and index generation are deterministic", async () => {
    const first = await plan(repo, emptyIndex());
    const second = await plan(repo, emptyIndex());
    assert.deepEqual(first.errors, []);
    assert.equal(first.releases.length, first.packages.length);
    assert.equal(serializeIndex(first.index), serializeIndex(second.index));
    for (let i = 0; i < first.releases.length; i++) {
      assert.ok(first.releases[i].archive.equals(second.releases[i].archive), first.releases[i].entry.tag);
    }
    const schemas = await loadPackageSchemas(repo);
    assert.ok(schemas.index(first.index), JSON.stringify(schemas.index.errors));
    // The previous index's package order does not matter.
    const reversed = { ...first.index, packages: [...first.index.packages].reverse() };
    assert.equal(serializeIndex(mergeIndex(reversed, [], first.packages)), serializeIndex(first.index));
  });

  test("the index records versions, checksums, tiers, requirements and the minimum Agent Plugins version", async () => {
    const { index, releases } = await plan(repo, emptyIndex());
    assert.equal(index.agentPlugins.schema, PLUGIN_SCHEMA_ID);
    assert.deepEqual(index.tiers, [...TIERS]);
    const governance = index.packages.find((/** @type {any} */ p) => p.name === "tag-governance");
    const entry = governance.versions[0];
    assert.equal(governance.channels.stable, entry.version);
    assert.equal(entry.agentPlugins, "1.0.0");
    assert.deepEqual(entry.requires, { "tag-knowledge": "^0.1.0" });
    assert.equal(
      entry.archive.url,
      `https://github.com/theapotheosisgroup/tag-skills/releases/download/${entry.tag}/${entry.archive.name}`,
    );
    const release = releases.find((r) => r.entry.tag === entry.tag);
    assert.equal(entry.archive.sha256, sha256(/** @type {Buffer} */ (release?.archive)));
    for (let i = 1; i < TIERS.length; i++) {
      for (const name of entry.tiers[TIERS[i - 1]])
        assert.ok(entry.tiers[TIERS[i]].includes(name), `tiers are cumulative: ${name}`);
    }
    assert.deepEqual([...entry.tiers.turnkey].sort(), entry.skills.map((/** @type {any} */ s) => s.name).sort());
  });

  test("published versions are immutable and stable skips pre-releases", async () => {
    const { index, releases, packages } = await plan(repo, emptyIndex());
    assert.throws(() => mergeIndex(index, releases, packages), /immutable/);
    const pre = { ...releases[0], entry: { ...releases[0].entry, version: "9.0.0-rc.1", prerelease: true } };
    const merged = mergeIndex(index, [pre], packages);
    const record = merged.packages.find((/** @type {any} */ p) => p.name === pre.pkg.name);
    assert.equal(record.versions[0].version, "9.0.0-rc.1");
    assert.equal(record.channels.stable, releases[0].entry.version);
  });

  test("an unchanged tree releases nothing; a changed skill is pending until the version is bumped", async () => {
    const root = await copyRepo();
    try {
      const initial = (await plan(root, emptyIndex())).index;
      const unchanged = await plan(root, initial, LATER);
      assert.equal(unchanged.releases.length, 0);
      assert.deepEqual(unchanged.pending, []);
      assert.equal(serializeIndex(unchanged.index), serializeIndex(initial));

      const skill = join(root, "skills", "finance", "finance-reconciliation", "SKILL.md");
      await writeFile(skill, `${await readFile(skill, "utf8")}\n`);
      const pending = await plan(root, initial, LATER);
      assert.equal(pending.releases.length, 0);
      assert.deepEqual(
        pending.pending.map((p) => p.package),
        ["tag-finance"],
      );

      // Bumping the package without bumping the changed skill is refused.
      await editManifest(root, "tag-finance", (m) => (m.version = "0.1.1"));
      await addChangelogSection(root, "tag-finance", "0.1.1", "### Fixed\n\n- Reconciliation wording.");
      const refused = await plan(root, initial, LATER);
      assert.ok(refused.errors.some((e) => e.includes("finance-reconciliation changed since the previous release")));

      await setSkillVersion(root, "skills/finance/finance-reconciliation", "0.1.1");
      const released = await plan(root, initial, LATER);
      assert.deepEqual(released.errors, []);
      assert.deepEqual(
        released.releases.map((r) => r.entry.tag),
        ["tag-finance@0.1.1"],
      );
      const entry = released.releases[0].entry;
      assert.equal(entry.previous, "0.1.0");
      assert.equal(entry.breaking, false);
      assert.deepEqual(entry.changes, ["fix: finance-reconciliation 0.1.0 -> 0.1.1"]);
      assert.equal(entry.changelog, "### Fixed\n\n- Reconciliation wording.");
      const finance = released.index.packages.find((/** @type {any} */ p) => p.name === "tag-finance");
      assert.deepEqual(
        finance.versions.map((/** @type {any} */ v) => v.version),
        ["0.1.1", "0.1.0"],
      );
      assert.equal(finance.channels.stable, "0.1.1");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("a breaking change needs a breaking version bump", async () => {
    const root = await copyRepo();
    try {
      const initial = (await plan(root, emptyIndex())).index;
      await editManifest(root, "tag-finance", (m) => {
        for (const s of m.extensions[NAMESPACE].skills) if (s.name === "finance-variance-analysis") s.tier = "turnkey";
        m.version = "0.1.1";
      });
      await addChangelogSection(root, "tag-finance", "0.1.1", "### Changed\n\n- Variance analysis moves to Turnkey.");
      const refused = await plan(root, initial, LATER);
      assert.ok(
        refused.errors.some((e) => e.includes("too small for a breaking change") && e.includes("structure to turnkey")),
      );

      await editManifest(root, "tag-finance", (m) => (m.version = "0.2.0"));
      await addChangelogSection(root, "tag-finance", "0.2.0", "### Changed\n\n- Variance analysis moves to Turnkey.");
      const released = await plan(root, initial, LATER);
      assert.deepEqual(released.errors, []);
      assert.equal(released.releases[0].entry.breaking, true);
      assert.deepEqual(released.releases[0].entry.changes, [
        "breaking: finance-variance-analysis moved from structure to turnkey",
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("the CLI builds reproducibly and verifies its archives with the system tar", async () => {
    const work = await mkdtemp(join(tmpdir(), "tag-release-cli-"));
    try {
      const args = ["--commit", CONTEXT.commit, "--date", CONTEXT.publishedAt];
      /** @param {string[]} extra */
      const run = (...extra) =>
        spawnSync(process.execPath, [join(repo, "scripts", "release.js"), ...extra], { encoding: "utf8" });
      const a = run("build", "--out", join(work, "a"), ...args);
      assert.equal(a.status, 0, a.stderr);
      const b = run("build", "--out", join(work, "b"), ...args);
      assert.equal(b.status, 0, b.stderr);
      const planned = JSON.parse(await readFile(join(work, "a", "plan.json"), "utf8"));
      for (const file of [
        "index.json",
        "plan.json",
        ...planned.releases.flatMap((/** @type {any} */ r) => [r.archive, r.notes]),
      ]) {
        assert.ok((await readFile(join(work, "a", file))).equals(await readFile(join(work, "b", file))), file);
      }
      const verified = run("verify", "--out", join(work, "a"));
      assert.equal(verified.status, 0, verified.stderr);
      assert.match(verified.stdout, /verified 3 release\(s\) and index\.json/);
      const listing = spawnSync("tar", ["-tzf", join(work, "a", "tag-finance-0.1.0.tar.gz")], { encoding: "utf8" });
      assert.ok(listing.stdout.split("\n").includes("tag-finance/plugin.json"));
      assert.ok(listing.stdout.split("\n").includes("tag-finance/skills/finance-reconciliation/SKILL.md"));
      assert.ok(!listing.stdout.split("\n").some((line) => line.startsWith("tag-finance/skills/finance/")));
      const busy = run("build", "--out", join(work, "a"), ...args);
      assert.notEqual(busy.status, 0, "a non-empty directory outside dist/ is never cleared");
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  });

  test("tar splits long paths into ustar prefix and name, and refuses unsafe paths", () => {
    const long = `${"a".repeat(80)}/${"b".repeat(60)}/file.txt`;
    const archive = tar([{ path: long, data: Buffer.from("x") }], 0);
    assert.equal(archive.length % 10240, 0);
    const name = archive.subarray(0, 100).toString("utf8").replace(/\0+$/, "");
    const prefix = archive.subarray(345, 500).toString("utf8").replace(/\0+$/, "");
    assert.ok(name.length <= 100 && prefix.length <= 155 && prefix.length > 0);
    assert.equal(`${prefix}/${name}`, long);
    assert.throws(() => tar([{ path: "../x", data: Buffer.from("") }], 0), /unsafe/);
    assert.throws(() => tar([{ path: "/x", data: Buffer.from("") }], 0), /unsafe/);
  });
});
