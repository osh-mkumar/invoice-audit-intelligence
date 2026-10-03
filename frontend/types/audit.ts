export interface Issue {
  invoice_id: string;
  vendor_name: string;
  issue_type: 'calculation_error' | 'rate_card_violation' | 'gst_mismatch' | 'mystery_surcharge' | 'subtotal_mismatch' | 'duplicate_invoice' | string;
  description?: string;
  quantity?: number;
  unit_price?: number;
  billed_amount?: number;
  expected_amount?: number;
  contracted_price?: number;
  invoice_unit_price?: number;
  hsn_code?: string;
  taxable_amount?: number;
  invoice_gst_rate?: number;
  expected_gst_rate?: number;
  gst_overcharge?: number;
  stated_subtotal?: number;
  calculated_subtotal?: number;
  duplicate_of?: string;
  amount?: number;
  overcharge: number;
  line_index?: number;
  invoice_date?: string;
  invoice_total?: number;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  gst_rate?: number;
  hsn_code?: string;
}

export interface FlaggedInvoice {
  invoice_id: string;
  vendor_name: string;
  vendor_type?: string;
  invoice_date: string;
  subtotal: number;
  gst_amount: number;
  total: number;
  payment_terms?: string;
  line_items?: LineItem[];
  issues: Issue[];
  total_overcharge: number;
}

export interface AuditSummary {
  invoices_audited: number;
  calculation_errors: number;
  rate_card_violations: number;
  gst_mismatches: number;
  mystery_surcharges: number;
  subtotal_mismatches: number;
  duplicate_invoices: number;
  total_overcharge: number;
}

export interface AuditBreakdown {
  calculation_errors: number;
  rate_card_violations: number;
  gst_mismatches: number;
  mystery_surcharges: number;
  subtotal_mismatches: number;
  duplicate_invoices: number;
}

export interface AuditResults {
  summary: AuditSummary;
  breakdown: AuditBreakdown;
  issues: Issue[];
  flagged_invoices: FlaggedInvoice[];
  overlap_analysis?: {
    invoices_with_multiple_issue_types: number;
    examples: any[];
  };
}
