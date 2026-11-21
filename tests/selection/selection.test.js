// Skill-selection evaluation on positive and negative example requests.
//
// Real selection is made by the model from each skill's name and description, after the harness
// filters the catalog by audience (docs/integration/harness-consumption.md). This test checks
// description quality, the part that is objective here, with a deterministic lexical scorer (BM25
// over name and description) as a proxy for the model: the expected skill ranks first for each
// request, both in the audience's catalog and in the unfiltered catalog.
// A pass does not prove model behaviour; the rubric in docs/evaluation-rubric.md covers that.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, test } from "node:test";
import { repo } from "../helpers.js";

const catalog = JSON.parse(await readFile(join(repo, "catalog.json"), "utf8"));
const { cases } = JSON.parse(await readFile(join(repo, "tests", "selection", "cases.json"), "utf8"));

const STOP = new Set(
  "a an and are as at be before but by can do does for from has have here how i if in into is it its me my new no not of on or our so than that the their them then this to up use used uses using we what when where which who why will with you your".split(
    " ",
  ),
);

/** @param {string} text */
function tokens(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => t.replace(/(?:ing|ed|es|s)$/, ""))
    .filter((t) => t.length > 1);
}

/**
 * The harness's catalog for an audience: names and descriptions only.
 * @param {string | null} audience  null for the unfiltered catalog
 */
function offered(audience) {
  return catalog.skills.filter(
    (/** @type {{ audiences: string[] }} */ s) => audience === null || s.audiences.includes(audience),
  );
}

/**
 * Ranks skills for a request with BM25 over name + description.
 * @param {string} request
 * @param {{ name: string, description: string }[]} skills
 */
function rank(request, skills) {
  const docs = skills.map((s) => tokens(`${s.name.replace(/-/g, " ")} ${s.description}`));
  const avg = docs.reduce((n, d) => n + d.length, 0) / docs.length;
  /** @type {Map<string, number>} */
  const df = new Map();
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
  const query = [...new Set(tokens(request))];
  return skills
    .map((skill, i) => {
      let score = 0;
      for (const term of query) {
        const tf = docs[i].filter((t) => t === term).length;
        if (tf === 0) continue;
        const idf = Math.log(1 + (docs.length - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
        score += (idf * tf * 2.2) / (tf + 1.2 * (0.25 + (0.75 * docs[i].length) / avg));
      }
      return { name: skill.name, score };
    })
    .sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : 1));
}

describe("cases", () => {
  test("every skill has at least one case", () => {
    const covered = new Set(cases.map((/** @type {{ expect: string }} */ c) => c.expect));
    assert.deepEqual(
      catalog.skills
        .map((/** @type {{ name: string }} */ s) => s.name)
        .filter((/** @type {string} */ n) => !covered.has(n)),
      [],
    );
  });
});

describe("selection from descriptions (lexical proxy)", () => {
  for (const c of cases) {
    test(`${c.expect}: ${c.request.slice(0, 70)}`, () => {
      const ranking = rank(c.request, offered(c.audience));
      assert.equal(
        ranking[0].name,
        c.expect,
        `ranked: ${ranking
          .slice(0, 3)
          .map((r) => `${r.name} ${r.score.toFixed(2)}`)
          .join(", ")}`,
      );
      const unfiltered = rank(c.request, offered(null));
      assert.equal(
        unfiltered[0].name,
        c.expect,
        `unfiltered: ${unfiltered
          .slice(0, 3)
          .map((r) => r.name)
          .join(", ")}`,
      );
    });
  }
});
