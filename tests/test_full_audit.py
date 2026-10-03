import sys
import pytest
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from audit.loader import load_all_data
from audit.engine import run_audit


def test_full_audit_dataset_regression():
    invoices, rate_card, gst_reference = load_all_data()

    results = run_audit(invoices, rate_card, gst_reference)
    summary = results["summary"]
    breakdown = results["breakdown"]

    # Invoices Audited
    assert summary["invoices_audited"] == 508

    # Category Issue Counts
    assert summary["calculation_errors"] == 23
    assert summary["rate_card_violations"] == 0
    assert summary["gst_mismatches"] == 15
    assert summary["mystery_surcharges"] == 12
    assert summary["subtotal_mismatches"] == 7
    assert summary["duplicate_invoices"] == 8

    # Category Overcharge Amounts
    assert breakdown["calculation_errors"] == pytest.approx(61181.58, abs=0.01)
    assert breakdown["rate_card_violations"] == pytest.approx(0.00, abs=0.01)
    assert breakdown["gst_mismatches"] == pytest.approx(1200082.26, abs=0.01)
    assert breakdown["mystery_surcharges"] == pytest.approx(24613.97, abs=0.01)
    assert breakdown["subtotal_mismatches"] == pytest.approx(18186.35, abs=0.01)
    assert breakdown["duplicate_invoices"] == pytest.approx(16256034.78, abs=0.01)

    # Total Overcharge
    assert summary["total_overcharge"] == pytest.approx(17560098.94, abs=0.01)

    # Overlap Analysis
    assert results["overlap_analysis"]["invoices_with_multiple_issue_types"] == 0
