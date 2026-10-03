'use client';

import React from 'react';
import { AuditSummary, AuditBreakdown } from '@/types/audit';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';

interface AuditChecksSectionProps {
  summary: AuditSummary;
  breakdown: AuditBreakdown;
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

export default function AuditChecksSection({
  summary,
  breakdown,
  selectedCategory,
  onSelectCategory,
}: AuditChecksSectionProps) {
  const checks = [
    {
      key: 'calculation_error',
      name: 'Calculation Errors',
      desc: 'Checks whether quantity × unit price matches the billed line amount.',
      count: summary.calculation_errors,
      amount: breakdown.calculation_errors,
    },
    {
      key: 'rate_card_violation',
      name: 'Rate Card Violations',
      desc: 'Checks whether vendors charged more than the contracted rate.',
      count: summary.rate_card_violations,
      amount: breakdown.rate_card_violations,
    },
    {
      key: 'gst_mismatch',
      name: 'GST Mismatches',
      desc: 'Checks whether the GST rate matches the expected rate for the HSN code.',
      count: summary.gst_mismatches,
      amount: breakdown.gst_mismatches,
    },
    {
      key: 'mystery_surcharge',
      name: 'Mystery Surcharges',
      desc: 'Identifies charges that are not present in the contracted rate card.',
      count: summary.mystery_surcharges,
      amount: breakdown.mystery_surcharges,
    },
    {
      key: 'subtotal_mismatch',
      name: 'Subtotal Mismatches',
      desc: 'Checks whether the stated invoice subtotal matches the sum of its line items.',
      count: summary.subtotal_mismatches,
      amount: breakdown.subtotal_mismatches,
    },
    {
      key: 'duplicate_invoice',
      name: 'Duplicate Invoices',
      desc: 'Identifies invoices with matching invoice fingerprints that indicate repeated billing.',
      count: summary.duplicate_invoices,
      amount: breakdown.duplicate_invoices,
    },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            6 Automated Audit Checks
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rules engine coverage & category financial findings
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {checks.map((chk) => {
          const isSelected = selectedCategory === chk.key;
          return (
            <div
              key={chk.key}
              onClick={() => onSelectCategory(isSelected ? null : chk.key)}
              className={`p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2 flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#F3FCE8] border-[#A8E95B] shadow-2xs'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-900">
                    {chk.name}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                    {chk.count} {chk.count === 1 ? 'invoice' : 'invoices'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {chk.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Category Exposure:</span>
                <span className="font-mono font-bold text-red-600">
                  {formatCurrency(chk.amount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
