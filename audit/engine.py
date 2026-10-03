from collections import defaultdict

try:
    from checks import (
        check_calculation_errors,
        check_rate_card_violations,
        check_gst_mismatches,
        check_mystery_surcharges,
        check_subtotal_mismatches,
        check_duplicate_invoices
    )
except ImportError:
    from audit.checks import (
        check_calculation_errors,
        check_rate_card_violations,
        check_gst_mismatches,
        check_mystery_surcharges,
        check_subtotal_mismatches,
        check_duplicate_invoices
    )


def run_audit(invoices, rate_card, gst_reference):
    calc_issues = check_calculation_errors(invoices)
    rate_issues = check_rate_card_violations(invoices, rate_card)
    gst_issues = check_gst_mismatches(invoices, gst_reference)
    mystery_issues = check_mystery_surcharges(invoices, rate_card)
    subtotal_issues = check_subtotal_mismatches(invoices)
    duplicate_issues = check_duplicate_invoices(invoices)

    all_issues = (
        calc_issues +
        rate_issues +
        gst_issues +
        mystery_issues +
        subtotal_issues +
        duplicate_issues
    )

    calc_overcharge = round(sum(i["overcharge"] for i in calc_issues), 2)
    rate_overcharge = round(sum(i["overcharge"] for i in rate_issues), 2)
    gst_overcharge = round(sum(i["overcharge"] for i in gst_issues), 2)
    mystery_overcharge = round(sum(i["overcharge"] for i in mystery_issues), 2)
    subtotal_overcharge = round(sum(i["overcharge"] for i in subtotal_issues), 2)
    duplicate_overcharge = round(sum(i["overcharge"] for i in duplicate_issues), 2)

    total_overcharge = round(
        calc_overcharge +
        rate_overcharge +
        gst_overcharge +
        mystery_overcharge +
        subtotal_overcharge +
        duplicate_overcharge,
        2
    )

    # Overlap analysis: group issues by invoice_id
    invoice_issues_map = defaultdict(list)
    invoice_vendor_map = {}

    for issue in all_issues:
        inv_id = issue["invoice_id"]
        invoice_issues_map[inv_id].append(issue)
        if "vendor_name" in issue:
            invoice_vendor_map[inv_id] = issue["vendor_name"]

    overlap_examples = []
    for inv_id, issues_list in invoice_issues_map.items():
        issue_types = list(set(issue["issue_type"] for issue in issues_list))
        if len(issue_types) > 1:
            overlap_examples.append({
                "invoice_id": inv_id,
                "vendor_name": invoice_vendor_map.get(inv_id, ""),
                "issue_types": sorted(issue_types),
                "issue_count": len(issues_list),
                "issues": issues_list
            })

    summary = {
        "invoices_audited": len(invoices),
        "calculation_errors": len(calc_issues),
        "rate_card_violations": len(rate_issues),
        "gst_mismatches": len(gst_issues),
        "mystery_surcharges": len(mystery_issues),
        "subtotal_mismatches": len(subtotal_issues),
        "duplicate_invoices": len(duplicate_issues),
        "total_overcharge": total_overcharge
    }

    breakdown = {
        "calculation_errors": calc_overcharge,
        "rate_card_violations": rate_overcharge,
        "gst_mismatches": gst_overcharge,
        "mystery_surcharges": mystery_overcharge,
        "subtotal_mismatches": subtotal_overcharge,
        "duplicate_invoices": duplicate_overcharge
    }

    overlap_analysis = {
        "invoices_with_multiple_issue_types": len(overlap_examples),
        "examples": overlap_examples
    }

    return {
        "summary": summary,
        "breakdown": breakdown,
        "issues": all_issues,
        "overlap_analysis": overlap_analysis
    }
