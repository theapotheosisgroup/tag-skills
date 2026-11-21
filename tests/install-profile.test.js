// Unit tests for the profile installer's validation and argument construction. The installation
// itself, against the pinned Skills CLI, is in scripts/smoke-skills-cli.js (npm run test:install).

import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { DEFAULT_SOURCE, planInstall } from "../scripts/install-profile.js";
import { loadRepository } from "../scripts/lib/repository.js";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const repository = await loadRepository(repo);

/** @param {Partial<import("../scripts/install-profile.js").InstallOptions>} overrides */
const options = (overrides = {}) => ({
  profiles: [],
  skills: [],
  source: DEFAULT_SOURCE,
  agents: ["universal"],
  dir: "/tmp/consumer",
  mode: /** @type {"copy" | "symlink"} */ ("symlink"),
  ...overrides,
});

describe("planInstall", () => {
  test("expands a profile and its dependencies into one explicit --skill list", () => {
    const plan = planInstall(options({ profiles: ["legal"] }), repository);
    assert.ok(plan.skills.includes("tag-search-strategy"));
    assert.ok(plan.skills.includes("tag-knowledge-synthesis"));
    assert.deepEqual(plan.args.slice(0, 3), ["add", DEFAULT_SOURCE, "--skill"]);
    assert.deepEqual(plan.args.slice(3, 3 + plan.skills.length), plan.skills);
    assert.deepEqual(plan.args.slice(-3), ["--agent", "universal", "--yes"]);
  });
  test("a single skill brings its declared dependencies", () => {
    const plan = planInstall(options({ skills: ["tag-close-management"] }), repository);
    assert.deepEqual(plan.skills, [
      "tag-close-management",
      "tag-financial-statements",
      "tag-journal-entry-prep",
      "tag-reconciliation",
    ]);
  });
  test("pins a remote source with #ref, which the CLI never reads as a skill filter", () => {
    const plan = planInstall(
      options({ profiles: ["finance-core"], ref: "v0.1.0", agents: ["claude-code", "codex"], mode: "copy" }),
      repository,
    );
    assert.equal(plan.args[1], `${DEFAULT_SOURCE}#v0.1.0`);
    assert.deepEqual(plan.args.slice(-6), ["--agent", "claude-code", "--agent", "codex", "--copy", "--yes"]);
  });
  test("a local source is passed as an absolute path and refuses --ref", () => {
    assert.equal(planInstall(options({ profiles: ["authoring"], source: repo }), repository).args[1], repo);
    assert.throws(
      () => planInstall(options({ profiles: ["authoring"], source: repo, ref: "main" }), repository),
      /--ref applies to a remote source/,
    );
  });
  test("validates before anything runs", () => {
    assert.throws(() => planInstall(options(), repository), /at least one --profile or --skill/);
    assert.throws(() => planInstall(options({ profiles: ["nope"] }), repository), /unknown profile "nope"/);
    assert.throws(() => planInstall(options({ skills: ["tag-nope"] }), repository), /unknown skill "tag-nope"/);
    assert.throws(
      () => planInstall(options({ profiles: ["legal"], mode: /** @type {any} */ ("hardlink") }), repository),
      /--mode/,
    );
    assert.throws(() => planInstall(options({ profiles: ["legal"], agents: ["--all"] }), repository), /invalid agent/);
    assert.throws(() => planInstall(options({ profiles: ["legal"], agents: [] }), repository), /at least one --agent/);
    assert.throws(
      () => planInstall(options({ profiles: ["legal"], source: "https://evil.example/x" }), repository),
      /--source/,
    );
    assert.throws(
      () => planInstall(options({ profiles: ["legal"], ref: "--upload-pack=x" }), repository),
      /invalid --ref/,
    );
    assert.throws(() => planInstall(options({ profiles: ["legal"], ref: "a/../b" }), repository), /invalid --ref/);
  });
  test("warns about agents TAG does not test", () => {
    const plan = planInstall(options({ profiles: ["legal"], agents: ["cursor"] }), repository);
    assert.match(plan.warnings.join(), /"cursor" is passed to the Skills CLI but not tested/);
  });
});
