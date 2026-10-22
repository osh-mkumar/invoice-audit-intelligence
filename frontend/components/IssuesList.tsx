'use client';

import React, { useState, useMemo } from 'react';
import { Issue, FlaggedInvoice } from '@/types/audit';
import { formatCurrency, formatPercentage, getIssueTypeBadge } from '@/lib/utils';
import { Search, Filter, ArrowRight, Copy } from 'lucide-react';

interface IssuesListProps {
  issues: Issue[];
  flaggedInvoices: FlaggedInvoice[];
  onSelectInvoice: (invId: string) => void;
  selectedCategoryFilter: string | null;
  onSelectCategoryFilter: (cat: string | null) => void;
}

export default function IssuesList({
  issues,
  flaggedInvoices,
  onSelectInvoice,
  selectedCategoryFilter,
  onSelectCategoryFilter,
}: IssuesListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { label: 'All Issues', value: null },
    { label: 'Calculation', value: 'calculation_error' },
    { label: 'GST', value: 'gst_mismatch' },
    { label: 'Duplicate', value: 'duplicate_invoice' },
    { label: 'Surcharge', value: 'mystery_surcharge' },
    { label: 'Subtotal', value: 'subtotal_mismatch' },
    { label: 'Rate Card', value: 'rate_card_violation' },
  ];

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (selectedCategoryFilter && issue.issue_type !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = issue.invoice_id.toLowerCase().includes(q);
        const matchVendor = issue.vendor_name.toLowerCase().includes(q);
        const matchDesc = issue.description?.toLowerCase().includes(q) || false;
        if (!matchId && !matchVendor && !matchDesc) return false;
      }
      return true;
    });
  }, [issues, selectedCategoryFilter, searchQuery]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Header & Queue Filter */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Audit Issues Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredIssues.length} individual financial discrepancies flagged for review
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter Queue by ID or Vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#176B3A] transition-colors"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-2.5">
          {categories.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.value;
            return (
              <button
                key={cat.label}
                onClick={() => onSelectCategoryFilter(cat.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#EAF8D7] text-[#176B3A] font-semibold border border-[#A8E95B]/40 shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Audit Queue Grid */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/30 max-h-[75vh] overflow-y-auto custom-scrollbar">
        {filteredIssues.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            No issues found in the audit queue for this filter.
          </div>
        ) : (
          filteredIssues.map((issue, idx) => {
            const badge = getIssueTypeBadge(issue.issue_type);

            return (
              <div
                key={idx}
                onClick={() => onSelectInvoice(issue.invoice_id)}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:border-slate-400 cursor-pointer shadow-2xs hover:bg-[#F3FCE8]/20 transition-all group"
              >
                {/* Issue Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 group-hover:text-[#176B3A]">
                      {issue.vendor_name}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-xs text-slate-900 block">
                      {issue.invoice_id}
                    </span>
                    <span className="text-xs font-extrabold font-mono text-red-600 block mt-0.5">
                      +{formatCurrency(issue.overcharge)}
                    </span>
                  </div>
                </div>

                {/* Structured Q&A Fields: WHAT IS WRONG / BILLED / SHOULD BE / EXPOSURE */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                      What is wrong?
                    </span>
                    <p className="text-slate-800 font-medium leading-tight mt-0.5">
                      {issue.issue_type === 'gst_mismatch' && `GST tax rate discrepancy for HSN code ${issue.hsn_code} on "${issue.description}".`}
                      {issue.issue_type === 'calculation_error' && `Arithmetic calculation error on line item "${issue.description}".`}
                      {issue.issue_type === 'mystery_surcharge' && `Uncontracted surcharge "${issue.description}" billed.`}
                      {issue.issue_type === 'subtotal_mismatch' && `Stated subtotal exceeds line item calculation.`}
                      {issue.issue_type === 'duplicate_invoice' && `Identical duplicate invoice detected (${issue.duplicate_of}).`}
                      {issue.issue_type === 'rate_card_violation' && `Rate card unit price exceeded on "${issue.description}".`}
                    </p>
                  </div>

                  {/* Value Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 font-mono text-[11px]">
                    {/* GST Mismatch specific */}
                    {issue.issue_type === 'gst_mismatch' && (
                      <>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Billed GST</span>
                          <span className="text-red-600 font-bold">{formatPercentage(issue.invoice_gst_rate)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Expected GST</span>
                          <span className="text-emerald-700 font-bold">{formatPercentage(issue.expected_gst_rate)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Taxable Line Amount</span>
                          <span className="text-slate-900">{formatCurrency(issue.taxable_amount ?? issue.billed_amount ?? issue.amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Exposure</span>
                          <span className="text-red-600 font-bold">{formatCurrency(issue.overcharge)}</span>
                        </div>
                      </>
                    )}

                    {/* Calculation Error specific */}
                    {issue.issue_type === 'calculation_error' && (
                      <>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Stated Billed</span>
                          <span className="text-red-600 font-bold">{formatCurrency(issue.billed_amount ?? issue.amount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Expected Amount</span>
                          <span className="text-emerald-700 font-bold">{formatCurrency(issue.expected_amount)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Qty × Unit Price</span>
                          <span className="text-slate-900">
                            {issue.quantity ?? 'N/A'} × {formatCurrency(issue.unit_price)}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Rate Card Violation specific */}
                    {issue.issue_type === 'rate_card_violation' && (
                      <>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Billed Unit Price</span>
                          <span className="text-red-600 font-bold">{formatCurrency(issue.invoice_unit_price ?? issue.unit_price)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Contracted Price</span>
                          <span className="text-emerald-700 font-bold">{formatCurrency(issue.contracted_price)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Contract Variance</span>
                          <span className="text-slate-900">
                            Qty: {issue.quantity ?? 'N/A'} • Overcharge: {formatCurrency(issue.overcharge)}
                          </span>
                        </div>
                      </>
                    )}

                    {/* Mystery Surcharge specific */}
                    {issue.issue_type === 'mystery_surcharge' && (
                      <>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Billed Line Item</span>
                          <span className="text-slate-900 font-sans font-semibold block truncate">{issue.description || 'Unspecified Item'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Contract Status</span>
                          <span className="text-purple-700 font-bold">Uncontracted</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Exposure</span>
                          <span className="text-red-600 font-bold">{formatCurrency(issue.overcharge)}</span>
                        </div>
                      </>
                    )}

                    {/* Subtotal Mismatch specific */}
                    {issue.issue_type === 'subtotal_mismatch' && (
                      <>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Stated Subtotal</span>
                          <span className="text-red-600 font-bold">{formatCurrency(issue.stated_subtotal)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Calculated Sum</span>
                          <span className="text-emerald-700 font-bold">{formatCurrency(issue.calculated_subtotal)}</span>
                        </div>
                      </>
                    )}

                    {/* Duplicate Invoice specific */}
                    {issue.issue_type === 'duplicate_invoice' && (
                      <>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Duplicate Of</span>
                          <span className="text-[#176B3A] font-bold">{issue.duplicate_of || 'Prior Invoice'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-sans">Exposure</span>
                          <span className="text-red-600 font-bold">{formatCurrency(issue.overcharge)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                  <span>Click card to inspect full invoice</span>
                  <span className="font-semibold text-[#176B3A] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    Inspect <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
