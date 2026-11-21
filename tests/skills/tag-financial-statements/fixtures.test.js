// Evaluates tag-financial-statements against synthetic fixtures whose expected results were
// derived by hand (each expected.json lists its derivation). Objective criteria: status, every
// listed figure (exact decimal equality), statement statuses, and the exact set of exception codes
// with their amounts.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, test } from "node:test";
import { buildStatements, decimal, figure, repo } from "../../helpers.js";

const fixtures = join(repo, "tests", "fixtures", "finance");
const cases = (await readdir(fixtures)).sort();

/** @param {string} name */
async function load(name) {
  return {
    input: JSON.parse(await readFile(join(fixtures, name, "input.json"), "utf8")),
    expected: JSON.parse(await readFile(join(fixtures, name, "expected.json"), "utf8")),
  };
}

/** @param {any} report */
const codes = (report) => report.exceptions.map((/** @type {{ code: string }} */ e) => e.code).sort();

describe("synthetic fixtures", () => {
  test("cover the required cases", () => {
    for (const name of [
      "simple-cash",
      "unbalanced-tb",
      "unmapped-account",
      "missing-opening-balances",
      "accruals-noncash",
      "intercompany-fx",
    ]) {
      assert.ok(cases.includes(name), `missing fixture ${name}`);
    }
  });
  for (const name of cases) {
    test(name, async () => {
      const { expected } = await load(name);
      const result = await buildStatements(join(fixtures, name, "input.json"));
      assert.ok(result.report, `no report: ${result.stderr}`);
      const report = result.report;
      assert.equal(report.status, expected.status, JSON.stringify(report.exceptions, null, 2));
      assert.equal(result.code, expected.status === "blocked" ? 1 : 0);
      for (const [key, value] of Object.entries(expected.figures)) {
        assert.equal(decimal(figure(report, key)), decimal(/** @type {string} */ (value)), `${name}: ${key}`);
      }
      for (const [statement, status] of Object.entries(expected.statements ?? {})) {
        assert.equal(report.statements[statement].status, status, `${name}: ${statement}`);
      }
      assert.deepEqual(codes(report), expected.exceptions.map((/** @type {{ code: string }} */ e) => e.code).sort());
      for (const want of expected.exceptions) {
        const got = report.exceptions.find((/** @type {{ code: string }} */ e) => e.code === want.code);
        if (want.amount !== undefined)
          assert.equal(decimal(got.amount), decimal(want.amount), `${name}: ${want.code} amount`);
        if (want.account !== undefined) assert.equal(got.account, want.account);
      }
      for (const [statement, title] of Object.entries(expected.titles ?? {})) {
        assert.equal(report.statements[statement].title, title);
      }
      if (expected.noncash_transactions) {
        assert.deepEqual(
          report.noncash_transactions.map((/** @type {{ id: string }} */ t) => t.id),
          expected.noncash_transactions,
        );
      }
    });
  }
});

describe("properties", () => {
  test("output is deterministic and identifies its input", async () => {
    const path = join(fixtures, "accruals-noncash", "input.json");
    const a = await buildStatements(path);
    const b = await buildStatements(path);
    assert.deepEqual(a.report, b.report);
    const hash = createHash("sha256")
      .update(await readFile(path))
      .digest("hex");
    assert.equal(a.report.report.input_sha256, hash);
    assert.equal(a.report.report.snapshot.id, "snap-accruals-noncash");
    assert.deepEqual(a.report.report.policy, { id: "pol-synthetic-reporting", version: "2026.1" });
    assert.equal(a.report.report.reviewer_status, "not_reviewed");
  });
  test("every statement line traces to its source accounts and adjustments", async () => {
    const { report } = await buildStatements(join(fixtures, "accruals-noncash", "input.json"));
    const opex = report.statements.income_statement.lines.find(
      (/** @type {{ code: string }} */ l) => l.code === "operating_expenses",
    );
    assert.deepEqual(opex.accounts, ["5000"]);
    assert.deepEqual(opex.adjustments, ["AJE-2026-01"]);
    const row = report.traceability.find((/** @type {{ account: string }} */ r) => r.account === "1510");
    assert.deepEqual(row, {
      account: "1510",
      account_name: "Amortissement cumulé – matériel",
      balance: "-3000.00",
      line: "accumulated_depreciation",
      statement: "balance_sheet",
      adjustments: ["AJE-2026-02"],
    });
  });
  test("presentation rounding never changes the exact amounts or the checks", async () => {
    const { input } = await load("accruals-noncash");
    input.presentation.rounding_unit = "1000";
    const { report } = await buildStatements(input);
    assert.equal(report.status, "ready_for_review");
    assert.equal(decimal(report.statements.income_statement.totals.net_income), "8700");
    assert.equal(decimal(report.statements.income_statement.totals.net_income_presented), "9000");
    for (const line of report.statements.balance_sheet.sections.current_assets) {
      assert.equal(Number(line.presented) % 1000, 0);
    }
  });
  test("writes the renderings", async () => {
    const { out } = await buildStatements(join(fixtures, "simple-cash", "input.json"));
    for (const file of [
      "statements.md",
      "income_statement.csv",
      "balance_sheet.csv",
      "cash_flow_statement.csv",
      "equity_statement.csv",
      "exceptions.csv",
      "traceability.csv",
    ]) {
      assert.ok((await readFile(join(out, file), "utf8")).length > 0, file);
    }
    assert.match(
      await readFile(join(out, "statements.md"), "utf8"),
      /Management draft: not audited, reviewed or compiled/,
    );
  });
});

describe("missing and unsupported inputs", () => {
  /** @param {string} name @param {(input: any) => void} change */
  async function mutate(name, change) {
    const { input } = await load(name);
    change(input);
    return (await buildStatements(input)).report;
  }
  test("missing policy blocks and names the capability", async () => {
    const report = await mutate("simple-cash", (i) => delete i.policies);
    assert.equal(report.status, "blocked");
    const e = report.exceptions.find((/** @type {{ code: string }} */ x) => x.code === "MISSING_POLICY");
    assert.equal(e.capability, "tag.policy.reporting.read");
  });
  test("framework must be explicit and supported", async () => {
    assert.ok(codes(await mutate("simple-cash", (i) => delete i.framework)).includes("FRAMEWORK_NOT_SELECTED"));
    const report = await mutate("simple-cash", (i) => {
      i.framework = "US-GAAP";
      i.policies.framework = "US-GAAP";
    });
    assert.ok(codes(report).includes("FRAMEWORK_UNSUPPORTED"));
  });
  test("an unapproved policy or a policy for another framework blocks", async () => {
    assert.ok(codes(await mutate("simple-cash", (i) => (i.policies.approved = false))).includes("POLICY_NOT_APPROVED"));
    assert.ok(
      codes(await mutate("simple-cash", (i) => (i.policies.framework = "IFRS"))).includes("POLICY_FRAMEWORK_MISMATCH"),
    );
  });
  test("OCI under ASPE is reported", async () => {
    const report = await mutate("intercompany-fx", (i) => {
      i.framework = "ASPE";
      i.policies.framework = "ASPE";
    });
    assert.ok(codes(report).includes("OCI_UNDER_ASPE"));
  });
  test("balance-sheet changes without movement schedules do not produce cash flows", async () => {
    const report = await mutate("accruals-noncash", (i) => delete i.schedules);
    assert.equal(report.statements.cash_flow_statement.status, "incomplete");
    const missing = report.exceptions
      .filter((/** @type {{ code: string }} */ e) => e.code === "MISSING_MOVEMENT_SCHEDULE")
      .map((/** @type {{ line: string }} */ e) => e.line);
    assert.deepEqual(missing.sort(), [
      "accumulated_depreciation",
      "dividends",
      "dividends_payable",
      "long_term_debt",
      "property_plant_equipment",
      "share_capital",
    ]);
    assert.ok(codes(report).includes("CASH_FLOW_UNRECONCILED"));
  });
  test("foreign-currency cash without an FX schedule is reported", async () => {
    const report = await mutate("intercompany-fx", (i) => delete i.schedules.fx_cash_effect);
    assert.ok(codes(report).includes("FX_SCHEDULE_MISSING"));
    assert.equal(report.statements.cash_flow_statement.status, "incomplete");
  });
  test("an unapproved or unbalanced adjustment is reported", async () => {
    const report = await mutate("accruals-noncash", (i) => {
      i.adjustments[0].approved = false;
      i.adjustments[1].lines[1].credit = "900.00";
    });
    assert.ok(codes(report).includes("ADJUSTMENT_NOT_APPROVED"));
    assert.ok(codes(report).includes("ADJUSTMENT_UNBALANCED"));
  });
  test("a comparative that does not close into the opening balances is reported", async () => {
    const report = await mutate("accruals-noncash", (i) => (i.comparative.trial_balance[8].credit = "20500"));
    const e = report.exceptions.find((/** @type {{ code: string }} */ x) => x.code === "COMPARATIVE_MISMATCH");
    assert.equal(e.line, "retained_earnings");
  });
  test("consolidation is reported as unsupported, not approximated", async () => {
    assert.ok(codes(await mutate("simple-cash", (i) => (i.scope = "consolidated"))).includes("UNSUPPORTED_SCOPE"));
  });
  test("unconfirmed completeness is a warning, not a pass", async () => {
    const report = await mutate("simple-cash", (i) => (i.snapshot.complete = null));
    assert.equal(report.status, "ready_for_review");
    assert.deepEqual(codes(report), ["SNAPSHOT_COMPLETENESS_UNCONFIRMED"]);
  });
  test("first period without opening balances prepares every statement", async () => {
    const report = await mutate("missing-opening-balances", (i) => {
      i.first_period = true;
      i.trial_balance[0].debit = "300.00";
      i.trial_balance[1].credit = "0";
    });
    assert.equal(report.status, "ready_for_review", JSON.stringify(report.exceptions));
    assert.equal(decimal(report.statements.cash_flow_statement.totals.closing_cash), "300");
  });
  test("unreadable input exits 2 without a report", async () => {
    const { input } = await load("simple-cash");
    input.trial_balance[0].debit = "abc";
    const result = await buildStatements(input);
    assert.equal(result.code, 2);
    assert.equal(result.report, null);
    assert.match(result.stderr, /not a decimal amount/);
    const wrong = await buildStatements({ schema: "something-else" });
    assert.equal(wrong.code, 2);
  });
});
