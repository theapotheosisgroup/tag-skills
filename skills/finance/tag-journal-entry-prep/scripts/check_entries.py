#!/usr/bin/env python3
"""Check a batch of proposed journal entries before they go for approval or posting.

    python3 scripts/check_entries.py --input batch.json [--out result.json]

Reads one JSON batch (format: references/batch-format.md) and writes a JSON result (to --out, or
standard output) with a status per entry and a posting request that is never executed here:

    {"posting_request": {"status": "not_posted", "requires": "tag.ledger.journal_entry.post", ...}}

Checks per entry: at least two lines; each line is a non-negative debit or credit, not both;
debits equal credits; every account is in the supplied chart and active; the date falls inside a
period whose status is "open"; at least one supporting reference; an approval state that is not
"rejected".

Entry status: "invalid" (at least one problem), "awaiting_approval" (valid, not yet approved) or
"ready_for_posting_request" (valid and approved).

Exit codes: 0 no invalid entry; 1 at least one invalid entry; 2 the input could not be read.

Standard library only; Python 3.10 or later. Arithmetic is exact (decimal.Decimal). This script
reads one file and writes one file. It never contacts a ledger and never posts anything: posting is
a separate operation the runtime authorizes.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

SCHEMA = "tag.journal-entry-prep.batch/v1"
RESULT_SCHEMA = "tag.journal-entry-prep.result/v1"
ZERO = Decimal("0")
APPROVAL_STATES = ("approved", "pending", "rejected")


class InputError(Exception):
    """The batch cannot be read as the documented format."""


def amount(value: Any, where: str) -> Decimal:
    if value is None or value == "":
        return ZERO
    if isinstance(value, bool):
        raise InputError(f"{where}: expected an amount")
    try:
        result = Decimal(str(value).strip())
    except InvalidOperation as error:
        raise InputError(f"{where}: {value!r} is not a decimal amount") from error
    if not result.is_finite():
        raise InputError(f"{where}: {value!r} is not finite")
    return result


def fmt(value: Decimal) -> str:
    return format(value.quantize(Decimal("0.01")) if -value.as_tuple().exponent < 2 else value, "f")  # type: ignore[operator]


def parse_date(value: Any, where: str) -> date:
    try:
        return date.fromisoformat(str(value))
    except ValueError as error:
        raise InputError(f"{where}: {value!r} is not an ISO date") from error


def check(batch: dict[str, Any]) -> dict[str, Any]:
    if batch.get("schema") != SCHEMA:
        raise InputError(f"schema must be {SCHEMA!r}")
    chart = {str(a.get("account")): a for a in batch.get("chart_of_accounts") or []}
    if not chart:
        raise InputError("chart_of_accounts must be a non-empty list")
    periods = []
    for index, p in enumerate(batch.get("periods") or []):
        periods.append(
            {
                "period": p.get("period"),
                "start": parse_date(p.get("start"), f"periods[{index}].start"),
                "end": parse_date(p.get("end"), f"periods[{index}].end"),
                "status": p.get("status"),
            }
        )
    entries = batch.get("entries")
    if not isinstance(entries, list) or not entries:
        raise InputError("entries must be a non-empty list")

    results = []
    for index, entry in enumerate(entries):
        entry_id = entry.get("id") or f"entries[{index}]"
        problems: list[dict[str, Any]] = []
        lines = entry.get("lines") or []
        debits = credits = ZERO
        if len(lines) < 2:
            problems.append({"code": "TOO_FEW_LINES", "message": "An entry needs at least two lines."})
        for line_index, line in enumerate(lines):
            where = f"{entry_id}.lines[{line_index}]"
            debit = amount(line.get("debit"), f"{where}.debit")
            credit = amount(line.get("credit"), f"{where}.credit")
            if debit < 0 or credit < 0:
                problems.append({"code": "NEGATIVE_AMOUNT", "message": f"Line {line_index + 1} has a negative amount.", "line": line_index + 1})
            if (debit != 0) == (credit != 0):
                problems.append({"code": "LINE_NOT_ONE_SIDED", "message": f"Line {line_index + 1} must have either a debit or a credit.", "line": line_index + 1})
            debits += debit
            credits += credit
            account = str(line.get("account", ""))
            known = chart.get(account)
            if known is None:
                problems.append({"code": "UNKNOWN_ACCOUNT", "message": f"Account {account!r} is not in the chart of accounts.", "account": account})
            elif known.get("active") is False:
                problems.append({"code": "INACTIVE_ACCOUNT", "message": f"Account {account!r} is inactive.", "account": account})
        if debits != credits:
            problems.append({"code": "UNBALANCED", "message": "Debits and credits differ.", "difference": fmt(debits - credits)})

        period_name = None
        if entry.get("date") in (None, ""):
            problems.append({"code": "MISSING_DATE", "message": "The entry has no date."})
        else:
            entry_date = parse_date(entry.get("date"), f"{entry_id}.date")
            period = next((p for p in periods if p["start"] <= entry_date <= p["end"]), None)
            if period is None:
                problems.append({"code": "NO_PERIOD", "message": f"No period in the supplied list covers {entry_date.isoformat()}."})
            else:
                period_name = period["period"]
                if period["status"] != "open":
                    problems.append({"code": "PERIOD_NOT_OPEN", "message": f"Period {period['period']} is {period['status']!r}; entries need an open period.", "period": period["period"]})

        if not entry.get("support"):
            problems.append({"code": "MISSING_SUPPORT", "message": "No supporting reference is attached."})

        approval = (entry.get("approval") or {}).get("status", "pending")
        if approval not in APPROVAL_STATES:
            problems.append({"code": "UNKNOWN_APPROVAL_STATE", "message": f"Approval state {approval!r} is not one of {', '.join(APPROVAL_STATES)}."})
        elif approval == "rejected":
            problems.append({"code": "REJECTED", "message": "The entry was rejected by its approver."})

        if problems:
            status = "invalid"
        elif approval == "approved":
            status = "ready_for_posting_request"
        else:
            status = "awaiting_approval"
        results.append(
            {
                "id": entry_id,
                "status": status,
                "period": period_name,
                "total_debits": fmt(debits),
                "total_credits": fmt(credits),
                "approval": approval,
                "posting": "not_posted",
                "problems": problems,
            }
        )

    ready = [r["id"] for r in results if r["status"] == "ready_for_posting_request"]
    invalid = [r["id"] for r in results if r["status"] == "invalid"]
    return {
        "schema": RESULT_SCHEMA,
        "organization": batch.get("organization"),
        "entity": batch.get("entity"),
        "summary": {
            "entries": len(results),
            "invalid": len(invalid),
            "awaiting_approval": sum(1 for r in results if r["status"] == "awaiting_approval"),
            "ready_for_posting_request": len(ready),
        },
        "entries": results,
        "posting_request": {
            "status": "not_posted",
            "requires": "tag.ledger.journal_entry.post",
            "entries": ready,
            "note": "Posting is a separate operation that the runtime authorizes under the organization's grants and review state. This script never posts.",
        },
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check a batch of proposed journal entries.")
    parser.add_argument("--input", required=True, help="batch JSON (references/batch-format.md)")
    parser.add_argument("--out", help="result JSON file (default: standard output)")
    args = parser.parse_args(argv)
    try:
        batch = json.loads(Path(args.input).read_text(encoding="utf-8"), parse_float=Decimal)
        if not isinstance(batch, dict):
            raise InputError("the batch must be a JSON object")
        result = check(batch)
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, InputError) as error:
        print(f"input error: {error}", file=sys.stderr)
        return 2
    text = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text)
    return 1 if result["summary"]["invalid"] else 0


if __name__ == "__main__":
    sys.exit(main())
