import { Issue } from '@/types/audit';

export function formatCurrency(amount?: number | null): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Not available';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount?: number | null): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Not available';
  }
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

export function formatPercentage(rate?: number | null): string {
  if (rate === null || rate === undefined || isNaN(rate)) {
    return 'Not available';
  }
  return `${rate}%`;
}

export function formatNumber(val?: number | null): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '0';
  }
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
      return 'Uncontracted Charges';
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
        label: 'Uncontracted Charge',
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
        label: 'Rate Card Price Inflation',
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
    case 'calculation_error': {
      const billedStr =
        issue.billed_amount !== undefined && issue.billed_amount !== null
          ? formatCurrency(issue.billed_amount)
          : issue.amount !== undefined && issue.amount !== null
          ? formatCurrency(issue.amount)
          : 'Not available';

      const expectedStr =
        issue.expected_amount !== undefined && issue.expected_amount !== null
          ? formatCurrency(issue.expected_amount)
          : issue.quantity !== undefined && issue.unit_price !== undefined
          ? formatCurrency(issue.quantity * issue.unit_price)
          : 'Not available';

      const qtyStr = issue.quantity !== undefined && issue.quantity !== null ? String(issue.quantity) : 'Not available';
      const unitPriceStr = formatCurrency(issue.unit_price);

      return `Line item arithmetic mismatch on "${issue.description || 'line item'}". Stated billed amount is ${billedStr}, but expected amount (quantity ${qtyStr} × unit price ${unitPriceStr}) is ${expectedStr}, causing an overcharge of ${formatCurrency(issue.overcharge)}.`;
    }
    case 'gst_mismatch': {
      const billedGstStr = formatPercentage(issue.invoice_gst_rate);
      const expectedGstStr = formatPercentage(issue.expected_gst_rate);
      const hsnStr = issue.hsn_code || 'Not available';

      return `Tax rate variance for HSN code ${hsnStr} on "${issue.description || 'line item'}". Invoice charged ${billedGstStr} GST, but statutory reference rate is ${expectedGstStr}, resulting in ${formatCurrency(issue.gst_overcharge || issue.overcharge)} potential tax exposure.`;
    }
    case 'mystery_surcharge': {
      const billedStr =
        issue.billed_amount !== undefined && issue.billed_amount !== null
          ? formatCurrency(issue.billed_amount)
          : issue.amount !== undefined && issue.amount !== null
          ? formatCurrency(issue.amount)
          : formatCurrency(issue.overcharge);

      return `Uncontracted charge: Line item "${issue.description || 'unspecified service'}" was billed at ${billedStr}, but is not present in ${issue.vendor_name}'s approved rate card schedule. Flagged for commercial review as potential uncontracted exposure.`;
    }
    case 'subtotal_mismatch': {
      const statedStr = formatCurrency(issue.stated_subtotal);
      const calcStr = formatCurrency(issue.calculated_subtotal);

      return `Subtotal mismatch: Stated invoice subtotal of ${statedStr} exceeds calculated sum of line items (${calcStr}) by ${formatCurrency(issue.overcharge)}.`;
    }
    case 'duplicate_invoice': {
      const dupRef = issue.duplicate_of || 'previous transaction in batch';
      const billedTotal =
        issue.amount !== undefined && issue.amount !== null
          ? formatCurrency(issue.amount)
          : formatCurrency(issue.overcharge);

      return `Duplicate invoice risk: Identical copy of invoice ${dupRef} matching vendor, line items, subtotal, and tax amounts. Full amount of ${billedTotal} flagged as duplicate billing risk.`;
    }
    case 'rate_card_violation': {
      const billedPriceStr = formatCurrency(issue.invoice_unit_price ?? issue.unit_price);
      const contractPriceStr = formatCurrency(issue.contracted_price);

      return `Rate card price inflation on "${issue.description || 'line item'}". Billed unit price of ${billedPriceStr} exceeds contracted price of ${contractPriceStr}, resulting in an overcharge of ${formatCurrency(issue.overcharge)}.`;
    }
    default:
      return `Audit discrepancy identified with financial exposure of ${formatCurrency(issue.overcharge)}.`;
  }
}
