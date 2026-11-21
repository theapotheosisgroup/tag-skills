// Shared test helpers.

import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
export const statementsSkill = join(repo, "skills", "finance", "finance-financial-statements");

/**
 * Normalizes an exact decimal string ("1300.00" -> "1300", "-0.50" -> "-0.5").
 * @param {string | number} value
 */
export function decimal(value) {
  let text = String(value).trim();
  const negative = text.startsWith("-");
  if (negative || text.startsWith("+")) text = text.slice(1);
  let [whole, fraction = ""] = text.split(".");
  whole = whole.replace(/^0+(?=\d)/, "");
  fraction = fraction.replace(/0+$/, "");
  const result = fraction ? `${whole}.${fraction}` : whole;
  return negative && result !== "0" ? `-${result}` : result;
}

/**
 * Runs build_statements.py in isolated mode (-I: no user site, no PYTHONPATH, no cwd on sys.path)
 * on an input object or file, and returns the exit code, output and parsed report.
 * @param {object | string} input  input object, or path to an input file
 * @param {{ skillDir?: string }} [options]
 */
export async function buildStatements(input, options = {}) {
  const work = await mkdtemp(join(tmpdir(), "tag-fs-"));
  let inputPath = typeof input === "string" ? input : join(work, "input.json");
  if (typeof input !== "string") await writeFile(inputPath, JSON.stringify(input, null, 2));
  const out = join(work, "out");
  const skillDir = options.skillDir ?? statementsSkill;
  const result = spawnSync(
    "python3",
    ["-I", join(skillDir, "scripts", "build_statements.py"), "--input", inputPath, "--out-dir", out],
    {
      cwd: work,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    },
  );
  let report;
  try {
    report = JSON.parse(await readFile(join(out, "report.json"), "utf8"));
  } catch {
    report = null;
  }
  return { code: result.status, stdout: result.stdout, stderr: result.stderr, report, out, inputPath };
}

/**
 * Reads a figure from a report by the names used in fixture expected.json files.
 * @param {any} report
 * @param {string} name
 */
export function figure(report, name) {
  const s = report.statements;
  const paths = {
    net_income: s.income_statement.totals.net_income,
    comprehensive_income: s.income_statement.totals.comprehensive_income,
    total_assets: s.balance_sheet.totals.total_assets,
    total_liabilities: s.balance_sheet.totals.total_liabilities,
    total_equity: s.balance_sheet.totals.total_equity,
    retained_earnings_closing: s.equity_statement.retained_earnings?.closing,
  };
  if (name in paths) return paths[/** @type {keyof typeof paths} */ (name)];
  return s.cash_flow_statement.totals?.[name];
}
