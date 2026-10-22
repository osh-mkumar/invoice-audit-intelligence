import os
from decimal import Decimal
from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from alembic.config import Config
from alembic import command

from backend.database import Base
from backend.models import (
    AuditRun,
    Invoice,
    AuditFinding,
    FindingReview,
    VendorReference,
)


@pytest.fixture(scope="function")
def db_session():
    """Provides an isolated in-memory SQLite database session for unit tests."""
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        future=True,
    )
    Base.metadata.create_all(bind=test_engine)
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=test_engine, future=True
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
        Base.metadata.drop_all(bind=test_engine)


def test_audit_run_and_invoice_persistence(db_session):
    """Test saving AuditRun and associated Invoice with exact Decimal precision."""
    run = AuditRun(
        source="json",
        total_invoices=2,
        flagged_invoices=1,
        clean_invoices=1,
        potential_financial_exposure=Decimal("17560098.94"),
        reference_data_snapshot={
            "rate_cards": {"Apex Solutions": {"Consulting": 1500.0}},
            "gst_rates": {"998311": 18.0},
        },
    )
    db_session.add(run)
    db_session.commit()

    inv1 = Invoice(
        audit_run_id=run.id,
        invoice_number="INV-2026-001",
        vendor_name="Apex Solutions",
        invoice_date="2026-01-15",
        subtotal=Decimal("15000.00"),
        gst_amount=Decimal("2700.00"),
        total=Decimal("17700.00"),
        payment_terms="Net 30",
        vendor_type="Services",
        raw_data={"line_items": [{"description": "Consulting", "quantity": 10, "unit_price": 1500.0}]},
    )
    db_session.add(inv1)
    db_session.commit()

    # Query back and verify
    saved_run = db_session.get(AuditRun, run.id)
    assert saved_run is not None
    assert saved_run.source == "json"
    assert saved_run.total_invoices == 2
    assert saved_run.flagged_invoices == 1
    assert saved_run.potential_financial_exposure == Decimal("17560098.94")
    assert saved_run.reference_data_snapshot["gst_rates"]["998311"] == 18.0

    assert len(saved_run.invoices) == 1
    saved_inv = saved_run.invoices[0]
    assert saved_inv.invoice_number == "INV-2026-001"
    assert saved_inv.subtotal == Decimal("15000.00")
    assert saved_inv.gst_amount == Decimal("2700.00")
    assert saved_inv.total == Decimal("17700.00")
    assert saved_inv.raw_data["line_items"][0]["description"] == "Consulting"


def test_audit_finding_and_human_review_trail(db_session):
    """Test saving finding and tracking multiple human review decisions with notes."""
    run = AuditRun(
        source="manual",
        total_invoices=1,
        flagged_invoices=1,
        clean_invoices=0,
        potential_financial_exposure=Decimal("250.75"),
    )
    db_session.add(run)
    db_session.commit()

    inv = Invoice(
        audit_run_id=run.id,
        invoice_number="INV-ERR-99",
        vendor_name="Quality Paper Co",
        invoice_date="2026-02-01",
        subtotal=Decimal("1000.00"),
        gst_amount=Decimal("180.00"),
        total=Decimal("1180.00"),
        raw_data={"line_items": [{"description": "Paper", "amount": 1000.0}]},
    )
    db_session.add(inv)
    db_session.commit()

    finding = AuditFinding(
        audit_run_id=run.id,
        invoice_id=inv.id,
        finding_category="Rate Card Violation",
        description="Contracted unit price is ₹20.00 but billed at ₹25.00.",
        evidence={
            "item": "Paper",
            "billed_rate": 25.0,
            "contracted_rate": 20.0,
            "overcharge": 250.75,
        },
        potential_financial_exposure=Decimal("250.75"),
        review_status="Pending",
    )
    db_session.add(finding)
    db_session.commit()

    # Initial state
    assert finding.review_status == "Pending"
    assert len(finding.reviews) == 0

    # Human review action 1: Confirm Discrepancy
    review1 = FindingReview(
        finding_id=finding.id,
        decision="Confirmed Discrepancy",
        review_notes="Verified against signed 2025 MSA annexure; overcharge confirmed.",
        previous_status="Pending",
    )
    finding.review_status = "Confirmed Discrepancy"
    db_session.add(review1)
    db_session.commit()

    # Human review action 2: Status update to Approved (after credit note discussion)
    review2 = FindingReview(
        finding_id=finding.id,
        decision="Approved",
        review_notes="Vendor provided valid rush delivery amendment justifying price.",
        previous_status="Confirmed Discrepancy",
    )
    finding.review_status = "Approved"
    db_session.add(review2)
    db_session.commit()

    # Query back and verify review history retention
    saved_finding = db_session.get(AuditFinding, finding.id)
    assert saved_finding.review_status == "Approved"
    assert len(saved_finding.reviews) == 2
    # Verify both historical decisions exist and preserve notes
    decisions = [r.decision for r in saved_finding.reviews]
    assert "Confirmed Discrepancy" in decisions
    assert "Approved" in decisions


def test_vendor_reference_persistence_and_uniqueness(db_session):
    """Test vendor rate card reference persistence and unique constraint on vendor + service."""
    ref1 = VendorReference(
        vendor_name="Ashok Packaging Pvt Ltd",
        service_description="Corrugated Boxes 10x10",
        contracted_unit_price=Decimal("18.50"),
        hsn_code="481910",
        source_justification="Master Service Agreement Schedule B 2025-2027",
    )
    db_session.add(ref1)
    db_session.commit()

    saved_ref = db_session.get(VendorReference, ref1.id)
    assert saved_ref is not None
    assert saved_ref.contracted_unit_price == Decimal("18.50")
    assert saved_ref.hsn_code == "481910"

    # Attempt duplicate insert with same vendor and service description
    dup_ref = VendorReference(
        vendor_name="Ashok Packaging Pvt Ltd",
        service_description="Corrugated Boxes 10x10",
        contracted_unit_price=Decimal("22.00"),
        source_justification="Attempted duplicate",
    )
    db_session.add(dup_ref)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_cascade_delete_integrity(db_session):
    """Ensure deleting an AuditRun cascades cleanly to invoices, findings, and reviews."""
    run = AuditRun(
        source="csv",
        total_invoices=1,
        flagged_invoices=1,
        potential_financial_exposure=Decimal("50.00"),
    )
    db_session.add(run)
    db_session.commit()

    inv = Invoice(
        audit_run_id=run.id,
        invoice_number="INV-CASCADE-1",
        vendor_name="Test Vendor",
        subtotal=Decimal("100.00"),
        total=Decimal("100.00"),
    )
    db_session.add(inv)
    db_session.commit()

    finding = AuditFinding(
        audit_run_id=run.id,
        invoice_id=inv.id,
        finding_category="Calculation Error",
        potential_financial_exposure=Decimal("50.00"),
    )
    db_session.add(finding)
    db_session.commit()

    review = FindingReview(
        finding_id=finding.id,
        decision="Approved",
        review_notes="Test cascade",
        previous_status="Pending",
    )
    db_session.add(review)
    db_session.commit()

    # Now delete the AuditRun
    db_session.delete(run)
    db_session.commit()

    # Assert children are cleaned up
    assert db_session.get(AuditRun, run.id) is None
    assert db_session.get(Invoice, inv.id) is None
    assert db_session.get(AuditFinding, finding.id) is None
    assert db_session.get(FindingReview, review.id) is None


def test_alembic_migrations_execute_head():
    """Verify Alembic migration can run up to head on an isolated database."""
    test_db_path = "./tests_alembic_run.db"
    if os.path.exists(test_db_path):
        os.remove(test_db_path)

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", f"sqlite:///{test_db_path}")

    try:
        command.upgrade(alembic_cfg, "head")
        command.downgrade(alembic_cfg, "base")
        command.upgrade(alembic_cfg, "head")
    finally:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
