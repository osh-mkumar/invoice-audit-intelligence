import json
from pathlib import Path

try:
    from loader import load_all_data
    from engine import run_audit
except ImportError:
    from audit.loader import load_all_data
    from audit.engine import run_audit

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "output"
OUTPUT_FILE = OUTPUT_DIR / "audit_results.json"


def generate_audit_results():
    invoices, rate_card, gst_reference = load_all_data()

    audit_data = run_audit(invoices, rate_card, gst_reference)

    # Build quick lookup map for invoice-level metadata
    invoice_map = {inv["invoice_id"]: inv for inv in invoices}

    # Enrich issues with invoice-level metadata (invoice_date, invoice_total)
    enriched_issues = []
    for issue in audit_data["issues"]:
        inv_id = issue["invoice_id"]
        inv = invoice_map.get(inv_id, {})

        enriched_issue = dict(issue)
        if "invoice_date" not in enriched_issue:
            enriched_issue["invoice_date"] = inv.get("invoice_date", "")
        if "invoice_total" not in enriched_issue:
            enriched_issue["invoice_total"] = inv.get("total", 0.0)

        enriched_issues.append(enriched_issue)

    # Build list of flagged invoices with their issues
    flagged_invoices_map = {}
    for issue in enriched_issues:
        inv_id = issue["invoice_id"]
        if inv_id not in flagged_invoices_map:
            inv = invoice_map[inv_id]
            flagged_invoices_map[inv_id] = {
                "invoice_id": inv_id,
                "vendor_name": inv["vendor_name"],
                "vendor_type": inv.get("vendor_type", ""),
                "invoice_date": inv.get("invoice_date", ""),
                "subtotal": inv.get("subtotal", 0.0),
                "gst_amount": inv.get("gst_amount", 0.0),
                "total": inv.get("total", 0.0),
                "payment_terms": inv.get("payment_terms", ""),
                "line_items": inv.get("line_items", []),
                "issues": [],
                "total_overcharge": 0.0
            }
        flagged_invoices_map[inv_id]["issues"].append(issue)
        flagged_invoices_map[inv_id]["total_overcharge"] = round(
            flagged_invoices_map[inv_id]["total_overcharge"] + issue["overcharge"], 2
        )

    output_data = {
        "summary": audit_data["summary"],
        "breakdown": audit_data["breakdown"],
        "issues": enriched_issues,
        "flagged_invoices": list(flagged_invoices_map.values()),
        "overlap_analysis": audit_data.get("overlap_analysis", {})
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"Invoices audited: {audit_data['summary']['invoices_audited']}")
    print(f"Total overcharge: ₹{audit_data['summary']['total_overcharge']:,.2f}")
    print(f"Successfully generated {OUTPUT_FILE}")

    return output_data


if __name__ == "__main__":
    generate_audit_results()
