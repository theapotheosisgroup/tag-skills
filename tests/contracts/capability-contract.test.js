// CONTRACT CHECKS WITH MOCKS. They show how skills respond when a capability is missing, refused or
// not authorized, using tests/mocks/capability-host.js. They do not test tenant isolation, approval
// enforcement or ledger posting, which belong to the owning runtimes (tag-harness, tag-mcp, aletia).

import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, test } from "node:test";
import { buildStatements, repo } from "../helpers.js";
import { MockCapabilityHost } from "../mocks/capability-host.js";

const registry = JSON.parse(await readFile(join(repo, "docs", "integration", "capabilities.json"), "utf8"));
const simple = JSON.parse(
  await readFile(join(repo, "tests", "fixtures", "finance", "simple-cash", "input.json"), "utf8"),
);

/** @type {import("../mocks/capability-host.js").RunContext} */
const context = {
  organization: "org-synthetic-001",
  principal: "agent:synthetic-bookkeeper",
  mandate: "mandate-synthetic-reporting",
  nexus: "nexus-synthetic-001",
  correlationId: "corr-0001",
};

const allBindings = {
  "tag.policy.reporting.read": () => ({
    policies: simple.policies,
    mapping: simple.mapping,
    framework: simple.framework,
    review: simple.review,
  }),
  "tag.ledger.trial_balance.read": (/** @type {{ at: string }} */ r) =>
    r.at === "opening" ? { rows: simple.opening_balances } : { rows: simple.trial_balance, snapshot: simple.snapshot },
  "tag.ledger.journal_entry.post": () => ({ posted: true }),
};
const readGrants = ["tag.policy.reporting.read", "tag.ledger.trial_balance.read"];

/**
 * What the harness does before running the skill's script: call the capabilities the skill
 * declares, record every gap, and fall back to a user-supplied export where one exists.
 * @param {MockCapabilityHost} host
 * @param {{ userExport?: any }} [fallback]
 */
async function gatherInputs(host, fallback = {}) {
  const org = context.organization;
  /** @type {{ capability: string, status: string, needed_for: string }[]} */
  const gaps = [];
  const input = {
    schema: simple.schema,
    organization: simple.organization,
    entity: simple.entity,
    period: simple.period,
    reporting_currency: simple.reporting_currency,
    language: "en",
    capability_gaps: gaps,
  };
  const policy = await host.call("tag.policy.reporting.read", { organization: org, entity: simple.entity.id }, context);
  if (policy.status === "ok") Object.assign(input, /** @type {object} */ (policy.data));
  else
    gaps.push({
      capability: policy.capability,
      status: policy.status,
      needed_for: "approved framework, policies and mapping",
    });

  const tb = await host.call("tag.ledger.trial_balance.read", { organization: org, at: "closing" }, context);
  const opening = await host.call("tag.ledger.trial_balance.read", { organization: org, at: "opening" }, context);
  if (tb.status === "ok" && opening.status === "ok") {
    const data = /** @type {any} */ (tb.data);
    Object.assign(input, {
      trial_balance: data.rows,
      snapshot: data.snapshot,
      opening_balances: /** @type {any} */ (opening.data).rows,
    });
  } else {
    gaps.push({ capability: tb.capability, status: tb.status, needed_for: "adjusted trial balance" });
    if (fallback.userExport) {
      Object.assign(input, fallback.userExport, {
        snapshot: { id: "user-export-1", source: "user upload", complete: null },
      });
    }
  }
  return input;
}

/** @param {any} report */
const codes = (report) => report.exceptions.map((/** @type {{ code: string }} */ e) => e.code).sort();

describe("financial statements under the capability contract (mocked)", () => {
  test("all capabilities bound and granted: the package is ready for review", async () => {
    const host = new MockCapabilityHost({ registry, bindings: allBindings, grants: { [context.mandate]: readGrants } });
    const { report, code } = await buildStatements(await gatherInputs(host));
    assert.equal(code, 0, JSON.stringify(report?.exceptions));
    assert.deepEqual(codes(report), []);
    assert.ok(host.audit.every((a) => a.correlationId === context.correlationId));
  });
  test("missing tool: the trial-balance capability has no binding; a user export is used and the gap is reported", async () => {
    const bindings = Object.fromEntries(
      Object.entries(allBindings).filter(([name]) => name !== "tag.ledger.trial_balance.read"),
    );
    const host = new MockCapabilityHost({ registry, bindings, grants: { [context.mandate]: readGrants } });
    const input = await gatherInputs(host, {
      userExport: { trial_balance: simple.trial_balance, opening_balances: simple.opening_balances },
    });
    const { report } = await buildStatements(input);
    assert.equal(report.status, "blocked");
    assert.deepEqual(codes(report), ["CAPABILITY_UNAVAILABLE", "SNAPSHOT_COMPLETENESS_UNCONFIRMED"]);
    assert.equal(decimal(report.statements.balance_sheet.totals.total_equity), "1300");
  });
  test("missing policy: the organization has no approved reporting policy", async () => {
    const bindings = { ...allBindings, "tag.policy.reporting.read": () => ({ mapping: simple.mapping }) };
    const host = new MockCapabilityHost({ registry, bindings, grants: { [context.mandate]: readGrants } });
    const { report } = await buildStatements(await gatherInputs(host));
    assert.ok(codes(report).includes("MISSING_POLICY"));
    assert.ok(codes(report).includes("FRAMEWORK_NOT_SELECTED"));
    assert.equal(report.status, "blocked");
  });
  test("refused: the mandate does not grant the policy capability; the refusal is reported, not worked around", async () => {
    const host = new MockCapabilityHost({
      registry,
      bindings: allBindings,
      grants: { [context.mandate]: ["tag.ledger.trial_balance.read"] },
    });
    const { report } = await buildStatements(await gatherInputs(host));
    assert.ok(codes(report).includes("CAPABILITY_DENIED"));
    assert.ok(codes(report).includes("MISSING_POLICY"));
    const denied = report.exceptions.find((/** @type {{ code: string }} */ e) => e.code === "CAPABILITY_DENIED");
    assert.match(denied.message, /Do not retry under another identity/);
  });
});

describe("unauthorized operations (mocked contract shape)", () => {
  const host = new MockCapabilityHost({
    registry,
    bindings: allBindings,
    grants: { [context.mandate]: readGrants, "mandate-synthetic-posting": ["tag.ledger.journal_entry.post"] },
  });
  test("posting without a grant is denied", async () => {
    const result = await host.call("tag.ledger.journal_entry.post", { organization: context.organization }, context);
    assert.equal(result.status, "denied");
  });
  test("posting with a grant but without an approved review is denied", async () => {
    const result = await host.call(
      "tag.ledger.journal_entry.post",
      { organization: context.organization },
      { ...context, mandate: "mandate-synthetic-posting" },
    );
    assert.deepEqual(
      [result.status, "reason" in result && result.reason],
      ["denied", "a write that requires review needs an approved review state"],
    );
  });
  test("a request about another organization is denied even for a granted read", async () => {
    const result = await host.call(
      "tag.ledger.trial_balance.read",
      { organization: "org-synthetic-other", at: "closing" },
      context,
    );
    assert.equal(result.status, "denied");
  });
  test("an unregistered capability is a contract violation", async () => {
    await assert.rejects(
      host.call("tag.ledger.delete_everything", { organization: context.organization }, context),
      /not a registered capability/,
    );
  });
});

describe("skills ship no direct write path", () => {
  test("no bundled script opens a network connection or starts another process", async () => {
    const forbidden =
      /\b(?:import\s+(?:socket|urllib|http|requests|subprocess|ftplib|smtplib)|from\s+(?:socket|urllib|http|requests|subprocess)\b|curl\s|wget\s|fetch\()/;
    for (const category of await readdir(join(repo, "skills"))) {
      if (category.endsWith(".md")) continue;
      for (const skill of await readdir(join(repo, "skills", category))) {
        if (skill.endsWith(".md")) continue;
        const dir = join(repo, "skills", category, skill, "scripts");
        let files;
        try {
          files = await readdir(dir);
        } catch {
          continue;
        }
        for (const file of files) {
          if (!file.endsWith(".py")) continue;
          const text = await readFile(join(dir, file), "utf8");
          assert.doesNotMatch(text, forbidden, `${category}/${skill}/scripts/${file}`);
        }
      }
    }
  });
});

/** @param {string} value */
function decimal(value) {
  return String(Number(value));
}
