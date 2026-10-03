import json
from pathlib import Path

try:
    from engine import run_audit
except ImportError:
    from audit.engine import run_audit


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_json(filename):
    path = DATA_DIR / filename

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def load_all_data():
    invoices = load_json("finance_invoices.json")
    rate_card = load_json("finance_rate_card.json")
    gst_reference = load_json("finance_gst_reference.json")

    return invoices, rate_card, gst_reference


if __name__ == "__main__":
    invoices, rate_card, gst_reference = load_all_data()

    results = run_audit(invoices, rate_card, gst_reference)

    summary = results["summary"]
    breakdown = results["breakdown"]
    overlap_analysis = results["overlap_analysis"]

    print("Invoices audited:", summary["invoices_audited"])

    print("\n--- Issue Counts ---")
    print("Calculation errors:", summary["calculation_errors"])
    print("Rate card violations:", summary["rate_card_violations"])
    print("GST mismatches:", summary["gst_mismatches"])
    print("Mystery surcharges:", summary["mystery_surcharges"])
    print("Subtotal mismatches:", summary["subtotal_mismatches"])
    print("Duplicate invoices:", summary["duplicate_invoices"])

    print("\n--- Overcharge Amounts ---")
    print("Calculation errors: ₹", round(breakdown["calculation_errors"], 2))
    print("Rate card violations: ₹", round(breakdown["rate_card_violations"], 2))
    print("GST mismatches: ₹", round(breakdown["gst_mismatches"], 2))
    print("Mystery surcharges: ₹", round(breakdown["mystery_surcharges"], 2))
    print("Subtotal mismatches: ₹", round(breakdown["subtotal_mismatches"], 2))
    print("Duplicate invoices: ₹", round(breakdown["duplicate_invoices"], 2))

    print("\nTotal raw overcharge: ₹", round(summary["total_overcharge"], 2))

    print("\n--- Overlap Analysis ---")
    print("Invoices with multiple issue types:", overlap_analysis["invoices_with_multiple_issue_types"])

    print("\nFirst 10 overlap examples:")
    examples = overlap_analysis["examples"]
    if not examples:
        print("None found.")
    else:
        for example in examples[:10]:
            print(example)
