import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from audit.checks import (
    check_calculation_errors,
    check_rate_card_violations,
    check_gst_mismatches,
    check_mystery_surcharges,
    check_subtotal_mismatches,
    check_duplicate_invoices,
)


def test_calculation_error_detected():
    # Quantity * unit_price (10 * 10.0 = 100.0) < billed amount (150.0) -> Overcharge of 50.0
    err_invoice = {
        "invoice_id": "INV-TEST-01",
        "vendor_name": "Test Vendor",
        "line_items": [
            {
                "description": "Widget A",
                "quantity": 10,
                "unit_price": 10.0,
                "amount": 150.0
            }
        ]
    }
    issues = check_calculation_errors([err_invoice])
    assert len(issues) == 1
    assert issues[0]["issue_type"] == "calculation_error"
    assert issues[0]["expected_amount"] == 100.0
    assert issues[0]["overcharge"] == 50.0

    # Correct invoice -> No issue
    correct_invoice = {
        "invoice_id": "INV-TEST-02",
        "vendor_name": "Test Vendor",
        "line_items": [
            {
                "description": "Widget A",
                "quantity": 10,
                "unit_price": 10.0,
                "amount": 100.0
            }
        ]
    }
    no_issues = check_calculation_errors([correct_invoice])
    assert len(no_issues) == 0


def test_rate_card_violation_detected():
    rate_card = {
        "Vendor Alpha": {
            "Standard Service": 100.0
        }
    }
    # Billed 120.0 vs contracted 100.0 for 5 units -> overcharge 100.0
    violation_invoice = {
        "invoice_id": "INV-TEST-03",
        "vendor_name": "Vendor Alpha",
        "line_items": [
            {
                "description": "Standard Service",
                "quantity": 5,
                "unit_price": 120.0
            }
        ]
    }
    issues = check_rate_card_violations([violation_invoice], rate_card)
    assert len(issues) == 1
    assert issues[0]["issue_type"] == "rate_card_violation"
    assert issues[0]["contracted_price"] == 100.0
    assert issues[0]["invoice_unit_price"] == 120.0
    assert issues[0]["overcharge"] == 100.0

    # Invoice at contracted price -> No issue
    normal_invoice = {
        "invoice_id": "INV-TEST-04",
        "vendor_name": "Vendor Alpha",
        "line_items": [
            {
                "description": "Standard Service",
                "quantity": 5,
                "unit_price": 100.0
            }
        ]
    }
    assert len(check_rate_card_violations([normal_invoice], rate_card)) == 0

    # Unknown description -> Skipped by rate card check
    unknown_desc_invoice = {
        "invoice_id": "INV-TEST-05",
        "vendor_name": "Vendor Alpha",
        "line_items": [
            {
                "description": "Unlisted Item",
                "quantity": 5,
                "unit_price": 200.0
            }
        ]
    }
    assert len(check_rate_card_violations([unknown_desc_invoice], rate_card)) == 0


def test_gst_mismatch_detected():
    gst_reference = {
        "9973": 18
    }
    # Billed 28% GST vs expected 18% GST on 1000.0 taxable amount -> Overcharge 100.0
    mismatch_invoice = {
        "invoice_id": "INV-TEST-06",
        "vendor_name": "Vendor Beta",
        "line_items": [
            {
                "description": "Ad Spend",
                "hsn_code": "9973",
                "gst_rate": 28,
                "amount": 1000.0
            }
        ]
    }
    issues = check_gst_mismatches([mismatch_invoice], gst_reference)
    assert len(issues) == 1
    assert issues[0]["issue_type"] == "gst_mismatch"
    assert issues[0]["expected_gst_rate"] == 18
    assert issues[0]["invoice_gst_rate"] == 28
    assert issues[0]["gst_overcharge"] == 100.0
    assert issues[0]["overcharge"] == 100.0

    # Matching GST rate -> No issue
    matching_invoice = {
        "invoice_id": "INV-TEST-07",
        "vendor_name": "Vendor Beta",
        "line_items": [
            {
                "description": "Ad Spend",
                "hsn_code": "9973",
                "gst_rate": 18,
                "amount": 1000.0
            }
        ]
    }
    assert len(check_gst_mismatches([matching_invoice], gst_reference)) == 0

    # Lower invoice GST rate (12% vs 18%) -> No overcharge issue
    lower_gst_invoice = {
        "invoice_id": "INV-TEST-08",
        "vendor_name": "Vendor Beta",
        "line_items": [
            {
                "description": "Ad Spend",
                "hsn_code": "9973",
                "gst_rate": 12,
                "amount": 1000.0
            }
        ]
    }
    assert len(check_gst_mismatches([lower_gst_invoice], gst_reference)) == 0


def test_mystery_surcharge_detected():
    rate_card = {
        "Vendor Gamma": {
            "Contracted Item": 50.0
        }
    }
    # Description absent from vendor rate card -> Flagged as mystery surcharge
    surcharge_invoice = {
        "invoice_id": "INV-TEST-09",
        "vendor_name": "Vendor Gamma",
        "line_items": [
            {
                "description": "Handling Fee",
                "quantity": 1,
                "unit_price": 250.0,
                "amount": 250.0,
                "hsn_code": "9988"
            }
        ]
    }
    issues = check_mystery_surcharges([surcharge_invoice], rate_card)
    assert len(issues) == 1
    assert issues[0]["issue_type"] == "mystery_surcharge"
    assert issues[0]["description"] == "Handling Fee"
    assert issues[0]["amount"] == 250.0
    assert issues[0]["overcharge"] == 250.0

    # Description present in rate card -> No issue
    approved_invoice = {
        "invoice_id": "INV-TEST-10",
        "vendor_name": "Vendor Gamma",
        "line_items": [
            {
                "description": "Contracted Item",
                "quantity": 2,
                "unit_price": 50.0,
                "amount": 100.0
            }
        ]
    }
    assert len(check_mystery_surcharges([approved_invoice], rate_card)) == 0


def test_subtotal_mismatch_detected():
    # Stated subtotal (500.0) > calculated sum of line items (400.0) -> Overcharge of 100.0
    mismatch_invoice = {
        "invoice_id": "INV-TEST-11",
        "vendor_name": "Vendor Delta",
        "subtotal": 500.0,
        "line_items": [
            {"amount": 250.0},
            {"amount": 150.0}
        ]
    }
    issues = check_subtotal_mismatches([mismatch_invoice])
    assert len(issues) == 1
    assert issues[0]["issue_type"] == "subtotal_mismatch"
    assert issues[0]["stated_subtotal"] == 500.0
    assert issues[0]["calculated_subtotal"] == 400.0
    assert issues[0]["overcharge"] == 100.0

    # Matching subtotal -> No issue
    matching_invoice = {
        "invoice_id": "INV-TEST-12",
        "vendor_name": "Vendor Delta",
        "subtotal": 400.0,
        "line_items": [
            {"amount": 250.0},
            {"amount": 150.0}
        ]
    }
    assert len(check_subtotal_mismatches([matching_invoice])) == 0


def test_duplicate_invoice_detected():
    inv1 = {
        "invoice_id": "INV-TEST-13",
        "vendor_name": "Vendor Epsilon",
        "subtotal": 1000.0,
        "gst_amount": 180.0,
        "total": 1180.0,
        "line_items": [
            {"description": "Item 1", "quantity": 10, "unit_price": 100.0, "amount": 1000.0}
        ]
    }
    inv2 = {
        "invoice_id": "INV-TEST-14",
        "vendor_name": "Vendor Epsilon",
        "subtotal": 1000.0,
        "gst_amount": 180.0,
        "total": 1180.0,
        "line_items": [
            {"description": "Item 1", "quantity": 10, "unit_price": 100.0, "amount": 1000.0}
        ]
    }
    issues = check_duplicate_invoices([inv1, inv2])
    assert len(issues) == 1
    assert issues[0]["issue_type"] == "duplicate_invoice"
    assert issues[0]["invoice_id"] == "INV-TEST-14"
    assert issues[0]["duplicate_of"] == "INV-TEST-13"
    assert issues[0]["amount"] == 1180.0
    assert issues[0]["overcharge"] == 1180.0

    # Invoices with different financial fingerprints -> Not flagged
    inv3 = {
        "invoice_id": "INV-TEST-15",
        "vendor_name": "Vendor Epsilon",
        "subtotal": 2000.0,
        "gst_amount": 360.0,
        "total": 2360.0,
        "line_items": [
            {"description": "Item 1", "quantity": 20, "unit_price": 100.0, "amount": 2000.0}
        ]
    }
    assert len(check_duplicate_invoices([inv1, inv3])) == 0


def test_multiple_duplicates():
    template = {
        "vendor_name": "Vendor Zeta",
        "subtotal": 500.0,
        "gst_amount": 90.0,
        "total": 590.0,
        "line_items": [
            {"description": "Service X", "quantity": 1, "unit_price": 500.0, "amount": 500.0}
        ]
    }
    inv1 = dict(template, invoice_id="INV-DUP-1")
    inv2 = dict(template, invoice_id="INV-DUP-2")
    inv3 = dict(template, invoice_id="INV-DUP-3")

    issues = check_duplicate_invoices([inv1, inv2, inv3])
    assert len(issues) == 2
    assert issues[0]["invoice_id"] == "INV-DUP-2"
    assert issues[0]["duplicate_of"] == "INV-DUP-1"
    assert issues[1]["invoice_id"] == "INV-DUP-3"
    assert issues[1]["duplicate_of"] == "INV-DUP-1"


def test_rounding_behavior():
    # Quantity = 3, Unit Price = 10.33 -> expected 30.99
    # Billed amount = 35.00 -> difference = 4.01
    invoice = {
        "invoice_id": "INV-ROUND-1",
        "vendor_name": "Vendor Rounding",
        "line_items": [
            {
                "description": "Fractional Item",
                "quantity": 3,
                "unit_price": 10.33,
                "amount": 35.0
            }
        ]
    }
    issues = check_calculation_errors([invoice])
    assert len(issues) == 1
    assert issues[0]["expected_amount"] == 30.99
    assert issues[0]["overcharge"] == 4.01
