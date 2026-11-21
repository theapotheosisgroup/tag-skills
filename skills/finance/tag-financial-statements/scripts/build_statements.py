#!/usr/bin/env python3
"""Build a draft financial statement package from an input snapshot.

    python3 scripts/build_statements.py --input snapshot.json --out-dir out/

Reads one JSON snapshot (format: references/input-format.md) and writes:

    report.json               machine-readable statements, checks, exceptions, notes, traceability
    statements.md             the package rendered in the selected language
    income_statement.csv, balance_sheet.csv, cash_flow_statement.csv, equity_statement.csv,
    exceptions.csv, traceability.csv

Exit codes: 0 report written, no blocking exception; 1 report written with at least one blocking
exception (status "blocked"); 2 the input could not be read.

Arithmetic is exact (decimal.Decimal). Presentation rounding is applied only to the "presented"
values; every check uses the exact amounts. No difference is ever plugged: a check that fails is
reported with its difference.

Standard library only; Python 3.10 or later. This script reads files and writes files into
--out-dir. It never contacts a ledger, posts an entry or sends anything.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from pathlib import Path
from typing import Any

SKILL = "tag-financial-statements"
VERSION = "0.1.0"
INPUT_SCHEMA = "tag.financial-statements.input/v1"
REPORT_SCHEMA = "tag.financial-statements.report/v1"
ZERO = Decimal("0")
SUPPORTED_FRAMEWORKS = ("ASPE", "IFRS")
SUPPORTED_LANGUAGES = ("en", "fr")

# Statement line catalogue. Balances are debit-positive throughout.
# kind: asset | liability | equity | income | oci
# cf: how a change in the line's balance enters the indirect cash-flow statement:
#   "cash"      the cash line itself
#   "wc"        operating working capital: the balance change is an operating adjustment
#   "schedule"  the change must be explained by movement schedules (investing, financing, non-cash)
#   "pnl"       an income-statement line (enters through net income)
#   "oci"       other comprehensive income (enters through comprehensive income, offset by non-cash movements)
LINES: dict[str, dict[str, str]] = {
    # Assets
    "cash": {"kind": "asset", "group": "current_assets", "cf": "cash", "en": "Cash and cash equivalents", "fr": "Trésorerie et équivalents de trésorerie"},
    "receivables": {"kind": "asset", "group": "current_assets", "cf": "wc", "en": "Accounts receivable", "fr": "Débiteurs"},
    "intercompany_receivable": {"kind": "asset", "group": "current_assets", "cf": "wc", "en": "Due from related parties", "fr": "Montants à recevoir de parties liées"},
    "inventory": {"kind": "asset", "group": "current_assets", "cf": "wc", "en": "Inventories", "fr": "Stocks"},
    "prepaid_expenses": {"kind": "asset", "group": "current_assets", "cf": "wc", "en": "Prepaid expenses", "fr": "Frais payés d'avance"},
    "other_current_assets": {"kind": "asset", "group": "current_assets", "cf": "wc", "en": "Other current assets", "fr": "Autres actifs à court terme"},
    "property_plant_equipment": {"kind": "asset", "group": "noncurrent_assets", "cf": "schedule", "en": "Property, plant and equipment, at cost", "fr": "Immobilisations corporelles, au coût"},
    "accumulated_depreciation": {"kind": "asset", "group": "noncurrent_assets", "cf": "schedule", "en": "Accumulated depreciation", "fr": "Amortissement cumulé"},
    "intangible_assets": {"kind": "asset", "group": "noncurrent_assets", "cf": "schedule", "en": "Intangible assets", "fr": "Actifs incorporels"},
    "investments": {"kind": "asset", "group": "noncurrent_assets", "cf": "schedule", "en": "Investments", "fr": "Placements"},
    "other_noncurrent_assets": {"kind": "asset", "group": "noncurrent_assets", "cf": "schedule", "en": "Other long-term assets", "fr": "Autres actifs à long terme"},
    # Liabilities
    "payables": {"kind": "liability", "group": "current_liabilities", "cf": "wc", "en": "Accounts payable", "fr": "Créditeurs"},
    "accrued_liabilities": {"kind": "liability", "group": "current_liabilities", "cf": "wc", "en": "Accrued liabilities", "fr": "Charges à payer"},
    "deferred_revenue": {"kind": "liability", "group": "current_liabilities", "cf": "wc", "en": "Deferred revenue", "fr": "Produits reportés"},
    "income_taxes_payable": {"kind": "liability", "group": "current_liabilities", "cf": "wc", "en": "Income taxes payable", "fr": "Impôts sur le résultat à payer"},
    "intercompany_payable": {"kind": "liability", "group": "current_liabilities", "cf": "wc", "en": "Due to related parties", "fr": "Montants à payer à des parties liées"},
    "other_current_liabilities": {"kind": "liability", "group": "current_liabilities", "cf": "wc", "en": "Other current liabilities", "fr": "Autres passifs à court terme"},
    "dividends_payable": {"kind": "liability", "group": "current_liabilities", "cf": "schedule", "en": "Dividends payable", "fr": "Dividendes à payer"},
    "current_debt": {"kind": "liability", "group": "current_liabilities", "cf": "schedule", "en": "Current portion of long-term debt", "fr": "Tranche de la dette à long terme échéant à moins d'un an"},
    "long_term_debt": {"kind": "liability", "group": "noncurrent_liabilities", "cf": "schedule", "en": "Long-term debt", "fr": "Dette à long terme"},
    "other_noncurrent_liabilities": {"kind": "liability", "group": "noncurrent_liabilities", "cf": "schedule", "en": "Other long-term liabilities", "fr": "Autres passifs à long terme"},
    # Equity
    "share_capital": {"kind": "equity", "group": "equity", "cf": "schedule", "en": "Share capital", "fr": "Capital-actions"},
    "retained_earnings": {"kind": "equity", "group": "equity", "cf": "schedule", "en": "Retained earnings", "fr": "Bénéfices non répartis"},
    "dividends": {"kind": "equity", "group": "equity", "cf": "schedule", "en": "Dividends declared", "fr": "Dividendes déclarés"},
    "accumulated_oci": {"kind": "equity", "group": "equity", "cf": "schedule", "en": "Accumulated other comprehensive income", "fr": "Cumul des autres éléments du résultat global"},
    # Income statement
    "revenue": {"kind": "income", "group": "revenue", "cf": "pnl", "en": "Revenue", "fr": "Produits"},
    "other_income": {"kind": "income", "group": "revenue", "cf": "pnl", "en": "Other income", "fr": "Autres produits"},
    "cost_of_sales": {"kind": "income", "group": "expenses", "cf": "pnl", "en": "Cost of sales", "fr": "Coût des ventes"},
    "operating_expenses": {"kind": "income", "group": "expenses", "cf": "pnl", "en": "Operating expenses", "fr": "Charges d'exploitation"},
    "depreciation_amortization": {"kind": "income", "group": "expenses", "cf": "pnl", "en": "Depreciation and amortization", "fr": "Amortissements"},
    "interest_expense": {"kind": "income", "group": "expenses", "cf": "pnl", "en": "Interest expense", "fr": "Charges d'intérêts"},
    "fx_gain_loss": {"kind": "income", "group": "expenses", "cf": "pnl", "en": "Foreign exchange gain (loss)", "fr": "Gain (perte) de change"},
    "income_tax_expense": {"kind": "income", "group": "tax", "cf": "pnl", "en": "Income taxes", "fr": "Impôts sur le résultat"},
    # Other comprehensive income (IFRS only)
    "oci": {"kind": "oci", "group": "oci", "cf": "oci", "en": "Other comprehensive income", "fr": "Autres éléments du résultat global"},
}

MOVEMENT_SECTIONS = ("operating", "investing", "financing", "noncash_pnl", "noncash")

TITLES = {
    ("ASPE", "en"): {
        "income_statement": "Income statement",
        "balance_sheet": "Balance sheet",
        "cash_flow_statement": "Cash flow statement",
        "equity_statement": "Statement of retained earnings",
        "framework": "Canadian accounting standards for private enterprises (ASPE)",
    },
    ("ASPE", "fr"): {
        "income_statement": "État des résultats",
        "balance_sheet": "Bilan",
        "cash_flow_statement": "État des flux de trésorerie",
        "equity_statement": "État des bénéfices non répartis",
        "framework": "Normes comptables canadiennes pour les entreprises à capital fermé (NCECF)",
    },
    ("IFRS", "en"): {
        "income_statement": "Statement of profit or loss and other comprehensive income",
        "balance_sheet": "Statement of financial position",
        "cash_flow_statement": "Statement of cash flows",
        "equity_statement": "Statement of changes in equity",
        "framework": "IFRS Accounting Standards",
    },
    ("IFRS", "fr"): {
        "income_statement": "État du résultat net et des autres éléments du résultat global",
        "balance_sheet": "État de la situation financière",
        "cash_flow_statement": "Tableau des flux de trésorerie",
        "equity_statement": "État des variations des capitaux propres",
        "framework": "Normes IFRS de comptabilité",
    },
    (None, "en"): {
        "income_statement": "Income statement",
        "balance_sheet": "Balance sheet",
        "cash_flow_statement": "Cash flow statement",
        "equity_statement": "Equity roll-forward",
        "framework": "No reporting framework selected",
    },
    (None, "fr"): {
        "income_statement": "État des résultats",
        "balance_sheet": "Bilan",
        "cash_flow_statement": "État des flux de trésorerie",
        "equity_statement": "Évolution des capitaux propres",
        "framework": "Aucun référentiel comptable choisi",
    },
}

TEXT = {
    "en": {
        "draft": "Management draft: not audited, reviewed or compiled. Prepared for review by a qualified person.",
        "net_income": "Net income",
        "comprehensive_income": "Comprehensive income",
        "total_revenue": "Total revenue and other income",
        "total_expenses": "Total expenses",
        "income_before_tax": "Income before income taxes",
        "total_current_assets": "Total current assets",
        "total_assets": "Total assets",
        "total_current_liabilities": "Total current liabilities",
        "total_liabilities": "Total liabilities",
        "total_equity": "Total equity",
        "total_liabilities_equity": "Total liabilities and equity",
        "operating": "Operating activities",
        "investing": "Investing activities",
        "financing": "Financing activities",
        "net_cash_operating": "Net cash from operating activities",
        "net_cash_investing": "Net cash from investing activities",
        "net_cash_financing": "Net cash from financing activities",
        "fx_effect": "Effect of exchange rate changes on cash",
        "net_change": "Net change in cash",
        "opening_cash": "Cash, beginning of period",
        "closing_cash": "Cash, end of period",
        "change_in": "Change in {}",
        "opening": "Opening balance",
        "closing": "Closing balance",
        "not_prepared": "Not prepared",
        "incomplete": "Incomplete: see exceptions",
        "exceptions": "Exceptions",
        "none": "None.",
        "notes": "Draft notes",
        "statement": "Statement",
        "line": "Line",
        "amount": "Amount",
        "comparative": "Comparative",
        "presented_in": "Presented in",
        "rounding_unit": "rounding unit",
        "status": "Status",
        "reviewer_status": "Reviewer status",
        "revision": "Revision",
        "snapshot": "Input snapshot",
        "policy": "Policy",
        "mapping": "Mapping",
    },
    "fr": {
        "draft": "Projet de la direction : non audité, non examiné et non compilé. Préparé pour revue par une personne qualifiée.",
        "net_income": "Bénéfice net",
        "comprehensive_income": "Résultat global",
        "total_revenue": "Total des produits",
        "total_expenses": "Total des charges",
        "income_before_tax": "Bénéfice avant impôts sur le résultat",
        "total_current_assets": "Total de l'actif à court terme",
        "total_assets": "Total de l'actif",
        "total_current_liabilities": "Total du passif à court terme",
        "total_liabilities": "Total du passif",
        "total_equity": "Total des capitaux propres",
        "total_liabilities_equity": "Total du passif et des capitaux propres",
        "operating": "Activités d'exploitation",
        "investing": "Activités d'investissement",
        "financing": "Activités de financement",
        "net_cash_operating": "Flux de trésorerie liés aux activités d'exploitation",
        "net_cash_investing": "Flux de trésorerie liés aux activités d'investissement",
        "net_cash_financing": "Flux de trésorerie liés aux activités de financement",
        "fx_effect": "Incidence des variations des taux de change sur la trésorerie",
        "net_change": "Variation nette de la trésorerie",
        "opening_cash": "Trésorerie au début de la période",
        "closing_cash": "Trésorerie à la fin de la période",
        "change_in": "Variation : {}",
        "opening": "Solde d'ouverture",
        "closing": "Solde de clôture",
        "not_prepared": "Non préparé",
        "incomplete": "Incomplet : voir les exceptions",
        "exceptions": "Exceptions",
        "none": "Aucune.",
        "notes": "Projet de notes",
        "statement": "État",
        "line": "Poste",
        "amount": "Montant",
        "comparative": "Comparatif",
        "presented_in": "Présenté en",
        "rounding_unit": "unité d'arrondi",
        "status": "Statut",
        "reviewer_status": "Statut de la revue",
        "revision": "Révision",
        "snapshot": "Instantané des données",
        "policy": "Politique",
        "mapping": "Correspondance",
    },
}


AMOUNT = re.compile(r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)")


class InputError(Exception):
    """The input snapshot cannot be read as the documented format."""


def dec(value: Any, where: str) -> Decimal:
    """Parses an amount: a plain dot-decimal string or a JSON number (parsed as Decimal)."""
    if value is None or value == "":
        return ZERO
    if isinstance(value, bool) or not isinstance(value, (str, int, Decimal)):
        raise InputError(f"{where}: expected an amount, got {value!r}")
    if isinstance(value, str) and not AMOUNT.fullmatch(value):
        raise InputError(
            f"{where}: {value!r} is not a decimal amount: use a dot decimal separator and no thousands separators"
        )
    try:
        result = Decimal(value)
    except InvalidOperation as error:
        raise InputError(f"{where}: {value!r} is not a decimal amount") from error
    if not result.is_finite():
        raise InputError(f"{where}: {value!r} is not a finite amount")
    return result


def fmt(value: Decimal) -> str:
    """Exact decimal string, at least two decimal places, no exponent."""
    if value == value.to_integral_value() or -value.as_tuple().exponent < 2:  # type: ignore[operator]
        value = value.quantize(Decimal("0.01"))
    return format(value + ZERO, "f")  # + ZERO turns -0 into 0


class Builder:
    def __init__(self, data: dict[str, Any], input_sha256: str):
        self.data = data
        self.input_sha256 = input_sha256
        self.exceptions: list[dict[str, Any]] = []
        self.checks: list[dict[str, Any]] = []
        self.blocked_statements: dict[str, str] = {}
        self.framework = data.get("framework")
        language = data.get("language") or "en"
        if language not in SUPPORTED_LANGUAGES:
            self.exception("LANGUAGE_UNSUPPORTED", "warning", f"Presentation language {language!r} is not supported; English is used.")
            language = "en"
        self.language = language
        self.t = TEXT[language]
        review = data.get("review") or {}
        self.materiality = dec(review.get("materiality"), "review.materiality") if review.get("materiality") not in (None, "") else None
        presentation = data.get("presentation") or {}
        self.rounding = dec(presentation.get("rounding_unit", "1"), "presentation.rounding_unit")
        if self.rounding <= 0:
            raise InputError("presentation.rounding_unit must be positive")

    # ---------------------------------------------------------------- helpers

    def exception(self, code: str, severity: str, message: str, **details: Any) -> None:
        entry: dict[str, Any] = {"code": code, "severity": severity, "message": message}
        for key, value in details.items():
            entry[key] = fmt(value) if isinstance(value, Decimal) else value
        amount = details.get("amount")
        if isinstance(amount, Decimal) and self.materiality is not None:
            entry["above_materiality"] = abs(amount) >= self.materiality
        self.exceptions.append(entry)

    def check(self, check_id: str, status: str, description: str, **values: Any) -> None:
        entry: dict[str, Any] = {"id": check_id, "status": status, "description": description}
        for key, value in values.items():
            entry[key] = fmt(value) if isinstance(value, Decimal) else value
        self.checks.append(entry)

    def present(self, value: Decimal) -> str:
        """Presentation rounding: whole multiples of the rounding unit, half away from zero."""
        units = (value / self.rounding).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        return fmt(units * self.rounding)

    def label(self, code: str) -> str:
        return LINES[code][self.language]

    @staticmethod
    def balances(rows: list[dict[str, Any]], where: str) -> dict[str, Decimal]:
        """Debit-positive balance per account. A row has `balance`, or `debit` and `credit`."""
        result: dict[str, Decimal] = {}
        for index, row in enumerate(rows):
            account = str(row.get("account", "")).strip()
            if not account:
                raise InputError(f"{where}[{index}]: account is required")
            if "balance" in row:
                amount = dec(row["balance"], f"{where}[{index}].balance")
            else:
                amount = dec(row.get("debit"), f"{where}[{index}].debit") - dec(row.get("credit"), f"{where}[{index}].credit")
            result[account] = result.get(account, ZERO) + amount
        return result

    # ---------------------------------------------------------------- build

    def build(self) -> dict[str, Any]:
        d = self.data
        if d.get("schema") != INPUT_SCHEMA:
            raise InputError(f"schema must be {INPUT_SCHEMA!r}")
        tb_rows = d.get("trial_balance")
        if not isinstance(tb_rows, list) or not tb_rows:
            raise InputError("trial_balance must be a non-empty list")
        mapping = d.get("mapping") or {}
        accounts_map: dict[str, dict[str, Any]] = {str(k): v for k, v in (mapping.get("accounts") or {}).items()}
        for account, entry in accounts_map.items():
            if not isinstance(entry, dict) or entry.get("line") not in LINES:
                raise InputError(f"mapping.accounts[{account!r}].line must be one of the documented line codes")

        names = {str(r.get("account")): str(r.get("name", "")) for r in tb_rows}
        self.names = names
        self.accounts_map = accounts_map

        self.check_context()
        closing = self.check_trial_balance(tb_rows)
        self.check_adjustments(accounts_map)

        # Account-mapping coverage.
        unmapped = {a: b for a, b in closing.items() if a not in accounts_map}
        for account, amount in sorted(unmapped.items()):
            self.exception(
                "UNMAPPED_ACCOUNT",
                "error",
                f"Account {account} ({names.get(account, '')}) has no statement mapping; its balance is excluded from every statement.",
                account=account,
                amount=amount,
            )
        self.check(
            "MAPPING_COVERAGE",
            "pass" if not unmapped else "fail",
            "Every trial-balance account maps to a statement line.",
            unmapped_accounts=sorted(unmapped),
            unmapped_total=sum(unmapped.values(), ZERO),
        )

        lines_closing = self.by_line(closing)
        opening_rows = d.get("opening_balances")
        first_period = bool(d.get("first_period"))
        if opening_rows is None and not first_period:
            self.exception(
                "MISSING_OPENING_BALANCES",
                "error",
                "Opening balances were not supplied: the cash flow statement and the equity roll-forward cannot be prepared, and no balance-sheet comparative is shown.",
            )
            self.blocked_statements["cash_flow_statement"] = "missing opening balances"
            self.blocked_statements["equity_statement"] = "missing opening balances"
            opening = None
            lines_opening = None
        else:
            opening = self.balances(opening_rows or [], "opening_balances")
            unmapped_open = {a: b for a, b in opening.items() if a not in accounts_map}
            for account, amount in sorted(unmapped_open.items()):
                self.exception("UNMAPPED_ACCOUNT", "error", f"Opening balance account {account} has no statement mapping.", account=account, amount=amount)
            lines_opening = self.by_line(opening)
            self.check_opening(opening, lines_opening)

        income = self.income_statement(lines_closing)
        balance = self.balance_sheet(lines_closing, lines_opening, income)
        equity = self.equity_statement(lines_closing, lines_opening, income)
        cash_flow = self.cash_flow_statement(lines_closing, lines_opening, income)
        self.check_intercompany(closing)
        self.check_comparatives(lines_opening)

        errors = [e for e in self.exceptions if e["severity"] == "error"]
        status = "blocked" if errors else "ready_for_review"
        snapshot = d.get("snapshot") or {}
        policies = d.get("policies") or {}
        return {
            "schema": REPORT_SCHEMA,
            "generator": {"skill": SKILL, "version": VERSION, "script": "scripts/build_statements.py"},
            "status": status,
            "label": self.t["draft"],
            "organization": d.get("organization"),
            "entity": d.get("entity"),
            "period": d.get("period"),
            "framework": self.framework,
            "framework_name": TITLES[(self.framework if self.framework in SUPPORTED_FRAMEWORKS else None, self.language)]["framework"],
            "language": self.language,
            "reporting_currency": d.get("reporting_currency"),
            "presentation": {"rounding_unit": fmt(self.rounding), "note": "Presented values are rounded line by line; totals are computed from exact amounts."},
            "report": {
                "revision": (d.get("report") or {}).get("revision", 1),
                "input_sha256": self.input_sha256,
                "snapshot": {k: snapshot.get(k) for k in ("id", "source", "extracted_at", "complete")},
                "policy": {"id": policies.get("id"), "version": policies.get("version")},
                "mapping": {"id": mapping.get("id"), "version": mapping.get("version")},
                "reviewer_status": (d.get("review") or {}).get("reviewer_status", "not_reviewed"),
            },
            "statements": {
                "income_statement": income["statement"],
                "balance_sheet": balance,
                "cash_flow_statement": cash_flow,
                "equity_statement": equity,
            },
            "checks": self.checks,
            "exceptions": self.exceptions,
            "noncash_transactions": self.noncash_transactions,
            "notes_draft": self.notes(),
            "traceability": self.traceability(closing),
        }

    # ---------------------------------------------------------------- input checks

    def check_context(self) -> None:
        d = self.data
        for key in ("organization", "entity", "period", "reporting_currency"):
            if not d.get(key):
                self.exception("MISSING_CONTEXT", "error", f"{key} is required to identify the report.", field=key)
        if not self.framework:
            self.exception("FRAMEWORK_NOT_SELECTED", "error", "No reporting framework was selected. Framework selection is explicit: ASPE or IFRS.")
        elif self.framework not in SUPPORTED_FRAMEWORKS:
            self.exception("FRAMEWORK_UNSUPPORTED", "error", f"Framework {self.framework!r} is not supported by this skill (supported: ASPE, IFRS).")
        policies = d.get("policies")
        if not policies:
            self.exception(
                "MISSING_POLICY",
                "error",
                "The organization's approved reporting policies were not supplied. Do not substitute a default or imported playbook.",
                capability="tag.policy.reporting.read",
            )
        else:
            if policies.get("approved") is not True:
                self.exception("POLICY_NOT_APPROVED", "error", f"Reporting policy {policies.get('id')!r} version {policies.get('version')!r} is not marked approved.")
            if self.framework and policies.get("framework") != self.framework:
                self.exception(
                    "POLICY_FRAMEWORK_MISMATCH",
                    "error",
                    f"The selected framework is {self.framework!r} but the approved policy is for {policies.get('framework')!r}.",
                )
            method = policies.get("cash_flow_method", "indirect")
            if method != "indirect":
                self.exception("CASH_FLOW_METHOD_UNSUPPORTED", "error", f"Cash-flow method {method!r} is not supported; this version prepares the indirect method only.")
                self.blocked_statements["cash_flow_statement"] = f"cash-flow method {method!r} not supported"
        if not (d.get("mapping") or {}).get("accounts"):
            self.exception("MISSING_MAPPING", "error", "No chart-of-accounts to statement mapping was supplied.")
        snapshot = d.get("snapshot") or {}
        if not snapshot.get("id"):
            self.exception("MISSING_SNAPSHOT_IDENTITY", "error", "The input snapshot has no identifier; the report could not be traced to its source.")
        complete = snapshot.get("complete")
        if complete is False:
            self.exception("SNAPSHOT_INCOMPLETE", "error", "The source marked this snapshot incomplete.")
        elif complete is not True:
            self.exception(
                "SNAPSHOT_COMPLETENESS_UNCONFIRMED",
                "warning",
                "The source did not confirm the snapshot is complete (for example, a manual upload). A balanced trial balance does not establish completeness.",
            )
        for gap in d.get("capability_gaps") or []:
            capability = gap.get("capability")
            status = gap.get("status")
            needed = gap.get("needed_for", "")
            if status == "denied":
                self.exception(
                    "CAPABILITY_DENIED",
                    "error",
                    f"The runtime refused {capability} ({needed}). Do not retry under another identity; ask for the grant through the organization.",
                    capability=capability,
                )
            else:
                self.exception(
                    "CAPABILITY_UNAVAILABLE",
                    "error",
                    f"{capability} is not available ({needed}). Supply the data another approved way or wait for the binding.",
                    capability=capability,
                )
        if d.get("scope", "entity") != "entity":
            self.exception(
                "UNSUPPORTED_SCOPE",
                "error",
                f"Scope {d.get('scope')!r} is not supported: this version prepares single-entity statements; consolidation and elimination entries are not supported.",
            )
        if self.framework == "ASPE":
            oci_accounts = [a for a, m in (d.get("mapping") or {}).get("accounts", {}).items() if m.get("line") in ("oci", "accumulated_oci")]
            if oci_accounts:
                self.exception(
                    "OCI_UNDER_ASPE",
                    "error",
                    "Accounts are mapped to other comprehensive income, which ASPE does not have. Review the mapping or the framework.",
                    accounts=sorted(oci_accounts),
                )

    def check_trial_balance(self, rows: list[dict[str, Any]]) -> dict[str, Decimal]:
        debits = credits = ZERO
        for index, row in enumerate(rows):
            if "balance" in row:
                value = dec(row["balance"], f"trial_balance[{index}].balance")
                debits += max(value, ZERO)
                credits += max(-value, ZERO)
            else:
                debits += dec(row.get("debit"), f"trial_balance[{index}].debit")
                credits += dec(row.get("credit"), f"trial_balance[{index}].credit")
        difference = debits - credits
        if difference != 0:
            self.exception(
                "TB_UNBALANCED",
                "error",
                "Trial-balance debits and credits differ. No balancing amount has been added.",
                amount=difference,
            )
        self.check("TB_BALANCED", "pass" if difference == 0 else "fail", "Trial-balance debits equal credits.", debits=debits, credits=credits, difference=difference)
        return self.balances(rows, "trial_balance")

    def check_adjustments(self, accounts_map: dict[str, Any]) -> None:
        self.adjustments_by_account: dict[str, list[str]] = {}
        problems = 0
        for index, adj in enumerate(self.data.get("adjustments") or []):
            adj_id = adj.get("id") or f"adjustment[{index}]"
            total = ZERO
            for line_index, line in enumerate(adj.get("lines") or []):
                account = str(line.get("account", ""))
                total += dec(line.get("debit"), f"{adj_id}.lines[{line_index}].debit") - dec(line.get("credit"), f"{adj_id}.lines[{line_index}].credit")
                self.adjustments_by_account.setdefault(account, []).append(adj_id)
                if account not in accounts_map:
                    problems += 1
                    self.exception("ADJUSTMENT_UNMAPPED_ACCOUNT", "error", f"Adjustment {adj_id} uses unmapped account {account}.", adjustment=adj_id, account=account)
            if total != 0:
                problems += 1
                self.exception("ADJUSTMENT_UNBALANCED", "error", f"Adjustment {adj_id} does not balance.", adjustment=adj_id, amount=total)
            if adj.get("approved") is not True:
                problems += 1
                self.exception(
                    "ADJUSTMENT_NOT_APPROVED",
                    "error",
                    f"Adjustment {adj_id} is included in the adjusted trial balance but is not marked approved.",
                    adjustment=adj_id,
                )
        self.check("ADJUSTMENTS_SUPPORTED", "pass" if problems == 0 else "fail", "Every adjustment balances, is approved and uses mapped accounts.")

    def check_opening(self, opening: dict[str, Decimal], lines_opening: dict[str, Decimal]) -> None:
        total = sum(opening.values(), ZERO)
        if total != 0:
            self.exception("OPENING_UNBALANCED", "error", "Opening balances do not sum to zero.", amount=total)
        nominal = {code: v for code, v in lines_opening.items() if v != 0 and LINES[code]["kind"] in ("income", "oci") or (code == "dividends" and v != 0)}
        if nominal:
            self.exception(
                "OPENING_NOT_CLOSED",
                "error",
                "Opening balances contain income-statement, OCI or dividend balances; opening balances must be after the prior period's closing entries.",
                lines=sorted(nominal),
            )
        self.check("OPENING_BALANCED", "pass" if total == 0 and not nominal else "fail", "Opening balances sum to zero and are post-closing.", difference=total)

    def by_line(self, balances: dict[str, Decimal]) -> dict[str, Decimal]:
        result = {code: ZERO for code in LINES}
        for account, amount in balances.items():
            entry = self.accounts_map.get(account)
            if entry:
                result[entry["line"]] += amount
        return result

    # ---------------------------------------------------------------- statements

    def statement_line(self, statement: str, code: str, amount: Decimal, comparative: Decimal | None = None) -> dict[str, Any]:
        accounts = sorted(a for a, m in self.accounts_map.items() if m["line"] == code and a in self.names)
        adjustments = sorted({adj for a in accounts for adj in self.adjustments_by_account.get(a, [])})
        line: dict[str, Any] = {
            "code": code,
            "label": self.label(code),
            "amount": fmt(amount),
            "presented": self.present(amount),
            "accounts": accounts,
            "adjustments": adjustments,
        }
        if comparative is not None:
            line["comparative"] = fmt(comparative)
            line["comparative_presented"] = self.present(comparative)
        return line

    def title(self, statement: str) -> str:
        key = self.framework if self.framework in SUPPORTED_FRAMEWORKS else None
        return TITLES[(key, self.language)][statement]

    def income_statement(self, lines: dict[str, Decimal]) -> dict[str, Any]:
        # Income-positive presentation: income is -balance; expenses show as negative amounts.
        def amount(code: str) -> Decimal:
            return -lines[code]

        revenue_codes = [c for c, m in LINES.items() if m["kind"] == "income" and m["group"] == "revenue"]
        expense_codes = [c for c, m in LINES.items() if m["kind"] == "income" and m["group"] == "expenses"]
        total_revenue = sum((amount(c) for c in revenue_codes), ZERO)
        total_expenses = sum((amount(c) for c in expense_codes), ZERO)
        before_tax = total_revenue + total_expenses
        tax = amount("income_tax_expense")
        net_income = before_tax + tax
        oci = amount("oci")
        out_lines = [self.statement_line("income_statement", c, amount(c)) for c in revenue_codes + expense_codes if lines[c] != 0 or c == "revenue"]
        if lines["income_tax_expense"] != 0:
            out_lines.append(self.statement_line("income_statement", "income_tax_expense", tax))
        totals = {
            "total_revenue": fmt(total_revenue),
            "total_expenses": fmt(total_expenses),
            "income_before_tax": fmt(before_tax),
            "net_income": fmt(net_income),
            "net_income_presented": self.present(net_income),
        }
        if self.framework == "IFRS" or oci != 0:
            if lines["oci"] != 0:
                out_lines.append(self.statement_line("income_statement", "oci", oci))
            totals["other_comprehensive_income"] = fmt(oci)
            totals["comprehensive_income"] = fmt(net_income + oci)
        statement = {"title": self.title("income_statement"), "status": "prepared", "lines": out_lines, "totals": totals}
        return {"statement": statement, "net_income": net_income, "oci": oci}

    def balance_sheet(self, lines: dict[str, Decimal], opening: dict[str, Decimal] | None, income: dict[str, Any]) -> dict[str, Any]:
        net_income: Decimal = income["net_income"]
        oci: Decimal = income["oci"]

        def present_amount(code: str, source: dict[str, Decimal]) -> Decimal:
            # Assets debit-positive; liabilities and equity credit-positive.
            return source[code] if LINES[code]["kind"] == "asset" else -source[code]

        groups = ["current_assets", "noncurrent_assets", "current_liabilities", "noncurrent_liabilities"]
        sections: dict[str, list[dict[str, Any]]] = {g: [] for g in groups + ["equity"]}
        totals: dict[str, Decimal] = {g: ZERO for g in groups}
        comp_totals: dict[str, Decimal] = {g: ZERO for g in groups}
        for code, meta in LINES.items():
            if meta["group"] not in groups:
                continue
            value = present_amount(code, lines)
            comp = present_amount(code, opening) if opening is not None else None
            totals[meta["group"]] += value
            if comp is not None:
                comp_totals[meta["group"]] += comp
            if value != 0 or (comp or ZERO) != 0 or code == "cash":
                sections[meta["group"]].append(self.statement_line("balance_sheet", code, value, comp))

        # Equity at period end: retained earnings after closing net income and dividends.
        share_capital = -lines["share_capital"]
        retained = -lines["retained_earnings"] + net_income - lines["dividends"]
        aoci = -lines["accumulated_oci"] + oci
        equity_values = {"share_capital": share_capital, "retained_earnings": retained, "accumulated_oci": aoci}
        comp_equity = None
        if opening is not None:
            comp_equity = {
                "share_capital": -opening["share_capital"],
                "retained_earnings": -opening["retained_earnings"] - opening["dividends"],
                "accumulated_oci": -opening["accumulated_oci"],
            }
        for code, value in equity_values.items():
            comp = comp_equity[code] if comp_equity else None
            if value != 0 or (comp or ZERO) != 0 or code != "accumulated_oci":
                sections["equity"].append(self.statement_line("balance_sheet", code, value, comp))
        total_equity = sum(equity_values.values(), ZERO)
        total_assets = totals["current_assets"] + totals["noncurrent_assets"]
        total_liabilities = totals["current_liabilities"] + totals["noncurrent_liabilities"]
        difference = total_assets - (total_liabilities + total_equity)
        if difference != 0:
            self.exception(
                "BS_IMBALANCE",
                "error",
                "Total assets differ from total liabilities and equity. No balancing amount has been added; resolve the trial balance, mapping or unmapped accounts.",
                amount=difference,
            )
        self.check(
            "BS_BALANCES",
            "pass" if difference == 0 else "fail",
            "Assets equal liabilities plus equity.",
            total_assets=total_assets,
            total_liabilities_and_equity=total_liabilities + total_equity,
            difference=difference,
        )
        result: dict[str, Any] = {
            "title": self.title("balance_sheet"),
            "status": "prepared",
            "sections": sections,
            "totals": {
                "total_current_assets": fmt(totals["current_assets"]),
                "total_assets": fmt(total_assets),
                "total_current_liabilities": fmt(totals["current_liabilities"]),
                "total_liabilities": fmt(total_liabilities),
                "total_equity": fmt(total_equity),
                "total_liabilities_and_equity": fmt(total_liabilities + total_equity),
            },
        }
        if opening is not None and comp_equity is not None:
            comp_assets = comp_totals["current_assets"] + comp_totals["noncurrent_assets"]
            comp_liabilities = comp_totals["current_liabilities"] + comp_totals["noncurrent_liabilities"]
            result["comparative_totals"] = {
                "total_assets": fmt(comp_assets),
                "total_liabilities": fmt(comp_liabilities),
                "total_equity": fmt(sum(comp_equity.values(), ZERO)),
            }
        return result

    def movements(self) -> list[dict[str, Any]]:
        result = []
        schedules = self.data.get("schedules") or {}
        for index, m in enumerate(schedules.get("movements") or []):
            line = m.get("line")
            section = m.get("section")
            if line not in LINES:
                raise InputError(f"schedules.movements[{index}].line {line!r} is not a documented line code")
            if section not in MOVEMENT_SECTIONS:
                raise InputError(f"schedules.movements[{index}].section must be one of {', '.join(MOVEMENT_SECTIONS)}")
            result.append({**m, "amount": dec(m.get("amount"), f"schedules.movements[{index}].amount"), "id": m.get("id") or f"movement[{index}]"})
        return result

    def equity_statement(self, lines: dict[str, Decimal], opening: dict[str, Decimal] | None, income: dict[str, Any]) -> dict[str, Any]:
        title = self.title("equity_statement")
        if opening is None:
            return {"title": title, "status": "not_prepared", "reason": self.blocked_statements.get("equity_statement")}
        net_income: Decimal = income["net_income"]
        oci: Decimal = income["oci"]
        movements = self.movements()

        def issued(code: str) -> Decimal:
            return -sum((m["amount"] for m in movements if m["line"] == code), ZERO)

        rows = []
        components = [("share_capital", -opening["share_capital"], -lines["share_capital"])]
        rows_re = {
            "opening": -opening["retained_earnings"],
            "net_income": net_income,
            "dividends": -lines["dividends"],
            "other": -(lines["retained_earnings"] - opening["retained_earnings"]),
        }
        closing_re = rows_re["opening"] + rows_re["net_income"] + rows_re["dividends"] + rows_re["other"]
        components.append(("retained_earnings", rows_re["opening"], closing_re))
        components.append(("accumulated_oci", -opening["accumulated_oci"], -lines["accumulated_oci"] + oci))
        ok = True
        for code, open_value, close_value in components:
            if code == "share_capital":
                explained = open_value + issued("share_capital")
                difference = close_value - explained
            elif code == "accumulated_oci":
                explained = open_value + oci + issued("accumulated_oci")
                difference = close_value - explained
            else:
                explained = rows_re["opening"] + rows_re["net_income"] + rows_re["dividends"] + issued("retained_earnings")
                difference = close_value - explained
            if difference != 0:
                ok = False
                self.exception(
                    "EQUITY_ROLLFORWARD_DIFFERENCE",
                    "error",
                    f"The {self.label(code)} roll-forward does not agree with the supporting schedules.",
                    line=code,
                    amount=difference,
                )
            if open_value != 0 or close_value != 0 or code != "accumulated_oci":
                rows.append({"code": code, "label": self.label(code), "opening": fmt(open_value), "closing": fmt(close_value), "closing_presented": self.present(close_value)})
        self.check("EQUITY_ROLLFORWARD", "pass" if ok else "fail", "Share capital, retained earnings and accumulated OCI roll forward from opening balances, profit, OCI and schedules.")
        return {
            "title": title,
            "status": "prepared",
            "components": rows,
            "retained_earnings": {k: fmt(v) for k, v in rows_re.items()} | {"closing": fmt(closing_re)},
            "other_comprehensive_income": fmt(oci),
        }

    def cash_flow_statement(self, lines: dict[str, Decimal], opening: dict[str, Decimal] | None, income: dict[str, Any]) -> dict[str, Any]:
        self.noncash_transactions: list[dict[str, Any]] = []
        title = self.title("cash_flow_statement")
        if opening is None or "cash_flow_statement" in self.blocked_statements:
            self.check("CASH_RECONCILES", "not_run", "Opening cash plus cash flows and FX effects equals closing cash.")
            return {"title": title, "status": "not_prepared", "reason": self.blocked_statements.get("cash_flow_statement")}
        net_income: Decimal = income["net_income"]
        oci: Decimal = income["oci"]
        movements = self.movements()
        incomplete = False

        # Every schedule line's change must be explained by movements.
        for code, meta in LINES.items():
            if meta["cf"] != "schedule":
                continue
            change = lines[code] - opening[code]
            explained = sum((m["amount"] for m in movements if m["line"] == code), ZERO)
            if change != explained:
                incomplete = True
                has = any(m["line"] == code for m in movements)
                self.exception(
                    "MOVEMENT_SCHEDULE_DIFFERENCE" if has else "MISSING_MOVEMENT_SCHEDULE",
                    "error",
                    f"The change in {self.label(code)} is not explained by movement schedules; balance-sheet changes alone do not establish cash flows.",
                    line=code,
                    amount=change - explained,
                )

        # Foreign-currency cash needs an FX schedule.
        schedules = self.data.get("schedules") or {}
        fx_entry = schedules.get("fx_cash_effect")
        fx_effect = dec(fx_entry.get("amount"), "schedules.fx_cash_effect.amount") if fx_entry else ZERO
        reporting = self.data.get("reporting_currency")
        foreign_cash = sorted(a for a, m in self.accounts_map.items() if m["line"] == "cash" and m.get("currency") not in (None, reporting))
        if foreign_cash and fx_entry is None:
            incomplete = True
            self.exception(
                "FX_SCHEDULE_MISSING",
                "error",
                "Cash is held in a foreign currency but no FX effect schedule was supplied; the exchange effect on cash cannot be separated from operating cash flows.",
                accounts=foreign_cash,
            )

        def section_total(name: str) -> Decimal:
            return -sum((m["amount"] for m in movements if m["section"] == name), ZERO)

        operating_lines = [{"label": self.t["net_income"], "amount": fmt(net_income)}]
        for m in movements:
            if m["section"] in ("noncash_pnl", "operating"):
                operating_lines.append({"label": m.get("description") or self.label(m["line"]), "amount": fmt(-m["amount"]), "movement": m["id"]})
        if fx_effect != 0:
            operating_lines.append({"label": self.t["fx_effect"], "amount": fmt(-fx_effect), "schedule": "fx_cash_effect"})
        working_capital = ZERO
        for code, meta in LINES.items():
            if meta["cf"] != "wc":
                continue
            change = -(lines[code] - opening[code])
            if change != 0:
                working_capital += change
                operating_lines.append({"label": self.t["change_in"].format(self.label(code).lower()), "amount": fmt(change), "line": code})
        cf_operating = net_income + section_total("noncash_pnl") + section_total("operating") + working_capital - fx_effect
        cf_investing = section_total("investing")
        cf_financing = section_total("financing")
        investing_lines = [{"label": m.get("description") or self.label(m["line"]), "amount": fmt(-m["amount"]), "movement": m["id"]} for m in movements if m["section"] == "investing"]
        financing_lines = [{"label": m.get("description") or self.label(m["line"]), "amount": fmt(-m["amount"]), "movement": m["id"]} for m in movements if m["section"] == "financing"]

        noncash = [m for m in movements if m["section"] == "noncash"]
        self.noncash_transactions = [{"id": m["id"], "line": m["line"], "amount": fmt(m["amount"]), "description": m.get("description", ""), "source": m.get("source")} for m in noncash]
        noncash_residual = oci - sum((m["amount"] for m in noncash), ZERO)
        if noncash_residual != 0:
            incomplete = True
            self.exception(
                "NONCASH_UNBALANCED",
                "error",
                "Non-cash movements and other comprehensive income do not offset; a non-cash transaction is missing or misclassified.",
                amount=noncash_residual,
            )

        opening_cash = opening["cash"]
        closing_cash = lines["cash"]
        net_change = cf_operating + cf_investing + cf_financing
        expected_closing = opening_cash + net_change + fx_effect
        difference = closing_cash - expected_closing
        if difference != 0:
            incomplete = True
            self.exception(
                "CASH_FLOW_UNRECONCILED",
                "error",
                "Opening cash plus cash flows and FX effects does not equal closing cash. No balancing amount has been added.",
                amount=difference,
            )
        self.check(
            "CASH_RECONCILES",
            "pass" if difference == 0 else "fail",
            "Opening cash plus cash flows and FX effects equals closing cash.",
            opening_cash=opening_cash,
            net_change=net_change,
            fx_effect=fx_effect,
            expected_closing_cash=expected_closing,
            closing_cash=closing_cash,
            difference=difference,
        )
        self.check("MOVEMENTS_EXPLAIN_CHANGES", "fail" if incomplete else "pass", "Movement schedules explain every investing, financing, equity and non-cash balance change.")
        return {
            "title": title,
            "status": "incomplete" if incomplete else "prepared",
            "method": "indirect",
            "sections": {"operating": operating_lines, "investing": investing_lines, "financing": financing_lines},
            "totals": {
                "net_cash_operating": fmt(cf_operating),
                "net_cash_investing": fmt(cf_investing),
                "net_cash_financing": fmt(cf_financing),
                "fx_effect": fmt(fx_effect),
                "net_change": fmt(net_change),
                "opening_cash": fmt(opening_cash),
                "closing_cash": fmt(closing_cash),
            },
        }

    def check_intercompany(self, closing: dict[str, Decimal]) -> None:
        by_counterparty: dict[tuple[str, str], Decimal] = {}
        for account, amount in closing.items():
            entry = self.accounts_map.get(account) or {}
            if entry.get("line") in ("intercompany_receivable", "intercompany_payable"):
                key = (str(entry.get("counterparty") or ""), entry["line"])
                by_counterparty[key] = by_counterparty.get(key, ZERO) + amount
        if not by_counterparty:
            return
        confirmations = {(str(c.get("counterparty")), c.get("line")): dec(c.get("balance"), "intercompany.confirmations.balance") for c in (self.data.get("intercompany") or {}).get("confirmations") or []}
        ok = True
        for (counterparty, line), amount in sorted(by_counterparty.items()):
            if not counterparty:
                ok = False
                self.exception("INTERCOMPANY_COUNTERPARTY_MISSING", "error", f"An account mapped to {line} names no counterparty.", line=line, amount=amount)
                continue
            confirmed = confirmations.get((counterparty, line))
            if confirmed is None:
                if amount != 0:
                    ok = False
                    self.exception("INTERCOMPANY_UNCONFIRMED", "warning", f"The balance with {counterparty} ({line}) has no counterparty confirmation.", counterparty=counterparty, amount=amount)
            elif confirmed != amount:
                ok = False
                self.exception(
                    "INTERCOMPANY_DIFFERENCE",
                    "error",
                    f"The balance with {counterparty} ({line}) differs from the counterparty's confirmation.",
                    counterparty=counterparty,
                    amount=amount - confirmed,
                )
        self.check("INTERCOMPANY_AGREES", "pass" if ok else "fail", "Intercompany balances agree with counterparty confirmations.")

    def check_comparatives(self, lines_opening: dict[str, Decimal] | None) -> None:
        comparative = self.data.get("comparative")
        if not comparative:
            return
        prior = self.balances(comparative.get("trial_balance") or [], "comparative.trial_balance")
        if lines_opening is None:
            self.check("COMPARATIVE_AGREES", "not_run", "Prior-period closing balances agree with this period's opening balances.")
            return
        prior_lines = self.by_line(prior)
        # Close the prior period: income to retained earnings, dividends to retained earnings, OCI to AOCI.
        closed = dict(prior_lines)
        income = sum((v for c, v in prior_lines.items() if LINES[c]["kind"] == "income"), ZERO)
        closed["retained_earnings"] += income + closed["dividends"]
        closed["accumulated_oci"] += closed["oci"]
        for code in LINES:
            if LINES[code]["kind"] in ("income", "oci") or code == "dividends":
                closed[code] = ZERO
        differences = {c: closed[c] - lines_opening[c] for c in LINES if closed[c] != lines_opening[c]}
        for code, diff in sorted(differences.items()):
            self.exception("COMPARATIVE_MISMATCH", "error", f"Prior-period closing {self.label(code)} differs from this period's opening balance.", line=code, amount=diff)
        self.check("COMPARATIVE_AGREES", "pass" if not differences else "fail", "Prior-period closing balances agree with this period's opening balances.")

    # ---------------------------------------------------------------- notes and traceability

    def notes(self) -> list[dict[str, str]]:
        d = self.data
        policies = d.get("policies") or {}
        fr = self.language == "fr"
        framework = TITLES[(self.framework if self.framework in SUPPORTED_FRAMEWORKS else None, self.language)]["framework"]
        notes = [
            {
                "title": "Mode de présentation" if fr else "Basis of presentation",
                "text": (
                    f"Projet préparé selon le référentiel choisi : {framework}. {self.t['draft']}"
                    if fr
                    else f"Draft prepared under the selected framework: {framework}. {self.t['draft']}"
                ),
            },
            {
                "title": "Principales méthodes comptables" if fr else "Significant accounting policies",
                "text": (
                    f"À rédiger à partir de la politique approuvée {policies.get('id')} (version {policies.get('version')}). Aucune méthode n'est présumée."
                    if fr
                    else f"To be written from approved policy {policies.get('id')} (version {policies.get('version')}). No policy is assumed."
                )
                if policies
                else ("Politiques approuvées manquantes : voir les exceptions." if fr else "Approved policies are missing: see exceptions."),
            },
        ]
        if self.noncash_transactions:
            items = "; ".join(f"{t['description'] or t['line']} ({t['amount']})" for t in self.noncash_transactions)
            notes.append({"title": "Opérations sans effet sur la trésorerie" if fr else "Non-cash transactions", "text": items})
        related = [m for m in self.accounts_map.values() if m.get("line") in ("intercompany_receivable", "intercompany_payable")]
        if related:
            parties = ", ".join(sorted({str(m.get("counterparty")) for m in related}))
            notes.append(
                {
                    "title": "Opérations entre apparentés" if fr else "Related party balances",
                    "text": (f"Soldes avec : {parties}. Nature et modalités à documenter." if fr else f"Balances with: {parties}. Nature and terms to be documented."),
                }
            )
        return notes

    def traceability(self, closing: dict[str, Decimal]) -> list[dict[str, Any]]:
        rows = []
        for account in sorted(closing):
            entry = self.accounts_map.get(account)
            rows.append(
                {
                    "account": account,
                    "account_name": self.names.get(account, ""),
                    "balance": fmt(closing[account]),
                    "line": entry["line"] if entry else None,
                    "statement": self.statement_of(entry["line"]) if entry else None,
                    "adjustments": sorted(set(self.adjustments_by_account.get(account, []))),
                }
            )
        return rows

    @staticmethod
    def statement_of(code: str) -> str:
        kind = LINES[code]["kind"]
        return "income_statement" if kind in ("income", "oci") else "balance_sheet"


# -------------------------------------------------------------------- rendering


def write_csv(path: Path, header: list[str], rows: list[list[Any]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(header)
        writer.writerows(rows)


def render(report: dict[str, Any], out: Path) -> None:
    t = TEXT[report["language"]]
    st = report["statements"]
    md: list[str] = []
    entity = (report.get("entity") or {}).get("name") or (report.get("entity") or {}).get("id") or ""
    period = (report.get("period") or {}).get("label") or ""
    md.append(f"# {entity} — {period}")
    md.append("")
    md.append(f"> {report['label']}")
    md.append("")
    md.append(f"- {report['framework_name']}")
    md.append(f"- {t['presented_in']}: {report.get('reporting_currency')} ({t['rounding_unit']} {report['presentation']['rounding_unit']})")
    md.append(f"- {t['status']}: {report['status']}")
    md.append(f"- {t['reviewer_status']}: {report['report']['reviewer_status']}")
    md.append(f"- {t['revision']}: {report['report']['revision']}")
    md.append(f"- {t['snapshot']}: {report['report']['snapshot'].get('id')} (sha256 {report['report']['input_sha256']})")
    md.append(f"- {t['policy']}: {report['report']['policy'].get('id')} v{report['report']['policy'].get('version')}; {t['mapping']}: {report['report']['mapping'].get('id')} v{report['report']['mapping'].get('version')}")
    md.append("")

    def table(title: str, rows: list[tuple[str, str]]) -> None:
        md.append(f"## {title}")
        md.append("")
        md.append(f"| {t['line']} | {t['amount']} |")
        md.append("| --- | ---: |")
        for label, amount in rows:
            md.append(f"| {label} | {amount} |")
        md.append("")

    inc = st["income_statement"]
    rows = [(line["label"], line["presented"]) for line in inc["lines"]]
    rows.append((f"**{t['net_income']}**", f"**{inc['totals']['net_income_presented']}**"))
    if "comprehensive_income" in inc["totals"]:
        rows.append((t["comprehensive_income"], inc["totals"]["comprehensive_income"]))
    table(inc["title"], rows)
    write_csv(out / "income_statement.csv", ["code", "label", "amount", "presented", "accounts", "adjustments"], [[l["code"], l["label"], l["amount"], l["presented"], " ".join(l["accounts"]), " ".join(l["adjustments"])] for l in inc["lines"]] + [["net_income", t["net_income"], inc["totals"]["net_income"], inc["totals"]["net_income_presented"], "", ""]])

    bs = st["balance_sheet"]
    rows = []
    csv_rows = []
    for section, lines in bs["sections"].items():
        for line in lines:
            rows.append((line["label"], line["presented"]))
            csv_rows.append([section, line["code"], line["label"], line["amount"], line["presented"], line.get("comparative", ""), " ".join(line["accounts"])])
    rows.append((f"**{t['total_assets']}**", f"**{bs['totals']['total_assets']}**"))
    rows.append((t["total_liabilities"], bs["totals"]["total_liabilities"]))
    rows.append((t["total_equity"], bs["totals"]["total_equity"]))
    rows.append((f"**{t['total_liabilities_equity']}**", f"**{bs['totals']['total_liabilities_and_equity']}**"))
    table(bs["title"], rows)
    write_csv(out / "balance_sheet.csv", ["section", "code", "label", "amount", "presented", "comparative", "accounts"], csv_rows)

    cf = st["cash_flow_statement"]
    if cf["status"] == "not_prepared":
        md.append(f"## {cf['title']}")
        md.append("")
        md.append(f"{t['not_prepared']}: {cf.get('reason')}")
        md.append("")
        write_csv(out / "cash_flow_statement.csv", ["section", "label", "amount"], [])
    else:
        rows = []
        csv_rows = []
        for section in ("operating", "investing", "financing"):
            rows.append((f"*{t[section]}*", ""))
            for line in cf["sections"][section]:
                rows.append((line["label"], line["amount"]))
                csv_rows.append([section, line["label"], line["amount"]])
            rows.append((t[f"net_cash_{section}"], cf["totals"][f"net_cash_{section}"]))
        rows.append((t["fx_effect"], cf["totals"]["fx_effect"]))
        rows.append((t["net_change"], cf["totals"]["net_change"]))
        rows.append((t["opening_cash"], cf["totals"]["opening_cash"]))
        rows.append((f"**{t['closing_cash']}**", f"**{cf['totals']['closing_cash']}**"))
        title = cf["title"] + (f" ({t['incomplete']})" if cf["status"] == "incomplete" else "")
        table(title, rows)
        write_csv(out / "cash_flow_statement.csv", ["section", "label", "amount"], csv_rows)

    eq = st["equity_statement"]
    if eq["status"] == "not_prepared":
        md.append(f"## {eq['title']}")
        md.append("")
        md.append(f"{t['not_prepared']}: {eq.get('reason')}")
        md.append("")
        write_csv(out / "equity_statement.csv", ["code", "label", "opening", "closing"], [])
    else:
        md.append(f"## {eq['title']}")
        md.append("")
        md.append(f"| {t['line']} | {t['opening']} | {t['closing']} |")
        md.append("| --- | ---: | ---: |")
        for c in eq["components"]:
            md.append(f"| {c['label']} | {c['opening']} | {c['closing']} |")
        md.append("")
        write_csv(out / "equity_statement.csv", ["code", "label", "opening", "closing"], [[c["code"], c["label"], c["opening"], c["closing"]] for c in eq["components"]])

    md.append(f"## {t['exceptions']}")
    md.append("")
    if report["exceptions"]:
        for e in report["exceptions"]:
            amount = f" ({e['amount']})" if "amount" in e else ""
            md.append(f"- **{e['severity']}** `{e['code']}`{amount}: {e['message']}")
    else:
        md.append(t["none"])
    md.append("")
    md.append(f"## {t['notes']}")
    md.append("")
    for n in report["notes_draft"]:
        md.append(f"- **{n['title']}.** {n['text']}")
    md.append("")
    (out / "statements.md").write_text("\n".join(md), encoding="utf-8")
    write_csv(out / "exceptions.csv", ["code", "severity", "message", "amount"], [[e["code"], e["severity"], e["message"], e.get("amount", "")] for e in report["exceptions"]])
    write_csv(out / "traceability.csv", ["account", "account_name", "balance", "line", "statement", "adjustments"], [[r["account"], r["account_name"], r["balance"], r["line"] or "", r["statement"] or "", " ".join(r["adjustments"])] for r in report["traceability"]])


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build a draft financial statement package from an input snapshot.")
    parser.add_argument("--input", required=True, help="input snapshot JSON (references/input-format.md)")
    parser.add_argument("--out-dir", required=True, help="directory to write report.json and renderings into")
    args = parser.parse_args(argv)
    path = Path(args.input)
    try:
        raw = path.read_bytes()
        data = json.loads(raw.decode("utf-8"), parse_float=Decimal)
        if not isinstance(data, dict):
            raise InputError("the input must be a JSON object")
        report = Builder(data, hashlib.sha256(raw).hexdigest()).build()
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, InputError) as error:
        print(f"input error: {error}", file=sys.stderr)
        return 2
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    (out / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    render(report, out)
    errors = sum(1 for e in report["exceptions"] if e["severity"] == "error")
    warnings = sum(1 for e in report["exceptions"] if e["severity"] == "warning")
    print(f"{report['status']}: {errors} error(s), {warnings} warning(s); wrote {out / 'report.json'}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
