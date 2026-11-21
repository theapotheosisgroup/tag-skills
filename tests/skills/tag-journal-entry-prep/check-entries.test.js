// Tests for skills/finance/tag-journal-entry-prep/scripts/check_entries.py. Each case is a small
// synthetic batch whose expected result was worked out by hand.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const skill = join(repo, "skills", "finance", "tag-journal-entry-prep");
const script = join(skill, "scripts", "check_entries.py");
let work = "";
let counter = 0;

before(async () => {
  work = await mkdtemp(join(tmpdir(), "tag-jep-test-"));
});
after(async () => {
  await rm(work, { recursive: true, force: true });
});

/**
 * Runs the script on a batch and returns its exit code and parsed result.
 * @param {unknown} batch
 */
async function check(batch) {
  const input = join(work, `batch-${counter}.json`);
  const out = join(work, `result-${counter++}.json`);
  await writeFile(input, JSON.stringify(batch));
  let code = 0;
  let stderr = "";
  try {
    await run("python3", ["-I", script, "--input", input, "--out", out]);
  } catch (error) {
    const e = /** @type {{ code?: number, stderr?: string }} */ (error);
    code = typeof e.code === "number" ? e.code : 1;
    stderr = e.stderr ?? "";
  }
  let result;
  try {
    result = JSON.parse(await readFile(out, "utf8"));
  } catch {
    result = null;
  }
  return { code, result, stderr };
}

const chart = [
  { account: "2100", name: "Accrued liabilities", active: true },
  { account: "5000", name: "Operating expenses", active: true },
  { account: "5900", name: "Retired account", active: false },
];
const periods = [
  { period: "2026-11", start: "2026-11-01", end: "2026-11-30", status: "closed" },
  { period: "2026-12", start: "2026-12-01", end: "2026-12-31", status: "open" },
];

/** @param {Record<string, unknown>} overrides */
const entry = (overrides = {}) => ({
  id: "JE-1",
  date: "2026-12-31",
  description: "Accrual",
  support: ["synthetic-invoice-1"],
  approval: { status: "approved" },
  lines: [
    { account: "5000", debit: "100.00", credit: "0" },
    { account: "2100", debit: "0", credit: "100.00" },
  ],
  ...overrides,
});
/** @param {unknown[]} entries */
const batch = (entries) => ({ schema: "tag.journal-entry-prep.batch/v1", chart_of_accounts: chart, periods, entries });

/** @param {any} result */
const codes = (result) => result.entries[0].problems.map((/** @type {{ code: string }} */ p) => p.code);

describe("check_entries.py", () => {
  test("a balanced, supported, approved entry in an open period is ready for a posting request, not posted", async () => {
    const { code, result } = await check(batch([entry()]));
    assert.equal(code, 0);
    assert.equal(result.entries[0].status, "ready_for_posting_request");
    assert.equal(result.entries[0].total_debits, "100.00");
    assert.deepEqual(result.posting_request.entries, ["JE-1"]);
    assert.equal(result.posting_request.status, "not_posted");
    assert.equal(result.posting_request.requires, "tag.ledger.journal_entry.post");
  });

  test("a valid entry awaiting approval is not offered for posting", async () => {
    const { code, result } = await check(batch([entry({ approval: { status: "pending" } })]));
    assert.equal(code, 0);
    assert.equal(result.entries[0].status, "awaiting_approval");
    assert.deepEqual(result.posting_request.entries, []);
  });

  test("an unbalanced entry reports its difference (100.00 - 90.00 = 10.00)", async () => {
    const lines = [
      { account: "5000", debit: "100.00" },
      { account: "2100", credit: "90.00" },
    ];
    const { code, result } = await check(batch([entry({ lines })]));
    assert.equal(code, 1);
    assert.equal(result.entries[0].status, "invalid");
    assert.deepEqual(codes(result), ["UNBALANCED"]);
    assert.equal(result.entries[0].problems[0].difference, "10.00");
  });

  test("unknown and inactive accounts are reported", async () => {
    const lines = [
      { account: "9999", debit: "100.00" },
      { account: "5900", credit: "100.00" },
    ];
    const { code, result } = await check(batch([entry({ lines })]));
    assert.equal(code, 1);
    assert.deepEqual(codes(result), ["UNKNOWN_ACCOUNT", "INACTIVE_ACCOUNT"]);
  });

  test("an entry dated in a closed period is rejected; one outside every period too", async () => {
    const closed = await check(batch([entry({ date: "2026-11-30" })]));
    assert.equal(closed.code, 1);
    assert.deepEqual(codes(closed.result), ["PERIOD_NOT_OPEN"]);
    const none = await check(batch([entry({ date: "2027-01-02" })]));
    assert.deepEqual(codes(none.result), ["NO_PERIOD"]);
  });

  test("an entry without support is invalid even when approved", async () => {
    const { code, result } = await check(batch([entry({ support: [] })]));
    assert.equal(code, 1);
    assert.deepEqual(codes(result), ["MISSING_SUPPORT"]);
    assert.deepEqual(result.posting_request.entries, []);
  });

  test("a rejected entry is invalid", async () => {
    const { result } = await check(batch([entry({ approval: { status: "rejected" } })]));
    assert.deepEqual(codes(result), ["REJECTED"]);
  });

  test("malformed input exits 2 without a result", async () => {
    const { code, result, stderr } = await check({ schema: "wrong" });
    assert.equal(code, 2);
    assert.equal(result, null);
    assert.match(stderr, /schema must be/);
  });

  test("the bundled example batch is valid: one ready, one awaiting approval", async () => {
    const example = JSON.parse(await readFile(join(skill, "assets", "example-entries.json"), "utf8"));
    const { code, result } = await check(example);
    assert.equal(code, 0);
    assert.deepEqual(result.summary, { entries: 2, invalid: 0, awaiting_approval: 1, ready_for_posting_request: 1 });
  });
});
