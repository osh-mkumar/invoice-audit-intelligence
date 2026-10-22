import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.audit_service import execute_audit
from backend.schemas import AuditRequest
from audit.loader import load_all_data

client = TestClient(app)


def test_health_check_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_reference_data_endpoint():
    response = client.get("/api/reference-data")
    assert response.status_code == 200
    data = response.json()
    assert "vendors" in data
    assert len(data["vendors"]) > 0
    assert "Delhivery Logistics" in data["vendors"]
    assert "rate_cards" in data
    assert "gst_reference" in data
    assert "9965" in data["gst_reference"]
    assert data["gst_reference"]["9965"] == 18.0


def test_audit_clean_invoice():
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-CLEAN-01",
                "vendor_name": "Delhivery Logistics",
                "invoice_date": "2026-01-15",
                "subtotal": 201.6,
                "gst_amount": 36.29,
                "total": 237.89,
                "line_items": [
                    {
                        "description": "Freight charges - Zone A",
                        "quantity": 10,
                        "unit_price": 20.16,
                        "amount": 201.6,
                        "gst_rate": 18.0,
                        "hsn_code": "9965"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    response = client.post("/api/audit", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["summary"]["invoices_audited"] == 1
    assert res["summary"]["total_overcharge"] == 0.0
    assert len(res["issues"]) == 0
    assert res["clean_invoices_count"] == 1
    assert res["flagged_invoices_count"] == 0

    # Verify duplicate single-invoice note
    dup_check = next(c for c in res["checks_completed"] if c["check_name"] == "duplicate_invoices")
    assert "Single invoice batch evaluated" in dup_check["message"]


def test_audit_calculation_error():
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-CALC-ERR",
                "vendor_name": "Delhivery Logistics",
                "invoice_date": "2026-01-15",
                "subtotal": 300.0,
                "gst_amount": 54.0,
                "total": 354.0,
                "line_items": [
                    {
                        "description": "Freight charges - Zone A",
                        "quantity": 10,
                        "unit_price": 20.16,
                        "amount": 300.0,  # Should be 201.60 -> Overcharge 98.40
                        "gst_rate": 18.0,
                        "hsn_code": "9965"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    response = client.post("/api/audit", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["summary"]["calculation_errors"] == 1
    assert res["breakdown"]["calculation_errors"] == 98.40
    assert res["exposure_distinction"]["confirmed_recoverable_overcharges"] == 98.40
    assert res["flagged_invoices_count"] == 1


def test_audit_custom_rate_card_violation():
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-CUSTOM-RC",
                "vendor_name": "Acme Software Corp",
                "subtotal": 1000.0,
                "gst_amount": 180.0,
                "total": 1180.0,
                "line_items": [
                    {
                        "description": "Cloud Support Seat",
                        "quantity": 10,
                        "unit_price": 100.0,  # Contracted at 75 -> Overcharge (100-75)*10 = 250
                        "amount": 1000.0,
                        "gst_rate": 18.0,
                        "hsn_code": "998313"
                    }
                ]
            }
        ],
        "custom_rate_card": {
            "Acme Software Corp": {
                "Cloud Support Seat": 75.0
            }
        },
        "use_default_reference_data": True
    }
    response = client.post("/api/audit", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["summary"]["rate_card_violations"] == 1
    assert res["breakdown"]["rate_card_violations"] == 250.0


def test_audit_custom_gst_mismatch():
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-CUSTOM-GST",
                "vendor_name": "Acme Logistics",
                "subtotal": 1000.0,
                "gst_amount": 180.0,
                "total": 1180.0,
                "line_items": [
                    {
                        "description": "Custom Courier Service",
                        "quantity": 1,
                        "unit_price": 1000.0,
                        "amount": 1000.0,
                        "gst_rate": 18.0,  # Expected 12% -> Overcharge 1000 * 6% = 60.0
                        "hsn_code": "999901"
                    }
                ]
            }
        ],
        "custom_gst_reference": {
            "999901": 12.0
        },
        "use_default_reference_data": True
    }
    response = client.post("/api/audit", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["summary"]["gst_mismatches"] == 1
    assert res["breakdown"]["gst_mismatches"] == 60.0
    assert res["exposure_distinction"]["potential_financial_exposure"] == 60.0


def test_audit_duplicate_in_batch():
    inv1 = {
        "invoice_id": "INV-DUP-01",
        "vendor_name": "Test Vendor",
        "subtotal": 100.0,
        "gst_amount": 18.0,
        "total": 118.0,
        "line_items": [
            {
                "description": "Standard Item",
                "quantity": 1,
                "unit_price": 100.0,
                "amount": 100.0,
                "gst_rate": 18.0,
                "hsn_code": "9965"
            }
        ]
    }
    inv2 = dict(inv1)
    inv2["invoice_id"] = "INV-DUP-02"  # Identical items, vendor, amounts

    payload = {
        "invoices": [inv1, inv2],
        "use_default_reference_data": False
    }
    response = client.post("/api/audit", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["summary"]["invoices_audited"] == 2
    assert res["summary"]["duplicate_invoices"] == 1
    assert res["breakdown"]["duplicate_invoices"] == 118.0
    assert res["issues"][0]["duplicate_of"] == "INV-DUP-01"


def test_unknown_vendor_without_rate_card_skips_mystery_surcharge():
    """
    Requirement: Never assume an unknown service is an unauthorized surcharge
    solely because it is missing from a reference file. If reference data is insufficient,
    clearly identify which checks could not be completed.
    """
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-NEW-VENDOR",
                "vendor_name": "Brand New Startup Ltd",
                "subtotal": 500.0,
                "gst_amount": 90.0,
                "total": 590.0,
                "line_items": [
                    {
                        "description": "Consulting Advisory Session",
                        "quantity": 5,
                        "unit_price": 100.0,
                        "amount": 500.0,
                        "gst_rate": 18.0,
                        "hsn_code": "998311"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    response = client.post("/api/audit", json=payload)
    assert response.status_code == 200
    res = response.json()
    # Should NOT falsely flag as mystery surcharge!
    assert res["summary"]["mystery_surcharges"] == 0
    assert res["summary"]["rate_card_violations"] == 0
    assert res["summary"]["total_overcharge"] == 0.0

    # Checks skipped should record missing rate card
    skipped_names = [c["check_name"] for c in res["checks_skipped"]]
    assert "mystery_surcharges" in skipped_names
    assert "rate_card_violations" in skipped_names


def test_malformed_request_validation_handling():
    # Missing required line_items
    invalid_payload = {
        "invoices": [
            {
                "invoice_id": "INV-INVALID",
                "vendor_name": "Vendor A",
                "subtotal": 100.0,
                "total": 100.0,
                "line_items": []  # Empty!
            }
        ]
    }
    response = client.post("/api/audit", json=invalid_payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"] == "Validation Error"
    assert "details" in data


def test_full_508_demo_dataset_regression_through_api():
    """
    Ensures that running the verified 508-invoice dataset through the API service
    produces the exact verified numbers down to 2 decimal places.
    """
    invoices, _, _ = load_all_data()
    req = AuditRequest(
        invoices=invoices,
        use_default_reference_data=True
    )
    result = execute_audit(req)

    assert result.summary.invoices_audited == 508
    assert result.summary.calculation_errors == 23
    assert result.summary.rate_card_violations == 0
    assert result.summary.gst_mismatches == 15
    assert result.summary.mystery_surcharges == 12
    assert result.summary.subtotal_mismatches == 7
    assert result.summary.duplicate_invoices == 8

    assert result.breakdown.calculation_errors == pytest.approx(61181.58, abs=0.01)
    assert result.breakdown.rate_card_violations == pytest.approx(0.00, abs=0.01)
    assert result.breakdown.gst_mismatches == pytest.approx(1200082.26, abs=0.01)
    assert result.breakdown.mystery_surcharges == pytest.approx(24613.97, abs=0.01)
    assert result.breakdown.subtotal_mismatches == pytest.approx(18186.35, abs=0.01)
    assert result.breakdown.duplicate_invoices == pytest.approx(16256034.78, abs=0.01)
    assert result.summary.total_overcharge == pytest.approx(17560098.94, abs=0.01)

    assert result.overlap_analysis.invoices_with_multiple_issue_types == 0
    assert result.flagged_invoices_count == 65
    assert result.clean_invoices_count == 443
    assert result.no_issues_detected_count == 443


def test_custom_audit_evidence_serialization_inv_5626():
    """
    Regression test for the user's specific scenario:
    Invoice INV-5626 with vendor Ashok Packaging Pvt Ltd and uncontracted
    line item 'Freight charges - Zone A'.
    Verifies that all evidence fields (billed_amount, quantity, unit_price,
    stated_subtotal, invoice_gst_rate, hsn_code, charge_classification)
    are serialized with their actual values and never default to None or 0.0.
    """
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-5626",
                "vendor_name": "Ashok Packaging Pvt Ltd",
                "invoice_date": "2026-03-10",
                "subtotal": 201.60,
                "gst_amount": 36.29,
                "total": 237.89,
                "payment_terms": "Net 30",
                "line_items": [
                    {
                        "description": "Freight charges - Zone A",
                        "quantity": 10,
                        "unit_price": 20.16,
                        "amount": 201.60,
                        "gst_rate": 18.0,
                        "hsn_code": "9965"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    response = client.post("/api/audit", json=payload)
    assert response.status_code == 200
    res = response.json()

    # Should flag uncontracted charge (Ashok Packaging has packaging rate card, not freight)
    assert res["summary"]["mystery_surcharges"] == 1
    assert len(res["issues"]) == 1
    assert len(res["flagged_invoices"]) == 1

    issue = res["issues"][0]
    # Check evidence fields
    assert issue["invoice_id"] == "INV-5626"
    assert issue["vendor_name"] == "Ashok Packaging Pvt Ltd"
    assert issue["description"] == "Freight charges - Zone A"
    assert issue["quantity"] == 10.0
    assert issue["unit_price"] == 20.16
    assert issue["billed_amount"] == 201.60
    assert issue["expected_amount"] == 0.0  # Uncontracted service
    assert issue["stated_subtotal"] == 201.60
    assert issue["invoice_gst_rate"] == 18.0
    assert issue["hsn_code"] == "9965"
    assert issue["overcharge"] == 201.60
    assert issue["charge_classification"] == "unmatched_uncontracted_review"

    # Check flagged invoice mapping
    flagged = res["flagged_invoices"][0]
    assert flagged["subtotal"] == 201.60
    assert flagged["gst_amount"] == 36.29
    assert flagged["total"] == 237.89
    assert len(flagged["line_items"]) == 1
    assert flagged["line_items"][0]["amount"] == 201.60
    assert flagged["line_items"][0]["gst_rate"] == 18.0

    flagged_issue = flagged["issues"][0]
    assert flagged_issue["billed_amount"] == 201.60
    assert flagged_issue["stated_subtotal"] == 201.60
    assert flagged_issue["invoice_gst_rate"] == 18.0


def test_custom_audit_multi_line_arithmetic_evidence_serialization():
    """
    Verifies that calculation error issues carry the exact line item evidence
    (billed_amount, expected_amount, quantity, unit_price, line_index, stated_subtotal).
    """
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-MULTI-CALC",
                "vendor_name": "Delhivery Logistics",
                "subtotal": 550.0,
                "gst_amount": 99.0,
                "total": 649.0,
                "line_items": [
                    {
                        "description": "Freight charges - Zone A",
                        "quantity": 5,
                        "unit_price": 20.16,
                        "amount": 100.80,
                        "gst_rate": 18.0,
                        "hsn_code": "9965"
                    },
                    {
                        "description": "Freight charges - Zone B",
                        "quantity": 10,
                        "unit_price": 271.80,
                        "amount": 3000.0,  # Should be 2718.00 -> Overcharge 282.00
                        "gst_rate": 18.0,
                        "hsn_code": "9965"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    response = client.post("/api/audit", json=payload)
    assert response.status_code == 200
    res = response.json()

    calc_issues = [i for i in res["issues"] if i["issue_type"] == "calculation_error"]
    assert len(calc_issues) == 1
    iss = calc_issues[0]
    assert iss["description"] == "Freight charges - Zone B"
    assert iss["quantity"] == 10.0
    assert iss["unit_price"] == 271.80
    assert iss["billed_amount"] == 3000.0
    assert iss["expected_amount"] == 2718.0
    assert iss["overcharge"] == 282.0
    assert iss["line_index"] == 1
    assert iss["stated_subtotal"] == 550.0
    assert iss["invoice_gst_rate"] == 18.0


def test_workflow_valid_invoice_no_issues():
    """1. One invoice with valid calculations -> No issues detected."""
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-VALID-01",
                "vendor_name": "Delhivery Logistics",
                "invoice_date": "2026-03-01",
                "subtotal": 201.60,
                "gst_amount": 36.29,
                "total": 237.89,
                "line_items": [
                    {
                        "description": "Freight charges - Zone A",
                        "quantity": 10,
                        "unit_price": 20.16,
                        "amount": 201.60,
                        "gst_rate": 18.0,
                        "hsn_code": "9965"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    res = client.post("/api/audit", json=payload).json()
    assert res["summary"]["invoices_audited"] == 1
    assert res["summary"]["total_overcharge"] == 0.0
    assert len(res["issues"]) == 0
    assert res["clean_invoices_count"] == 1
    assert res["no_issues_detected_count"] == 1
    assert res["flagged_invoices_count"] == 0


def test_workflow_incorrect_arithmetic():
    """2. One invoice with deliberately incorrect arithmetic."""
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-ARITH-ERR",
                "vendor_name": "Delhivery Logistics",
                "invoice_date": "2026-03-01",
                "subtotal": 300.0,
                "gst_amount": 54.0,
                "total": 354.0,
                "line_items": [
                    {
                        "description": "Freight charges - Zone A",
                        "quantity": 10,
                        "unit_price": 20.16,
                        "amount": 300.0,  # Expected 201.60 -> Overcharge 98.40
                        "gst_rate": 18.0,
                        "hsn_code": "9965"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    res = client.post("/api/audit", json=payload).json()
    assert res["summary"]["calculation_errors"] == 1
    iss = res["issues"][0]
    assert iss["billed_amount"] == 300.0
    assert iss["expected_amount"] == 201.60
    assert iss["overcharge"] == 98.40
    assert iss["quantity"] == 10.0
    assert iss["unit_price"] == 20.16
    assert "Line item arithmetic mismatch" in iss["description"] or iss["description"] == "Freight charges - Zone A"


def test_workflow_incorrect_gst_rate():
    """3. One invoice with an incorrect GST rate."""
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-GST-ERR",
                "vendor_name": "Delhivery Logistics",
                "invoice_date": "2026-03-01",
                "subtotal": 1000.0,
                "gst_amount": 180.0,
                "total": 1180.0,
                "line_items": [
                    {
                        "description": "Freight charges - Zone A",
                        "quantity": 1,
                        "unit_price": 20.16,
                        "amount": 1000.0,
                        "gst_rate": 28.0,  # Expected 18% in reference -> Overcharge 1000 * 10% = 100.0
                        "hsn_code": "9965"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    res = client.post("/api/audit", json=payload).json()
    gst_issues = [i for i in res["issues"] if i["issue_type"] == "gst_mismatch"]
    assert len(gst_issues) == 1
    iss = gst_issues[0]
    assert iss["invoice_gst_rate"] == 28.0
    assert iss["expected_gst_rate"] == 18.0
    assert iss["billed_amount"] == 1000.0
    assert iss["overcharge"] == 100.0


def test_workflow_multiple_invoices_with_duplicate():
    """4. Multiple invoices containing an identical duplicate."""
    inv1 = {
        "invoice_id": "INV-BATCH-01",
        "vendor_name": "Delhivery Logistics",
        "invoice_date": "2026-03-01",
        "subtotal": 201.60,
        "gst_amount": 36.29,
        "total": 237.89,
        "line_items": [
            {
                "description": "Freight charges - Zone A",
                "quantity": 10,
                "unit_price": 20.16,
                "amount": 201.60,
                "gst_rate": 18.0,
                "hsn_code": "9965"
            }
        ]
    }
    inv2 = dict(inv1)
    inv2["invoice_id"] = "INV-BATCH-02"  # Identical duplicate

    payload = {"invoices": [inv1, inv2], "use_default_reference_data": True}
    res = client.post("/api/audit", json=payload).json()
    assert res["summary"]["invoices_audited"] == 2
    assert res["summary"]["duplicate_invoices"] == 1
    dup_iss = [i for i in res["issues"] if i["issue_type"] == "duplicate_invoice"][0]
    assert dup_iss["duplicate_of"] == "INV-BATCH-01"
    assert dup_iss["overcharge"] == 237.89
    assert dup_iss["expected_amount"] == 0.0


def test_workflow_unmatched_rate_card_description():
    """5. An invoice with an unmatched rate-card description."""
    payload = {
        "invoices": [
            {
                "invoice_id": "INV-UNMATCHED-01",
                "vendor_name": "Ashok Packaging Pvt Ltd",
                "invoice_date": "2026-03-01",
                "subtotal": 500.0,
                "gst_amount": 90.0,
                "total": 590.0,
                "line_items": [
                    {
                        "description": "Unlisted Pallet Storage Fee",
                        "quantity": 5,
                        "unit_price": 100.0,
                        "amount": 500.0,
                        "gst_rate": 18.0,
                        "hsn_code": "9983"
                    }
                ]
            }
        ],
        "use_default_reference_data": True
    }
    res = client.post("/api/audit", json=payload).json()
    assert res["summary"]["mystery_surcharges"] == 1
    iss = res["issues"][0]
    assert iss["charge_classification"] == "unmatched_uncontracted_review"
    assert iss["billed_amount"] == 500.0
    assert iss["expected_amount"] == 0.0
    assert iss["overcharge"] == 500.0


def test_workflow_json_batch_upload_simulation():
    """6. Batch uploaded through JSON simulation (using sample_invoices.json structure)."""
    import json
    from pathlib import Path
    json_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "templates" / "sample_invoices.json"
    with open(json_path, "r", encoding="utf-8") as f:
        invoices = json.load(f)

    payload = {
        "invoices": invoices,
        "custom_rate_card": {
            "Apex Logistics Solutions": {
                "Express Cargo Transport - Zone A": 250.0,
                "Surface Courier Delivery": 200.0
            },
            "Pinnacle Packaging Ltd": {
                "Corrugated Heavy Shipping Boxes": 150.0,
                "Protective Air Cushion Rolls": 150.0
            }
        },
        "custom_gst_reference": {
            "9965": 18.0,
            "4819": 12.0,
            "3923": 12.0
        },
        "use_default_reference_data": True
    }
    res = client.post("/api/audit", json=payload).json()
    assert res["summary"]["invoices_audited"] == 3
    # SYN-INV-1002 has line items: qty 40 * 150 = 6000, billed 6900 -> calculation error of 900
    assert res["summary"]["calculation_errors"] >= 1
    calc_iss = next(i for i in res["issues"] if i["issue_type"] == "calculation_error")
    assert calc_iss["billed_amount"] == 6900.0
    assert calc_iss["expected_amount"] == 6000.0
    assert calc_iss["overcharge"] == 900.0


def test_workflow_csv_batch_multi_line_simulation():
    """7. Batch uploaded through CSV simulation (multiple line items grouped under same invoice)."""
    # 2 rows for CSV-INV-01 (subtotal 8400), 1 row for CSV-INV-02
    invoices = [
        {
            "invoice_id": "CSV-INV-01",
            "vendor_name": "Pinnacle Packaging Ltd",
            "invoice_date": "2026-03-04",
            "subtotal": 8400.0,
            "gst_amount": 1008.0,
            "total": 9408.0,
            "line_items": [
                {
                    "description": "Corrugated Heavy Shipping Boxes",
                    "hsn_code": "4819",
                    "quantity": 40,
                    "unit_price": 150.0,
                    "amount": 6000.0,
                    "gst_rate": 12.0
                },
                {
                    "description": "Protective Air Cushion Rolls",
                    "hsn_code": "3923",
                    "quantity": 16,
                    "unit_price": 150.0,
                    "amount": 2400.0,
                    "gst_rate": 12.0
                }
            ]
        },
        {
            "invoice_id": "CSV-INV-02",
            "vendor_name": "Apex Logistics Solutions",
            "invoice_date": "2026-03-05",
            "subtotal": 5000.0,
            "gst_amount": 900.0,
            "total": 5900.0,
            "line_items": [
                {
                    "description": "Surface Courier Delivery",
                    "hsn_code": "9965",
                    "quantity": 25,
                    "unit_price": 200.0,
                    "amount": 5000.0,
                    "gst_rate": 18.0
                }
            ]
        }
    ]
    payload = {
        "invoices": invoices,
        "custom_rate_card": {
            "Pinnacle Packaging Ltd": {
                "Corrugated Heavy Shipping Boxes": 150.0,
                "Protective Air Cushion Rolls": 150.0
            },
            "Apex Logistics Solutions": {
                "Surface Courier Delivery": 200.0
            }
        },
        "custom_gst_reference": {
            "4819": 12.0,
            "3923": 12.0,
            "9965": 18.0
        },
        "use_default_reference_data": True
    }
    res = client.post("/api/audit", json=payload).json()
    assert res["summary"]["invoices_audited"] == 2
    assert res["summary"]["total_overcharge"] == 0.0
    assert res["clean_invoices_count"] == 2
    assert res["no_issues_detected_count"] == 2


