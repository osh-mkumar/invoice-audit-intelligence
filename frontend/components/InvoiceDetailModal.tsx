'use client';

import React from 'react';
import { FlaggedInvoice, Issue } from '@/types/audit';
import { formatCurrency, formatPercentage, getIssueTypeBadge, getIssueExplanation } from '@/lib/utils';
import { X, Copy, ShieldAlert, CheckCircle2, HelpCircle } from 'lucide-react';

interface InvoiceDetailModalProps {
  invoice: FlaggedInvoice | null;
  onClose: () => void;
  onSelectInvoice: (invId: string) => void;
}

export default function InvoiceDetailModal({
  invoice,
  onClose,
  onSelectInvoice,
}: InvoiceDetailModalProps) {
  if (!invoice) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-lg font-bold font-mono text-slate-900">
                {invoice.invoice_id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                {invoice.issues.length} {invoice.issues.length === 1 ? 'Anomaly Detected' : 'Anomalies Detected'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 font-medium">
              <span>Vendor: <strong className="text-slate-900">{invoice.vendor_name}</strong></span>
              <span>Date: <strong className="text-slate-900 font-mono">{invoice.invoice_date || 'Not available'}</strong></span>
              {invoice.payment_terms && <span>Terms: <strong className="text-slate-900 font-mono">{invoice.payment_terms}</strong></span>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Invoice Financial Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-mono">
            <div>
              <span className="text-[10px] font-sans font-semibold text-slate-500 uppercase block">Subtotal</span>
              <span className="font-semibold text-slate-900 block mt-0.5">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans font-semibold text-slate-500 uppercase block">GST Amount</span>
              <span className="font-semibold text-slate-900 block mt-0.5">{formatCurrency(invoice.gst_amount)}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans font-semibold text-slate-500 uppercase block">Total Billed</span>
              <span className="font-semibold text-slate-900 block mt-0.5">{formatCurrency(invoice.total)}</span>
            </div>
            <div>
              <span className="text-[10px] font-sans font-semibold text-red-700 uppercase block">Total Discrepancy</span>
              <span className="font-bold text-red-600 block mt-0.5">{formatCurrency(invoice.total_overcharge)}</span>
            </div>
          </div>

          {/* Audit Findings & Evidence Breakdown Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Audit Findings & Discrepancy Evidence
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {invoice.issues.length} issue(s) evaluated
              </span>
            </div>

            <div className="space-y-4">
              {invoice.issues.map((issue, idx) => {
                const badge = getIssueTypeBadge(issue.issue_type);
                const explanation = getIssueExplanation(issue);

                // Fallback to match invoice line item if missing on issue
                const lineItem =
                  issue.line_index !== undefined && invoice.line_items && invoice.line_items[issue.line_index]
                    ? invoice.line_items[issue.line_index]
                    : invoice.line_items?.find((it) => it.description === issue.description);

                const billedLineAmount = issue.billed_amount ?? issue.amount ?? lineItem?.amount;
                const quantity = issue.quantity ?? lineItem?.quantity;
                const unitPrice = issue.unit_price ?? issue.invoice_unit_price ?? lineItem?.unit_price;
                const gstRate = issue.invoice_gst_rate ?? lineItem?.gst_rate;
                const hsnCode = issue.hsn_code ?? lineItem?.hsn_code;
                const statedSubtotal = issue.stated_subtotal ?? invoice.subtotal;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                  >
                    {/* Finding Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {issue.duplicate_of && (
                          <button
                            onClick={() => onSelectInvoice(issue.duplicate_of!)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF8D7] text-[#176B3A] border border-[#A8E95B]/40 hover:bg-[#EAF8D7]/80 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Duplicate of: {issue.duplicate_of}</span>
                          </button>
                        )}
                      </div>

                      <span className="text-xs font-mono font-bold text-red-600">
                        Exposure: +{formatCurrency(issue.overcharge)}
                      </span>
                    </div>

                    {/* Section 1: Finding Explanation */}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Finding Description
                      </span>
                      <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                        {explanation}
                      </p>
                    </div>

                    {/* Section 2: Structured Evidence Grid (Billed vs Expected) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 font-mono text-xs">
                      {/* What was billed on the invoice */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                          Actual Values Billed
                        </span>

                        {issue.issue_type === 'subtotal_mismatch' ? (
                          <div className="text-slate-800">
                            Stated Subtotal: <strong className="text-red-600">{formatCurrency(statedSubtotal)}</strong>
                          </div>
                        ) : issue.issue_type === 'duplicate_invoice' ? (
                          <>
                            <div className="text-slate-800">
                              Duplicate Total: <strong className="text-red-600">{formatCurrency(invoice.total)}</strong>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Matched Vendor: {invoice.vendor_name}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-slate-800">
                              Line Amount: <strong className="text-red-600">{formatCurrency(billedLineAmount)}</strong>
                            </div>
                            <div className="text-slate-800">
                              Quantity × Price:{' '}
                              <strong>
                                {quantity !== undefined && quantity !== null ? quantity : 'Not available'} ×{' '}
                                {formatCurrency(unitPrice)}
                              </strong>
                            </div>
                            <div className="text-slate-800">
                              GST Rate Charged:{' '}
                              <strong className={issue.issue_type === 'gst_mismatch' ? 'text-red-600' : 'text-slate-900'}>
                                {formatPercentage(gstRate)}
                              </strong>
                            </div>
                            {hsnCode && (
                              <div className="text-[11px] text-slate-500">
                                HSN Code: {hsnCode}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* What should have been billed according to rules/references */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                          Expected / Reference Standard
                        </span>

                        {issue.issue_type === 'calculation_error' && (
                          <>
                            <div className="text-slate-800">
                              Expected Line Amount:{' '}
                              <strong className="text-[#176B3A]">
                                {formatCurrency(issue.expected_amount ?? (quantity && unitPrice ? quantity * unitPrice : null))}
                              </strong>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Formula: quantity ({quantity ?? 'N/A'}) × unit price ({formatCurrency(unitPrice)})
                            </div>
                          </>
                        )}

                        {issue.issue_type === 'rate_card_violation' && (
                          <>
                            <div className="text-slate-800">
                              Contracted Unit Price:{' '}
                              <strong className="text-[#176B3A]">{formatCurrency(issue.contracted_price)}</strong>
                            </div>
                            <div className="text-slate-800">
                              Expected Line Amount:{' '}
                              <strong className="text-[#176B3A]">
                                {formatCurrency(issue.expected_amount ?? (quantity && issue.contracted_price ? quantity * issue.contracted_price : null))}
                              </strong>
                            </div>
                          </>
                        )}

                        {issue.issue_type === 'gst_mismatch' && (
                          <>
                            <div className="text-slate-800">
                              Statutory GST Rate:{' '}
                              <strong className="text-[#176B3A]">{formatPercentage(issue.expected_gst_rate)}</strong>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Statutory schedule rate for HSN {hsnCode || 'reference'}
                            </div>
                          </>
                        )}

                        {issue.issue_type === 'mystery_surcharge' && (
                          <>
                            <div className="text-slate-800">
                              Contract Catalog:{' '}
                              <strong className="text-purple-700">Uncontracted Service</strong>
                            </div>
                            <div className="text-[11px] text-slate-500 leading-tight">
                              Item missing from {invoice.vendor_name}&apos;s contracted schedule. Flagged for commercial review.
                            </div>
                          </>
                        )}

                        {issue.issue_type === 'subtotal_mismatch' && (
                          <>
                            <div className="text-slate-800">
                              Calculated Sum of Lines:{' '}
                              <strong className="text-[#176B3A]">{formatCurrency(issue.calculated_subtotal)}</strong>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Reconciled sum of all line item billed amounts
                            </div>
                          </>
                        )}

                        {issue.issue_type === 'duplicate_invoice' && (
                          <>
                            <div className="text-slate-800">
                              Billable Status:{' '}
                              <strong className="text-[#176B3A]">₹0.00 (Duplicate)</strong>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Previous invoice: {issue.duplicate_of}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Section 3: Verification Reference Footer */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-600 bg-[#F8FAF6] px-3 py-2 rounded-lg border border-slate-200/60">
                      <div className="space-x-3">
                        {hsnCode && <span>HSN: <strong>{hsnCode}</strong></span>}
                        {quantity !== undefined && quantity !== null && <span>Qty: <strong>{quantity}</strong></span>}
                        {unitPrice !== undefined && unitPrice !== null && <span>Unit Price: <strong>{formatCurrency(unitPrice)}</strong></span>}
                        {issue.contracted_price !== undefined && issue.contracted_price !== null && (
                          <span>Contracted: <strong>{formatCurrency(issue.contracted_price)}</strong></span>
                        )}
                      </div>
                      <div className="font-bold text-red-600">
                        Discrepancy: +{formatCurrency(issue.overcharge)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Line Items Table */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Invoice Line Items ({invoice.line_items.length})
              </h3>
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold border-b border-slate-200/80 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">HSN</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">GST %</th>
                      <th className="py-2.5 px-3 text-right">Billed Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {invoice.line_items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{item.description}</td>
                        <td className="py-2.5 px-3 text-slate-500">{item.hsn_code || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-right">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatPercentage(item.gst_rate)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Inspecting Invoice: <strong className="font-mono text-slate-900">{invoice.invoice_id}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#176B3A] text-white font-semibold hover:bg-[#12542d] transition-colors shadow-2xs"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
}
