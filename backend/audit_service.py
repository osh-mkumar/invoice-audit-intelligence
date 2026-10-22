import copy
import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, Any, List, Tuple

from audit.checks import (
    check_calculation_errors,
    check_rate_card_violations,
    check_gst_mismatches,
    check_mystery_surcharges,
    check_subtotal_mismatches,
    check_duplicate_invoices,
)
from backend.schemas import (
    AuditRequest,
    AuditResponse,
    AuditSummaryOutput,
    AuditBreakdownOutput,
    CheckStatus,
    ExposureDistinction,
    FlaggedInvoiceOutput,
    IssueOutput,
    OverlapAnalysisOutput,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_default_reference_data() -> Tuple[Dict[str, Dict[str, float]], Dict[str, float]]:
    """Loads baseline rate cards and GST references from repository data files."""
    rate_card_file = DATA_DIR / "finance_rate_card.json"
    gst_file = DATA_DIR / "finance_gst_reference.json"

    rate_card = {}
    gst_reference = {}

    if rate_card_file.exists():
        with open(rate_card_file, "r", encoding="utf-8") as f:
            rate_card = json.load(f)

    if gst_file.exists():
        with open(gst_file, "r", encoding="utf-8") as f:
            gst_reference = json.load(f)

    return rate_card, gst_reference


def get_available_reference_data() -> Dict[str, Any]:
    """Returns available reference data for frontend auto-complete and dropdowns."""
    rate_card, gst_reference = load_default_reference_data()
    vendors = sorted(list(rate_card.keys()))
    return {
        "vendors": vendors,
        "rate_cards": rate_card,
        "gst_reference": gst_reference,
    }


def execute_audit(request: AuditRequest) -> AuditResponse:
    """
    Executes the deterministic six-check audit on the submitted invoices.
    Applies custom reference data overrides, tracks check coverage, enriches every
    finding with exact evidence fields, and separates confirmed recoverable
    overcharges from potential financial exposure.
    """
    # 1. Prepare Reference Data
    if request.use_default_reference_data:
        base_rate_card, base_gst = load_default_reference_data()
        rate_card = copy.deepcopy(base_rate_card)
        gst_reference = copy.deepcopy(base_gst)
    else:
        rate_card = {}
        gst_reference = {}

    # Deep merge custom rate cards
    if request.custom_rate_card:
        for vendor, rates in request.custom_rate_card.items():
            if vendor not in rate_card:
                rate_card[vendor] = {}
            for item_desc, price in rates.items():
                rate_card[vendor][item_desc] = float(price)

    # Merge custom GST references
    if request.custom_gst_reference:
        for hsn, rate in request.custom_gst_reference.items():
            gst_reference[str(hsn)] = float(rate)

    # 2. Convert Pydantic invoices to dicts for audit checks
    invoices_data = [inv.model_dump() for inv in request.invoices]
    invoice_map = {inv["invoice_id"]: inv for inv in invoices_data}

    # Partition invoices by vendor rate card availability
    invoices_with_rate_card = []
    invoices_without_rate_card = []
    vendors_missing_rate_card = set()

    for inv in invoices_data:
        v_name = inv.get("vendor_name", "")
        if v_name in rate_card and len(rate_card[v_name]) > 0:
            invoices_with_rate_card.append(inv)
        else:
            invoices_without_rate_card.append(inv)
            vendors_missing_rate_card.add(v_name)

    # 3. Execute the 6 Audit Checks
    # Check 1: Calculation Errors (Line-item quantity * unit_price vs billed amount)
    calc_issues = check_calculation_errors(invoices_data)

    # Check 2: Rate Card Violations (Price drift above contracted schedule)
    rate_issues = []
    if invoices_with_rate_card:
        rate_issues = check_rate_card_violations(invoices_with_rate_card, rate_card)

    # Check 3: GST Mismatches (Statutory HSN tax rate comparison)
    gst_issues = check_gst_mismatches(invoices_data, gst_reference)

    # Check 4: Mystery Surcharges / Uncontracted Charges
    # Per requirements: Never assume an unknown service is an unauthorized surcharge
    # solely because it is missing from a reference file. If vendor has no rate card, skip.
    mystery_issues = []
    if invoices_with_rate_card:
        mystery_issues = check_mystery_surcharges(invoices_with_rate_card, rate_card)

    # Check 5: Subtotal Mismatches (Sum of line items vs stated subtotal)
    subtotal_issues = check_subtotal_mismatches(invoices_data)

    # Check 6: Duplicate Invoices (Deterministic fingerprint within submitted batch)
    duplicate_issues = check_duplicate_invoices(invoices_data)

    all_issues = (
        calc_issues
        + rate_issues
        + gst_issues
        + mystery_issues
        + subtotal_issues
        + duplicate_issues
    )

    # 4. Enrich Issues with complete evidence fields
    enriched_issues = []
    for issue in all_issues:
        inv_id = issue["invoice_id"]
        inv = invoice_map.get(inv_id, {})
        line_items = inv.get("line_items", [])
        
        enriched_issue = dict(issue)
        enriched_issue["invoice_date"] = inv.get("invoice_date", "")
        enriched_issue["invoice_total"] = inv.get("total", 0.0)
        enriched_issue["stated_subtotal"] = inv.get("subtotal")

        # Find matching line item if available
        line_idx = issue.get("line_index")
        line_item = None
        if line_idx is not None and 0 <= line_idx < len(line_items):
            line_item = line_items[line_idx]
        elif issue.get("description"):
            for it in line_items:
                if it.get("description") == issue.get("description"):
                    line_item = it
                    break

        if line_item:
            if not enriched_issue.get("description"):
                enriched_issue["description"] = line_item.get("description")
            if enriched_issue.get("quantity") is None:
                enriched_issue["quantity"] = line_item.get("quantity")
            if enriched_issue.get("unit_price") is None:
                enriched_issue["unit_price"] = line_item.get("unit_price")
            if enriched_issue.get("billed_amount") is None:
                enriched_issue["billed_amount"] = issue.get("amount") or line_item.get("amount")
            if not enriched_issue.get("hsn_code"):
                enriched_issue["hsn_code"] = line_item.get("hsn_code")
            if enriched_issue.get("invoice_gst_rate") is None:
                enriched_issue["invoice_gst_rate"] = line_item.get("gst_rate")
            if enriched_issue.get("taxable_amount") is None:
                enriched_issue["taxable_amount"] = line_item.get("amount")

        # Type-specific evidence mapping
        i_type = issue.get("issue_type")
        if i_type == "rate_card_violation":
            q = float(enriched_issue.get("quantity") or 1.0)
            inv_p = float(enriched_issue.get("invoice_unit_price") or enriched_issue.get("unit_price") or 0.0)
            cp = float(enriched_issue.get("contracted_price") or 0.0)
            enriched_issue["billed_amount"] = round(q * inv_p, 2)
            enriched_issue["expected_amount"] = round(q * cp, 2)
            if enriched_issue.get("unit_price") is None:
                enriched_issue["unit_price"] = inv_p
        elif i_type == "mystery_surcharge":
            enriched_issue["expected_amount"] = 0.0
            if enriched_issue.get("billed_amount") is None:
                enriched_issue["billed_amount"] = issue.get("amount")
            enriched_issue["charge_classification"] = "unmatched_uncontracted_review"
        elif i_type == "gst_mismatch":
            if enriched_issue.get("billed_amount") is None:
                enriched_issue["billed_amount"] = issue.get("taxable_amount")
        elif i_type == "duplicate_invoice":
            enriched_issue["billed_amount"] = inv.get("total")
            enriched_issue["expected_amount"] = 0.0
        elif i_type == "subtotal_mismatch":
            enriched_issue["stated_subtotal"] = issue.get("stated_subtotal", inv.get("subtotal"))
            enriched_issue["calculated_subtotal"] = issue.get("calculated_subtotal")

        enriched_issues.append(enriched_issue)

    # 5. Calculate Overcharges and Exposure
    calc_overcharge = round(sum(i["overcharge"] for i in calc_issues), 2)
    rate_overcharge = round(sum(i["overcharge"] for i in rate_issues), 2)
    gst_overcharge = round(sum(i["overcharge"] for i in gst_issues), 2)
    mystery_overcharge = round(sum(i["overcharge"] for i in mystery_issues), 2)
    subtotal_overcharge = round(sum(i["overcharge"] for i in subtotal_issues), 2)
    duplicate_overcharge = round(sum(i["overcharge"] for i in duplicate_issues), 2)

    total_overcharge = round(
        calc_overcharge
        + rate_overcharge
        + gst_overcharge
        + mystery_overcharge
        + subtotal_overcharge
        + duplicate_overcharge,
        2,
    )

    # Confirmed recoverable overcharges (arithmetic errors, contract price inflation, subtotal math, duplicates)
    confirmed_recoverable = round(
        calc_overcharge + rate_overcharge + subtotal_overcharge + duplicate_overcharge, 2
    )
    # Potential exposure (GST statutory rate variance & uncontracted charges requiring review)
    potential_exposure = round(gst_overcharge + mystery_overcharge, 2)

    # 6. Group Flagged Invoices
    flagged_invoices_map: Dict[str, Dict[str, Any]] = {}
    for issue in enriched_issues:
        inv_id = issue["invoice_id"]
        if inv_id not in flagged_invoices_map:
            inv = invoice_map.get(inv_id, {})
            flagged_invoices_map[inv_id] = {
                "invoice_id": inv_id,
                "vendor_name": inv.get("vendor_name", issue.get("vendor_name", "")),
                "vendor_type": inv.get("vendor_type", ""),
                "invoice_date": inv.get("invoice_date", ""),
                "subtotal": float(inv.get("subtotal", 0.0)),
                "gst_amount": float(inv.get("gst_amount", 0.0)),
                "total": float(inv.get("total", 0.0)),
                "payment_terms": inv.get("payment_terms", ""),
                "line_items": inv.get("line_items", []),
                "issues": [],
                "total_overcharge": 0.0,
            }
        flagged_invoices_map[inv_id]["issues"].append(IssueOutput(**issue))
        flagged_invoices_map[inv_id]["total_overcharge"] = round(
            flagged_invoices_map[inv_id]["total_overcharge"] + issue["overcharge"], 2
        )

    # 7. Overlap Analysis
    invoice_issues_map = defaultdict(list)
    invoice_vendor_map = {}
    for issue in enriched_issues:
        inv_id = issue["invoice_id"]
        invoice_issues_map[inv_id].append(issue)
        if "vendor_name" in issue:
            invoice_vendor_map[inv_id] = issue["vendor_name"]

    overlap_examples = []
    for inv_id, issues_list in invoice_issues_map.items():
        issue_types = list(set(issue["issue_type"] for issue in issues_list))
        if len(issue_types) > 1:
            overlap_examples.append(
                {
                    "invoice_id": inv_id,
                    "vendor_name": invoice_vendor_map.get(inv_id, ""),
                    "issue_types": sorted(issue_types),
                    "issue_count": len(issues_list),
                    "issues": issues_list,
                }
            )

    # 8. Check Status Tracking (completed vs skipped)
    checks_completed: List[CheckStatus] = []
    checks_skipped: List[CheckStatus] = []

    # Check 1: Calculation Errors
    checks_completed.append(
        CheckStatus(
            check_name="calculation_errors",
            display_name="Line Arithmetic Verification",
            status="completed",
            message=f"Verified arithmetic (qty × unit price vs billed amount) across {len(invoices_data)} invoice(s).",
            invoices_evaluated=len(invoices_data),
            issues_found=len(calc_issues),
        )
    )

    # Check 2: Rate Card Violations
    if len(invoices_with_rate_card) == len(invoices_data):
        checks_completed.append(
            CheckStatus(
                check_name="rate_card_violations",
                display_name="Contracted Rate Compliance",
                status="completed",
                message=f"Verified contracted unit pricing against rate cards for {len(invoices_data)} invoice(s).",
                invoices_evaluated=len(invoices_data),
                issues_found=len(rate_issues),
            )
        )
    elif len(invoices_with_rate_card) > 0:
        checks_completed.append(
            CheckStatus(
                check_name="rate_card_violations",
                display_name="Contracted Rate Compliance",
                status="partial",
                message=f"Evaluated {len(invoices_with_rate_card)} of {len(invoices_data)} invoice(s) with rate cards.",
                invoices_evaluated=len(invoices_with_rate_card),
                issues_found=len(rate_issues),
            )
        )
        checks_skipped.append(
            CheckStatus(
                check_name="rate_card_violations",
                display_name="Contracted Rate Compliance",
                status="skipped",
                message=f"Missing rate card for vendor(s): {', '.join(sorted(vendors_missing_rate_card))}.",
                invoices_evaluated=len(invoices_without_rate_card),
                issues_found=0,
            )
        )
    else:
        checks_skipped.append(
            CheckStatus(
                check_name="rate_card_violations",
                display_name="Contracted Rate Compliance",
                status="skipped",
                message=f"No rate cards provided for vendor(s): {', '.join(sorted(vendors_missing_rate_card))}.",
                invoices_evaluated=len(invoices_data),
                issues_found=0,
            )
        )

    # Check 3: GST Mismatches
    total_line_items = sum(len(inv.get("line_items", [])) for inv in invoices_data)
    matched_hsn_items = sum(
        1
        for inv in invoices_data
        for item in inv.get("line_items", [])
        if str(item.get("hsn_code", "")) in gst_reference
    )
    if matched_hsn_items > 0:
        checks_completed.append(
            CheckStatus(
                check_name="gst_mismatches",
                display_name="Statutory GST Rate Audit",
                status="completed" if matched_hsn_items == total_line_items else "partial",
                message=f"Evaluated {matched_hsn_items} line item(s) against GST reference rates.",
                invoices_evaluated=len(invoices_data),
                issues_found=len(gst_issues),
            )
        )
    else:
        checks_skipped.append(
            CheckStatus(
                check_name="gst_mismatches",
                display_name="Statutory GST Rate Audit",
                status="skipped",
                message="No matching HSN codes found in GST reference schedule for submitted line items.",
                invoices_evaluated=len(invoices_data),
                issues_found=0,
            )
        )

    # Check 4: Mystery Surcharges / Uncontracted Charges
    if len(invoices_with_rate_card) == len(invoices_data):
        checks_completed.append(
            CheckStatus(
                check_name="mystery_surcharges",
                display_name="Uncontracted Charge Audit",
                status="completed",
                message=f"Audited all line items for {len(invoices_data)} invoice(s) against contracted vendor rate schedules.",
                invoices_evaluated=len(invoices_data),
                issues_found=len(mystery_issues),
            )
        )
    elif len(invoices_with_rate_card) > 0:
        checks_completed.append(
            CheckStatus(
                check_name="mystery_surcharges",
                display_name="Uncontracted Charge Audit",
                status="partial",
                message=f"Evaluated {len(invoices_with_rate_card)} invoice(s) with known vendor rate schedules. {len(invoices_without_rate_card)} invoice(s) skipped due to missing rate schedules.",
                invoices_evaluated=len(invoices_with_rate_card),
                issues_found=len(mystery_issues),
            )
        )
        checks_skipped.append(
            CheckStatus(
                check_name="mystery_surcharges",
                display_name="Uncontracted Charge Audit",
                status="skipped",
                message=f"Missing reference data: No rate schedule provided for vendor(s): {', '.join(sorted(vendors_missing_rate_card))}. Cannot determine whether services are uncontracted.",
                invoices_evaluated=len(invoices_without_rate_card),
                issues_found=0,
            )
        )
    else:
        checks_skipped.append(
            CheckStatus(
                check_name="mystery_surcharges",
                display_name="Uncontracted Charge Audit",
                status="skipped",
                message="Skipped uncontracted charge audit: No rate schedules available for submitted vendors. Missing reference data prevents audit conclusion.",
                invoices_evaluated=len(invoices_data),
                issues_found=0,
            )
        )

    # Check 5: Subtotal Mismatches
    checks_completed.append(
        CheckStatus(
            check_name="subtotal_mismatches",
            display_name="Subtotal Summation Audit",
            status="completed",
            message=f"Verified line-item sum against stated subtotal for {len(invoices_data)} invoice(s).",
            invoices_evaluated=len(invoices_data),
            issues_found=len(subtotal_issues),
        )
    )

    # Check 6: Duplicate Invoices
    if len(invoices_data) > 1:
        checks_completed.append(
            CheckStatus(
                check_name="duplicate_invoices",
                display_name="Duplicate Invoice Detection",
                status="completed",
                message=f"Computed fingerprint comparison across {len(invoices_data)} invoices in the batch.",
                invoices_evaluated=len(invoices_data),
                issues_found=len(duplicate_issues),
            )
        )
    else:
        checks_completed.append(
            CheckStatus(
                check_name="duplicate_invoices",
                display_name="Duplicate Invoice Detection",
                status="completed",
                message="Single invoice batch evaluated. Duplicate detection compares within submitted batch; cross-batch duplicates require historical ledger integration.",
                invoices_evaluated=1,
                issues_found=0,
            )
        )

    # 9. Format response
    flagged_invoices_list = [
        FlaggedInvoiceOutput(**item) for item in flagged_invoices_map.values()
    ]
    no_issues_count = len(invoices_data) - len(flagged_invoices_list)

    summary = AuditSummaryOutput(
        invoices_audited=len(invoices_data),
        calculation_errors=len(calc_issues),
        rate_card_violations=len(rate_issues),
        gst_mismatches=len(gst_issues),
        mystery_surcharges=len(mystery_issues),
        subtotal_mismatches=len(subtotal_issues),
        duplicate_invoices=len(duplicate_issues),
        total_overcharge=total_overcharge,
    )

    breakdown = AuditBreakdownOutput(
        calculation_errors=calc_overcharge,
        rate_card_violations=rate_overcharge,
        gst_mismatches=gst_overcharge,
        mystery_surcharges=mystery_overcharge,
        subtotal_mismatches=subtotal_overcharge,
        duplicate_invoices=duplicate_overcharge,
    )

    return AuditResponse(
        summary=summary,
        breakdown=breakdown,
        issues=[IssueOutput(**i) for i in enriched_issues],
        flagged_invoices=flagged_invoices_list,
        overlap_analysis=OverlapAnalysisOutput(
            invoices_with_multiple_issue_types=len(overlap_examples),
            examples=overlap_examples,
        ),
        checks_completed=checks_completed,
        checks_skipped=checks_skipped,
        exposure_distinction=ExposureDistinction(
            confirmed_recoverable_overcharges=confirmed_recoverable,
            potential_financial_exposure=potential_exposure,
            total_overcharge=total_overcharge,
        ),
        clean_invoices_count=no_issues_count,
        no_issues_detected_count=no_issues_count,
        flagged_invoices_count=len(flagged_invoices_list),
    )
