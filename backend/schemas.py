from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator


class LineItemInput(BaseModel):
    description: str = Field(..., min_length=1, description="Item or service description")
    quantity: float = Field(..., gt=0, description="Quantity billed (must be > 0)")
    unit_price: float = Field(..., ge=0, description="Unit price (must be >= 0)")
    amount: float = Field(..., ge=0, description="Billed line amount")
    gst_rate: Optional[float] = Field(None, ge=0, le=100, description="GST rate percentage (e.g. 18.0)")
    hsn_code: Optional[str] = Field(None, description="HSN/SAC code")


class InvoiceInput(BaseModel):
    invoice_id: str = Field(..., min_length=1, description="Unique invoice identifier/number")
    vendor_name: str = Field(..., min_length=1, description="Vendor or supplier name")
    invoice_date: Optional[str] = Field(None, description="Invoice date (YYYY-MM-DD or standard format)")
    subtotal: float = Field(..., ge=0, description="Billed subtotal amount before tax")
    gst_amount: Optional[float] = Field(0.0, ge=0, description="Billed GST tax amount")
    total: float = Field(..., ge=0, description="Billed grand total")
    payment_terms: Optional[str] = Field(None, description="Payment terms, e.g. Net 30")
    vendor_type: Optional[str] = Field(None, description="Vendor category/type")
    line_items: List[LineItemInput] = Field(..., min_length=1, description="List of line items")

    @field_validator("line_items")
    def validate_line_items(cls, v):
        if not v:
            raise ValueError("Invoice must contain at least one line item.")
        return v


class AuditRequest(BaseModel):
    invoices: List[InvoiceInput] = Field(..., min_length=1, description="List of invoices to audit")
    custom_rate_card: Optional[Dict[str, Dict[str, float]]] = Field(
        default_factory=dict,
        description="Optional custom rate cards mapping vendor_name -> {description: unit_price}"
    )
    custom_gst_reference: Optional[Dict[str, float]] = Field(
        default_factory=dict,
        description="Optional custom GST rate references mapping hsn_code -> gst_rate"
    )
    use_default_reference_data: bool = Field(
        default=True,
        description="Whether to merge with existing repository rate cards and GST references"
    )


class CheckStatus(BaseModel):
    check_name: str
    display_name: str
    status: str = Field(..., description="'completed', 'skipped', or 'partial'")
    message: str
    invoices_evaluated: int
    issues_found: int


class IssueOutput(BaseModel):
    invoice_id: str
    vendor_name: str
    issue_type: str
    overcharge: float
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    billed_amount: Optional[float] = None
    expected_amount: Optional[float] = None
    contracted_price: Optional[float] = None
    invoice_unit_price: Optional[float] = None
    hsn_code: Optional[str] = None
    taxable_amount: Optional[float] = None
    invoice_gst_rate: Optional[float] = None
    expected_gst_rate: Optional[float] = None
    gst_overcharge: Optional[float] = None
    stated_subtotal: Optional[float] = None
    calculated_subtotal: Optional[float] = None
    duplicate_of: Optional[str] = None
    amount: Optional[float] = None
    line_index: Optional[int] = None
    invoice_date: Optional[str] = None
    invoice_total: Optional[float] = None


class FlaggedInvoiceOutput(BaseModel):
    invoice_id: str
    vendor_name: str
    vendor_type: Optional[str] = ""
    invoice_date: Optional[str] = ""
    subtotal: float
    gst_amount: float
    total: float
    payment_terms: Optional[str] = ""
    line_items: List[Dict[str, Any]]
    issues: List[IssueOutput]
    total_overcharge: float


class AuditSummaryOutput(BaseModel):
    invoices_audited: int
    calculation_errors: int
    rate_card_violations: int
    gst_mismatches: int
    mystery_surcharges: int
    subtotal_mismatches: int
    duplicate_invoices: int
    total_overcharge: float


class AuditBreakdownOutput(BaseModel):
    calculation_errors: float
    rate_card_violations: float
    gst_mismatches: float
    mystery_surcharges: float
    subtotal_mismatches: float
    duplicate_invoices: float


class ExposureDistinction(BaseModel):
    confirmed_recoverable_overcharges: float = Field(
        ...,
        description="Calculation errors, rate card violations, subtotal mismatches, duplicate invoices"
    )
    potential_financial_exposure: float = Field(
        ...,
        description="GST mismatches (statutory tax variance) and mystery surcharges (uncontracted items)"
    )
    total_overcharge: float


class OverlapAnalysisOutput(BaseModel):
    invoices_with_multiple_issue_types: int
    examples: List[Dict[str, Any]] = Field(default_factory=list)


class AuditResponse(BaseModel):
    summary: AuditSummaryOutput
    breakdown: AuditBreakdownOutput
    issues: List[IssueOutput]
    flagged_invoices: List[FlaggedInvoiceOutput]
    overlap_analysis: OverlapAnalysisOutput
    checks_completed: List[CheckStatus]
    checks_skipped: List[CheckStatus]
    exposure_distinction: ExposureDistinction
    clean_invoices_count: int
    flagged_invoices_count: int
