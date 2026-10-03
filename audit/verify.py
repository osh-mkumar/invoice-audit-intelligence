import json
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from collections import defaultdict

try:
    from engine import run_audit
except ImportError:
    from audit.engine import run_audit

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_json(filename):
    path = DATA_DIR / filename
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def to_d(val):
    return Decimal(str(val))


def round_curr(val):
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def verify_audit():
    invoices = load_json("finance_invoices.json")
    rate_card = load_json("finance_rate_card.json")
    gst_reference = load_json("finance_gst_reference.json")

    # Fetch results from engine
    engine_results = run_audit(invoices, rate_card, gst_reference)
    engine_breakdown = engine_results["breakdown"]
    engine_summary = engine_results["summary"]

    # Track invoice IDs with issues per category
    cat_invoices = defaultdict(set)

    # 1. Calculation errors
    calc_total = Decimal("0.00")
    for inv in invoices:
        inv_id = inv["invoice_id"]
        for item in inv["line_items"]:
            q = to_d(item["quantity"])
            p = to_d(item["unit_price"])
            billed = to_d(item["amount"])
            expected = round_curr(q * p)
            diff = round_curr(billed - expected)
            if diff > Decimal("0.00"):
                calc_total += diff
                cat_invoices[inv_id].add("calculation_errors")

    # 2. Rate card violations
    rc_total = Decimal("0.00")
    for inv in invoices:
        inv_id = inv["invoice_id"]
        v_rates = rate_card.get(inv["vendor_name"], {})
        for item in inv["line_items"]:
            desc = item["description"]
            if desc in v_rates:
                contracted = to_d(v_rates[desc])
                invoice_price = to_d(item["unit_price"])
                diff = round_curr(invoice_price - contracted)
                if diff > Decimal("0.00"):
                    overcharge = round_curr(diff * to_d(item["quantity"]))
                    rc_total += overcharge
                    cat_invoices[inv_id].add("rate_card_violations")

    # 3. GST mismatches
    gst_total = Decimal("0.00")
    for inv in invoices:
        inv_id = inv["invoice_id"]
        for item in inv["line_items"]:
            hsn = item["hsn_code"]
            if hsn in gst_reference:
                expected_rate = to_d(gst_reference[hsn])
                inv_rate = to_d(item["gst_rate"])
                if inv_rate != expected_rate:
                    diff_rate = inv_rate - expected_rate
                    overcharge = round_curr(to_d(item["amount"]) * diff_rate / Decimal("100"))
                    if overcharge > Decimal("0.00"):
                        gst_total += overcharge
                        cat_invoices[inv_id].add("gst_mismatches")

    # 4. Mystery surcharges
    myst_total = Decimal("0.00")
    for inv in invoices:
        inv_id = inv["invoice_id"]
        v_rates = rate_card.get(inv["vendor_name"], {})
        for item in inv["line_items"]:
            desc = item["description"]
            if desc not in v_rates:
                myst_total += to_d(item["amount"])
                cat_invoices[inv_id].add("mystery_surcharges")

    # 5. Subtotal mismatches
    sub_total = Decimal("0.00")
    for inv in invoices:
        inv_id = inv["invoice_id"]
        stated = to_d(inv["subtotal"])
        calc_sub = round_curr(sum(to_d(item["amount"]) for item in inv["line_items"]))
        diff = round_curr(stated - calc_sub)
        if diff > Decimal("0.00"):
            sub_total += diff
            cat_invoices[inv_id].add("subtotal_mismatches")

    # 6. Duplicate invoices
    dup_total = Decimal("0.00")
    seen_fingerprints = {}
    for inv in invoices:
        inv_id = inv["invoice_id"]
        line_items_tuple = tuple(
            (item["description"], item["quantity"], item["unit_price"], item["amount"])
            for item in inv["line_items"]
        )
        fingerprint = (
            inv["vendor_name"],
            line_items_tuple,
            inv["subtotal"],
            inv["gst_amount"],
            inv["total"]
        )
        if fingerprint in seen_fingerprints:
            dup_total += to_d(inv["total"])
            cat_invoices[inv_id].add("duplicate_invoices")
        else:
            seen_fingerprints[fingerprint] = inv_id

    # Raw total calculation
    independent_raw_total = (
        calc_total + rc_total + gst_total + myst_total + sub_total + dup_total
    )

    engine_raw_total = Decimal(str(engine_summary["total_overcharge"]))

    # Check overlaps
    overlapping_invoices = sum(1 for categories in cat_invoices.values() if len(categories) > 1)

    # Format helpers
    def fmt(val):
        return f"₹{float(val):,.2f}"

    def check_match(e_val, i_val):
        return "YES" if abs(Decimal(str(e_val)) - i_val) < Decimal("0.01") else "NO"

    calc_match = check_match(engine_breakdown["calculation_errors"], calc_total)
    rc_match = check_match(engine_breakdown["rate_card_violations"], rc_total)
    gst_match = check_match(engine_breakdown["gst_mismatches"], gst_total)
    myst_match = check_match(engine_breakdown["mystery_surcharges"], myst_total)
    sub_match = check_match(engine_breakdown["subtotal_mismatches"], sub_total)
    dup_match = check_match(engine_breakdown["duplicate_invoices"], dup_total)
    final_match = check_match(engine_summary["total_overcharge"], independent_raw_total)

    all_passed = (
        calc_match == "YES" and
        rc_match == "YES" and
        gst_match == "YES" and
        myst_match == "YES" and
        sub_match == "YES" and
        dup_match == "YES" and
        final_match == "YES" and
        overlapping_invoices == 0
    )

    print("=== FINAL AUDIT VERIFICATION ===\n")

    print("Calculation errors:")
    print(f"Engine:       {fmt(engine_breakdown['calculation_errors'])}")
    print(f"Independent:  {fmt(calc_total)}")
    print(f"Match:        {calc_match}\n")

    print("GST mismatches:")
    print(f"Engine:       {fmt(engine_breakdown['gst_mismatches'])}")
    print(f"Independent:  {fmt(gst_total)}")
    print(f"Match:        {gst_match}\n")

    print("Mystery surcharges:")
    print(f"Engine:       {fmt(engine_breakdown['mystery_surcharges'])}")
    print(f"Independent:  {fmt(myst_total)}")
    print(f"Match:        {myst_match}\n")

    print("Subtotal mismatches:")
    print(f"Engine:       {fmt(engine_breakdown['subtotal_mismatches'])}")
    print(f"Independent:  {fmt(sub_total)}")
    print(f"Match:        {sub_match}\n")

    print("Duplicate invoices:")
    print(f"Engine:       {fmt(engine_breakdown['duplicate_invoices'])}")
    print(f"Independent:  {fmt(dup_total)}")
    print(f"Match:        {dup_match}\n")

    print("--------------------------------")
    print(f"Engine raw total:       {fmt(engine_summary['total_overcharge'])}")
    print(f"Independent raw total:  {fmt(independent_raw_total)}")
    print(f"Final match:            {final_match}")
    print("--------------------------------\n")

    print(f"Overlapping invoices: {overlapping_invoices}")
    print(f"FINAL VERIFICATION: {'PASSED' if all_passed else 'FAILED'}")


if __name__ == "__main__":
    verify_audit()
