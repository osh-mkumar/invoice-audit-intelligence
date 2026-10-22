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
