'use client';

import React from 'react';
import { FlaggedInvoice, Issue } from '@/types/audit';
import { formatCurrency, getIssueTypeBadge, getIssueExplanation } from '@/lib/utils';
import { X, Copy, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col text-slate-800">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold font-mono text-slate-900">
                {invoice.invoice_id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                {invoice.issues.length} {invoice.issues.length === 1 ? 'Anomaly Flagged' : 'Anomalies Flagged'}
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500 font-medium">
              <span>Vendor: <strong className="text-slate-900">{invoice.vendor_name}</strong></span>
              <span>Date: <strong className="text-slate-900 font-mono">{invoice.invoice_date}</strong></span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Invoice Financial Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-mono">
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
              <span className="text-[10px] font-sans font-semibold text-red-700 uppercase block">Total Overcharge</span>
              <span className="font-bold text-red-600 block mt-0.5">{formatCurrency(invoice.total_overcharge)}</span>
            </div>
          </div>

          {/* Recruiter-Friendly Structured Findings Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Audit Findings & Evidence Breakdown
            </h3>

            <div className="space-y-4">
              {invoice.issues.map((issue, idx) => {
                const badge = getIssueTypeBadge(issue.issue_type);
                const explanation = getIssueExplanation(issue);

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                  >
                    {/* Finding Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
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
                            Duplicate of: {issue.duplicate_of}
                          </button>
                        )}
                      </div>

                      <span className="text-xs font-mono font-bold text-red-600">
                        Financial Impact: +{formatCurrency(issue.overcharge)}
                      </span>
                    </div>

                    {/* Section 1: Finding */}
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                        Finding
                      </span>
                      <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                        {explanation}
                      </p>
                    </div>

                    {/* Section 2 & 3 & 4: Structured Data Breakdown Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 font-mono text-xs">
                      {/* What was billed */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                          What was billed
                        </span>
                        {issue.billed_amount !== undefined && (
                          <div className="text-slate-800">
                            Line Amount: <strong className="text-red-600">{formatCurrency(issue.billed_amount)}</strong>
                          </div>
                        )}
                        {issue.invoice_gst_rate !== undefined && (
                          <div className="text-slate-800">
                            GST Charged: <strong className="text-red-600">{issue.invoice_gst_rate}%</strong>
                          </div>
                        )}
                        {issue.taxable_amount !== undefined && (
                          <div className="text-slate-800">
                            Taxable Amount: <strong>{formatCurrency(issue.taxable_amount)}</strong>
                          </div>
                        )}
                        {issue.stated_subtotal !== undefined && (
                          <div className="text-slate-800">
                            Stated Subtotal: <strong className="text-red-600">{formatCurrency(issue.stated_subtotal)}</strong>
                          </div>
                        )}
                        {issue.amount !== undefined && issue.issue_type === 'mystery_surcharge' && (
                          <div className="text-slate-800">
                            Surcharge Billed: <strong className="text-red-600">{formatCurrency(issue.amount)}</strong>
                          </div>
                        )}
                        {issue.issue_type === 'duplicate_invoice' && (
                          <div className="text-slate-800">
                            Total Billed: <strong className="text-red-600">{formatCurrency(issue.overcharge)}</strong>
                          </div>
                        )}
                      </div>

                      {/* What should have been billed */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-sans font-bold text-slate-500 uppercase block">
                          What should have been billed
                        </span>
                        {issue.expected_amount !== undefined && (
                          <div className="text-slate-800">
                            Expected Amount: <strong className="text-[#176B3A]">{formatCurrency(issue.expected_amount)}</strong>
                          </div>
                        )}
                        {issue.expected_gst_rate !== undefined && (
                          <div className="text-slate-800">
                            Expected GST: <strong className="text-[#176B3A]">{issue.expected_gst_rate}%</strong>
                          </div>
                        )}
                        {issue.calculated_subtotal !== undefined && (
                          <div className="text-slate-800">
                            Calculated Subtotal: <strong className="text-[#176B3A]">{formatCurrency(issue.calculated_subtotal)}</strong>
                          </div>
                        )}
                        {issue.issue_type === 'mystery_surcharge' && (
                          <div className="text-slate-800">
                            Contracted Charge: <strong className="text-[#176B3A]">₹0.00 (Uncontracted)</strong>
                          </div>
                        )}
                        {issue.issue_type === 'duplicate_invoice' && (
                          <div className="text-slate-800">
                            Valid Billing: <strong className="text-[#176B3A]">₹0.00 (Duplicate)</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Section 5: Verification / reference */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-600 bg-[#F8FAF6] p-2 rounded-lg border border-slate-200/60">
                      <div>
                        <span className="font-sans text-slate-500 font-medium">Verification Reference: </span>
                        {issue.hsn_code && <span>HSN Code: <strong>{issue.hsn_code}</strong> | </span>}
                        {issue.duplicate_of && <span>Duplicate Of: <strong>{issue.duplicate_of}</strong> | </span>}
                        {issue.quantity !== undefined && <span>Qty: <strong>{issue.quantity}</strong> | </span>}
                        {issue.unit_price !== undefined && <span>Unit Price: <strong>{formatCurrency(issue.unit_price)}</strong></span>}
                      </div>
                      <div className="font-bold text-red-600">
                        Overcharge: {formatCurrency(issue.overcharge)}
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
                Invoice Line Items
              </h3>
              <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] font-bold border-b border-slate-200/80 tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Billed Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {invoice.line_items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">{item.description}</td>
                        <td className="py-2 px-3 text-right">{item.quantity}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Invoice: <strong className="font-mono text-slate-900">{invoice.invoice_id}</strong>
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
