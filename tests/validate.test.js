// Unit tests for scripts/lib/validate.js. Invalid skills are built in temporary directories,
// so no broken SKILL.md is committed where the Skills CLI or a client could pick it up.

import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  checkFrontmatter,
  relativeLinks,
  splitFrontmatter,
  validateRoot,
  validateSkill,
} from "../scripts/lib/validate.js";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
let work = "";
let counter = 0;

before(async () => {
  work = await mkdtemp(join(tmpdir(), "tag-skills-test-"));
});
after(async () => {
  await rm(work, { recursive: true, force: true });
});

/**
 * Creates a skill directory from a map of relative paths to contents.
 * @param {string} name
 * @param {Record<string, string>} files
 */
async function makeSkill(name, files) {
  const root = join(work, `root-${counter++}`);
  const dir = join(root, name);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return { root, dir };
}

const valid = (name = "demo-skill", extra = "") =>
  `---\nname: ${name}\ndescription: Does a demo thing. Use when testing.\n${extra}---\n\n# Demo\n\nInstructions.\n`;

/** @param {{ message: string }[]} findings */
const messages = (findings) => findings.map((f) => f.message).join("\n");

describe("splitFrontmatter", () => {
  test("splits frontmatter and body", () => {
    assert.deepEqual(splitFrontmatter("---\nname: a\n---\nbody\n"), { frontmatter: "name: a\n", body: "body\n" });
  });
  test("accepts CRLF and a BOM", () => {
    assert.equal(splitFrontmatter("\uFEFF---\r\nname: a\r\n---\r\nbody")?.frontmatter, "name: a\n");
  });
  test("rejects a missing or unterminated block", () => {
    assert.equal(splitFrontmatter("# no frontmatter"), null);
    assert.equal(splitFrontmatter("---\nname: a\n"), null);
    assert.equal(splitFrontmatter("---\nname: a\n---trailing\n"), null);
  });
});

describe("checkFrontmatter", () => {
  const base = { name: "demo", description: "Does things." };
  test("accepts the minimum", () => assert.deepEqual(checkFrontmatter(base, "demo"), []));
  test("accepts every specification field", () => {
    const full = {
      ...base,
      license: "MIT",
      compatibility: "Needs git",
      metadata: { owner: "tag" },
      "allowed-tools": "Read",
    };
    assert.deepEqual(checkFrontmatter(full, "demo"), []);
  });
  test("requires name and description", () => {
    assert.match(checkFrontmatter({}, "demo").join("\n"), /"name" is required[\s\S]*"description" is required/);
  });
  test("rejects a non-mapping", () => {
    assert.deepEqual(checkFrontmatter(["a"], "demo"), ["frontmatter must be a YAML mapping"]);
  });
  for (const bad of ["Demo", "demo--x", "-demo", "demo-", "de_mo", "a".repeat(65)]) {
    test(`rejects the name ${JSON.stringify(bad.slice(0, 12))}`, () => {
      assert.notDeepEqual(checkFrontmatter({ ...base, name: bad }, bad), []);
    });
  }
  test("requires the name to equal the directory", () => {
    assert.match(checkFrontmatter(base, "other").join(), /directory is "other"/);
  });
  test("limits description length", () => {
    assert.match(checkFrontmatter({ ...base, description: "x".repeat(1025) }, "demo").join(), /longer than 1024/);
    assert.match(checkFrontmatter({ ...base, description: "   " }, "demo").join(), /non-empty/);
  });
  test("rejects unknown fields", () => {
    assert.match(checkFrontmatter({ ...base, token: "x" }, "demo").join(), /unknown frontmatter field "token"/);
  });
  test("rejects non-string metadata values other than internal", () => {
    assert.match(checkFrontmatter({ ...base, metadata: { n: 1 } }, "demo").join(), /"metadata.n" must be a string/);
  });
  test("a published skill must not be internal", () => {
    assert.match(checkFrontmatter({ ...base, metadata: { internal: true } }, "demo").join(), /must not set/);
  });
  test("a fixture must be internal", () => {
    assert.match(checkFrontmatter(base, "demo", { fixture: true }).join(), /must set/);
    assert.deepEqual(checkFrontmatter({ ...base, metadata: { internal: true } }, "demo", { fixture: true }), []);
  });
});

describe("relativeLinks", () => {
  test("collects relative links, drops URLs, fragments and code", () => {
    const body = [
      "[a](references/a.md) ![b](assets/b.png#x) [c](https://example.com) [d](#top)",
      "[e](mailto:x@example.com) `[f](not/a/link.md)`",
      "```\n[g](also/not.md)\n```",
      "[h]: scripts/h.sh",
    ].join("\n");
    assert.deepEqual(relativeLinks(body), ["references/a.md", "assets/b.png", "scripts/h.sh"]);
  });
  test("collects links with double-quoted, single-quoted and parenthesised titles", () => {
    const body = `[a](references/a.md "A") [b](references/b.md 'B') [c](references/c.md (C))`;
    assert.deepEqual(relativeLinks(body), ["references/a.md", "references/b.md", "references/c.md"]);
  });
  test("decodes percent-escapes and keeps targets that are not valid URI encoding", () => {
    const body = "[a](references/my%20guide.md) [b](reports/100%.md) [c](a%zz.md)";
    assert.deepEqual(relativeLinks(body), ["references/my guide.md", "reports/100%.md", "a%zz.md"]);
  });
});

describe("validateSkill", () => {
  test("accepts a complete skill", async () => {
    const { dir } = await makeSkill("demo-skill", {
      "SKILL.md": valid("demo-skill", "") + "\nSee [the guide](references/guide.md).\n",
      "references/guide.md": "# Guide\n",
      "scripts/run.sh": "#!/bin/sh\n",
      "assets/logo.txt": "logo",
      LICENSE: "MIT",
    });
    await chmod(join(dir, "scripts/run.sh"), 0o755);
    assert.deepEqual(await validateSkill(dir), []);
  });
  test("reports a missing SKILL.md", async () => {
    const { dir } = await makeSkill("demo-skill", { "references/x.md": "x" });
    assert.match(messages(await validateSkill(dir)), /SKILL.md is missing/);
  });
  test("reports invalid YAML and duplicate keys", async () => {
    const { dir } = await makeSkill("demo-skill", { "SKILL.md": "---\nname: demo-skill\nname: again\n---\nx\n" });
    assert.match(messages(await validateSkill(dir)), /invalid YAML/);
  });
  test("reports an empty body", async () => {
    const { dir } = await makeSkill("demo-skill", { "SKILL.md": "---\nname: demo-skill\ndescription: d\n---\n" });
    assert.match(messages(await validateSkill(dir)), /no instructions/);
  });
  test("reports broken and escaping links", async () => {
    const { dir } = await makeSkill("demo-skill", {
      "SKILL.md": valid() + "\n[missing](references/none.md) [out](../other/SKILL.md)\n",
    });
    const text = messages(await validateSkill(dir));
    assert.match(text, /"references\/none.md" does not resolve/);
    assert.match(text, /"..\/other\/SKILL.md" points outside/);
  });
  test("reports broken links with single-quoted titles or invalid percent-escapes", async () => {
    const { dir } = await makeSkill("demo-skill", {
      "SKILL.md": valid() + "\n[guide](references/missing.md 'Guide') [report](reports/100%.md)\n",
    });
    const text = messages(await validateSkill(dir));
    assert.match(text, /"references\/missing.md" does not resolve/);
    assert.match(text, /"reports\/100%.md" does not resolve/);
  });
  test("accepts the TAG sidecar and notice files", async () => {
    const { dir } = await makeSkill("demo-skill", {
      "SKILL.md": valid(),
      "tag-skill.json": "{}",
      "NOTICE.md": "# Notice\n",
    });
    assert.deepEqual(await validateSkill(dir), []);
  });
  test("checks links in every bundled Markdown file, not only SKILL.md", async () => {
    const { dir } = await makeSkill("demo-skill", {
      "SKILL.md": valid() + "\nSee [the guide](references/guide.md).\n",
      "references/guide.md": "[back](../SKILL.md) [gone](other.md) [out](../../x.md)\n",
    });
    const text = messages(await validateSkill(dir));
    assert.match(text, /"other.md" does not resolve/);
    assert.match(text, /"..\/..\/x.md" points outside/);
    assert.doesNotMatch(text, /"..\/SKILL.md"/);
  });
  test("reports unexpected entries, credentials, symlinks and non-executable scripts", async () => {
    const { dir } = await makeSkill("demo-skill", {
      "SKILL.md": valid(),
      "notes.txt": "x",
      "assets/.env": "TOKEN=x",
      "scripts/run.sh": "#!/bin/sh\n",
    });
    await chmod(join(dir, "scripts/run.sh"), 0o644);
    await symlink("/etc/hostname", join(dir, "assets", "link"));
    const text = messages(await validateSkill(dir));
    assert.match(text, /unexpected entry/);
    assert.match(text, /suggests a credential/);
    assert.match(text, /symbolic links are not allowed/);
    assert.match(text, /not executable/);
  });
});

/**
 * Creates a published-style root: <root>/<category>/<name>/.
 * @param {Record<string, Record<string, string>>} skills  "category/name" -> files
 */
async function makeRoot(skills) {
  const root = join(work, `cats-${counter++}`);
  for (const [path, files] of Object.entries(skills)) {
    for (const [file, content] of Object.entries(files)) {
      await mkdir(dirname(join(root, path, file)), { recursive: true });
      await writeFile(join(root, path, file), content);
    }
  }
  return root;
}

describe("validateRoot", () => {
  test("flat layout: allows README.md and rejects stray files", async () => {
    const { root } = await makeSkill("demo-skill", { "SKILL.md": valid() });
    await writeFile(join(root, "README.md"), "# Skills\n");
    assert.deepEqual(await validateRoot(root, { layout: "flat" }), {
      skills: ["demo-skill"],
      dirs: [join(root, "demo-skill")],
      findings: [],
    });
    await writeFile(join(root, "stray.md"), "x");
    assert.match(messages((await validateRoot(root, { layout: "flat" })).findings), /only skill directories/);
  });
  test("category layout: accepts pillar-prefixed skills with sidecars inside known categories", async () => {
    const root = await makeRoot({
      "finance/finance-demo": { "SKILL.md": valid("finance-demo"), "tag-skill.json": "{}" },
      "governance/governance-other": { "SKILL.md": valid("governance-other"), "tag-skill.json": "{}" },
      "people/people-onboarding": { "SKILL.md": valid("people-onboarding"), "tag-skill.json": "{}" },
    });
    await writeFile(join(root, "finance", "README.md"), "# Finance\n");
    const result = await validateRoot(root);
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.skills, ["finance-demo", "governance-other", "people-onboarding"]);
  });
  test("category layout: rejects unknown categories, missing sidecars, a wrong prefix and duplicate names", async () => {
    const root = await makeRoot({
      "misc/misc-demo": { "SKILL.md": valid("misc-demo"), "tag-skill.json": "{}" },
      "data/finance-data": { "SKILL.md": valid("finance-data"), "tag-skill.json": "{}" },
      "finance/demo": { "SKILL.md": valid("demo"), "tag-skill.json": "{}" },
      "finance/tag-demo": { "SKILL.md": valid("tag-demo"), "tag-skill.json": "{}" },
      "finance/finance-nometa": { "SKILL.md": valid("finance-nometa") },
      "finance/governance-twice": { "SKILL.md": valid("governance-twice"), "tag-skill.json": "{}" },
      "governance/governance-twice": { "SKILL.md": valid("governance-twice"), "tag-skill.json": "{}" },
    });
    const text = messages((await validateRoot(root)).findings);
    assert.match(text, /unknown category "misc"/);
    assert.match(text, /unknown category "data"/);
    assert.match(text, /in "finance" must be named "finance-<name>", got "demo"/);
    assert.match(text, /in "finance" must be named "finance-<name>", got "tag-demo"/);
    assert.match(text, /in "finance" must be named "finance-<name>", got "governance-twice"/);
    assert.match(text, /tag-skill.json is missing/);
    assert.match(text, /skill name "governance-twice" is also used/);
  });
  test("reports a missing root", async () => {
    assert.match(messages((await validateRoot(join(work, "nope"))).findings), /does not exist/);
  });
  test("the committed fixture is a valid, hidden fixture", async () => {
    const result = await validateRoot(join(repo, "tests", "fixtures", "skills"), { fixture: true });
    assert.deepEqual(result.findings, []);
    assert.deepEqual(result.skills, ["tag-test-fixture"]);
  });
  test("the committed skills root is valid", async () => {
    assert.deepEqual((await validateRoot(join(repo, "skills"))).findings, []);
  });
});
