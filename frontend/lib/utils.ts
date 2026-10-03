import { Issue } from '@/types/audit';

export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0.00';
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 1000000) {
    return `₹${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(2)}K`;
  }
  return formatCurrency(amount);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-IN').format(val);
}

export function formatCategoryName(key: string): string {
  switch (key) {
    case 'calculation_errors':
    case 'calculation_error':
      return 'Calculation Errors';
    case 'rate_card_violations':
    case 'rate_card_violation':
      return 'Rate Card Violations';
    case 'gst_mismatches':
    case 'gst_mismatch':
      return 'GST Mismatches';
    case 'mystery_surcharges':
    case 'mystery_surcharge':
      return 'Mystery Surcharges';
    case 'subtotal_mismatches':
    case 'subtotal_mismatch':
      return 'Subtotal Mismatches';
    case 'duplicate_invoices':
    case 'duplicate_invoice':
      return 'Duplicate Invoices';
    default:
      return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function getIssueTypeBadge(issueType: string) {
  switch (issueType) {
    case 'duplicate_invoice':
    case 'duplicate_invoices':
      return {
        label: 'Duplicate Invoice',
        bg: 'bg-red-50 text-red-700 border-red-200/80',
        dot: 'bg-red-600',
      };
    case 'gst_mismatch':
    case 'gst_mismatches':
      return {
        label: 'GST Mismatch',
        bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dot: 'bg-amber-600',
      };
    case 'calculation_error':
    case 'calculation_errors':
      return {
        label: 'Calculation Error',
        bg: 'bg-orange-50 text-orange-800 border-orange-200/80',
        dot: 'bg-orange-600',
      };
    case 'mystery_surcharge':
    case 'mystery_surcharges':
      return {
        label: 'Mystery Surcharge',
        bg: 'bg-purple-50 text-purple-800 border-purple-200/80',
        dot: 'bg-purple-600',
      };
    case 'subtotal_mismatch':
    case 'subtotal_mismatches':
      return {
        label: 'Subtotal Mismatch',
        bg: 'bg-blue-50 text-blue-800 border-blue-200/80',
        dot: 'bg-blue-600',
      };
    case 'rate_card_violation':
    case 'rate_card_violations':
      return {
        label: 'Rate Card Violation',
        bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
        dot: 'bg-slate-500',
      };
    default:
      return {
        label: issueType,
        bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
        dot: 'bg-slate-500',
      };
  }
}

export function getIssueExplanation(issue: Issue): string {
  switch (issue.issue_type) {
    case 'calculation_error':
      return `Line item arithmetic mismatch on "${issue.description}". Stated billed amount is ${formatCurrency(issue.billed_amount || 0)}, but expected amount (quantity ${issue.quantity} × unit price ${formatCurrency(issue.unit_price || 0)}) is ${formatCurrency(issue.expected_amount || 0)}, causing an overcharge of ${formatCurrency(issue.overcharge)}.`;
    case 'gst_mismatch':
      return `Incorrect tax rate applied for HSN code ${issue.hsn_code} on "${issue.description}". Invoice charged ${issue.invoice_gst_rate}% GST, but statutory reference rate is ${issue.expected_gst_rate}%, resulting in ${formatCurrency(issue.gst_overcharge || issue.overcharge)} excess tax.`;
    case 'mystery_surcharge':
      return `Uncontracted line item "${issue.description}" does not exist in ${issue.vendor_name}'s rate card. Billed amount of ${formatCurrency(issue.amount || issue.overcharge)} is flagged as an unauthorized surcharge.`;
    case 'subtotal_mismatch':
      return `Stated subtotal of ${formatCurrency(issue.stated_subtotal || 0)} exceeds calculated sum of line items (${formatCurrency(issue.calculated_subtotal || 0)}) by ${formatCurrency(issue.overcharge)}.`;
    case 'duplicate_invoice':
      return `Identical duplicate copy of invoice ${issue.duplicate_of} matching vendor, line items, quantities, subtotal, and tax amounts. Full amount of ${formatCurrency(issue.amount || issue.overcharge)} is flagged as duplicate billing risk.`;
    case 'rate_card_violation':
      return `Billed unit price of ${formatCurrency(issue.invoice_unit_price || 0)} for "${issue.description}" exceeds contracted price of ${formatCurrency(issue.contracted_price || 0)}.`;
    default:
      return `Audit discrepancy identified with financial exposure of ${formatCurrency(issue.overcharge)}.`;
  }
}
