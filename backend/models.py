from datetime import datetime, timezone
from decimal import Decimal
import uuid
from typing import List, Optional, Any, Dict

from sqlalchemy import (
    String,
    Integer,
    Numeric,
    DateTime,
    Text,
    JSON,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


def generate_uuid() -> str:
    """Generate a random UUID4 as a string."""
    return str(uuid.uuid4())


def utc_now() -> datetime:
    """Return timezone-aware current UTC datetime."""
    return datetime.now(timezone.utc)


class AuditRun(Base):
    """
    Persistent record of an audit execution run.
    Stores aggregate metrics and snapshot of reference data used.
    """
    __tablename__ = "audit_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True
    )
    source: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="manual",
        index=True,
        comment="Source of submission: manual, json, csv"
    )
    total_invoices: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    flagged_invoices: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    clean_invoices: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    potential_financial_exposure: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2, asdecimal=True),
        nullable=False,
        default=Decimal("0.00")
    )
    reference_data_snapshot: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Snapshot of vendor rate cards and GST references used during this audit run"
    )

    # Relationships
    invoices: Mapped[List["Invoice"]] = relationship(
        "Invoice",
        back_populates="audit_run",
        cascade="all, delete-orphan",
        order_by="Invoice.invoice_number"
    )
    findings: Mapped[List["AuditFinding"]] = relationship(
        "AuditFinding",
        back_populates="audit_run",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<AuditRun id={self.id} source={self.source} total={self.total_invoices} flagged={self.flagged_invoices}>"


class Invoice(Base):
    """
    Original invoice record associated with an audit run.
    Preserves raw line items and submitted details.
    """
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    audit_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("audit_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    invoice_number: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    invoice_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2, asdecimal=True),
        nullable=False,
        default=Decimal("0.00")
    )
    gst_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2, asdecimal=True),
        nullable=False,
        default=Decimal("0.00")
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2, asdecimal=True),
        nullable=False,
        default=Decimal("0.00")
    )
    payment_terms: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    vendor_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    raw_data: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Complete original invoice structure including line items and metadata"
    )

    # Relationships
    audit_run: Mapped["AuditRun"] = relationship("AuditRun", back_populates="invoices")
    findings: Mapped[List["AuditFinding"]] = relationship(
        "AuditFinding",
        back_populates="invoice",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_invoices_audit_run_inv_no", "audit_run_id", "invoice_number"),
    )

    def __repr__(self) -> str:
        return f"<Invoice id={self.id} number={self.invoice_number} vendor={self.vendor_name} total={self.total}>"


class AuditFinding(Base):
    """
    Individual audit finding/discrepancy detected on an invoice.
    Maintains current human review status and original evidence.
    """
    __tablename__ = "audit_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    audit_run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("audit_runs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    invoice_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    finding_category: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        index=True,
        comment="Finding type, e.g. Rate Card Violation, GST Rate Mismatch, Calculation Error"
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Full evidence payload including expected vs billed, line indices, rates"
    )
    potential_financial_exposure: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2, asdecimal=True),
        nullable=False,
        default=Decimal("0.00")
    )
    review_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="Pending",
        index=True,
        comment="Current review state: Pending, Approved, Confirmed Discrepancy"
    )

    # Relationships
    audit_run: Mapped["AuditRun"] = relationship("AuditRun", back_populates="findings")
    invoice: Mapped["Invoice"] = relationship("Invoice", back_populates="findings")
    reviews: Mapped[List["FindingReview"]] = relationship(
        "FindingReview",
        back_populates="finding",
        cascade="all, delete-orphan",
        order_by="FindingReview.reviewed_at.desc()"
    )

    __table_args__ = (
        Index("ix_findings_audit_run_category", "audit_run_id", "finding_category"),
        Index("ix_findings_review_status", "review_status"),
    )

    def __repr__(self) -> str:
        return f"<AuditFinding id={self.id} category={self.finding_category} exposure={self.potential_financial_exposure} status={self.review_status}>"


class FindingReview(Base):
    """
    Immutable audit trail of human review actions for a finding.
    Tracks every status change, justification note, and timestamp.
    """
    __tablename__ = "finding_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    finding_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("audit_findings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    decision: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="Review action: Pending, Approved, Confirmed Discrepancy"
    )
    review_notes: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Mandatory reviewer rationale/justification for decision"
    )
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True
    )
    previous_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="Pending",
        comment="Status of the finding prior to this review action"
    )

    # Relationships
    finding: Mapped["AuditFinding"] = relationship("AuditFinding", back_populates="reviews")

    def __repr__(self) -> str:
        return f"<FindingReview id={self.id} finding_id={self.finding_id} decision={self.decision} at={self.reviewed_at}>"


class VendorReference(Base):
    """
    Persistent vendor reference rate card table.
    Stores contracted service rates and statutory HSN codes.
    """
    __tablename__ = "vendor_references"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    service_description: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    contracted_unit_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=14, scale=2, asdecimal=True),
        nullable=False
    )
    hsn_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True, index=True)
    source_justification: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Mandatory justification, contract reference, or amendment clause"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint("vendor_name", "service_description", name="uq_vendor_service"),
        Index("ix_vendor_references_vendor_service", "vendor_name", "service_description"),
    )

    def __repr__(self) -> str:
        return f"<VendorReference vendor={self.vendor_name} service={self.service_description} price={self.contracted_unit_price}>"
