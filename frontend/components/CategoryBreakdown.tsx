'use client';

import React from 'react';
import { AuditBreakdown, AuditSummary } from '@/types/audit';
import { formatCurrency, formatCategoryName, getIssueTypeBadge } from '@/lib/utils';

interface CategoryBreakdownProps {
  summary: AuditSummary;
  breakdown: AuditBreakdown;
  selectedCategory: string | null;
  onSelectCategory: (categoryKey: string | null) => void;
}

export default function CategoryBreakdown({
  summary,
  breakdown,
  selectedCategory,
  onSelectCategory,
}: CategoryBreakdownProps) {
  const totalOvercharge = summary.total_overcharge || 1;

  const categories = [
    { key: 'duplicate_invoices', count: summary.duplicate_invoices, amount: breakdown.duplicate_invoices },
    { key: 'gst_mismatches', count: summary.gst_mismatches, amount: breakdown.gst_mismatches },
    { key: 'calculation_errors', count: summary.calculation_errors, amount: breakdown.calculation_errors },
    { key: 'mystery_surcharges', count: summary.mystery_surcharges, amount: breakdown.mystery_surcharges },
    { key: 'subtotal_mismatches', count: summary.subtotal_mismatches, amount: breakdown.subtotal_mismatches },
    { key: 'rate_card_violations', count: summary.rate_card_violations, amount: breakdown.rate_card_violations },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Issue Category Breakdown
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Detailed distribution of identified financial risks & overcharges
          </p>
        </div>
        {selectedCategory && (
          <button
            onClick={() => onSelectCategory(null)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
          >
            Clear Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((cat) => {
          const badge = getIssueTypeBadge(cat.key.replace(/s$/, ''));
          const pct = ((cat.amount / totalOvercharge) * 100).toFixed(1);
          const isSelected = selectedCategory === cat.key.replace(/s$/, '');

          return (
            <div
              key={cat.key}
              onClick={() => onSelectCategory(isSelected ? null : cat.key.replace(/s$/, ''))}
              className={`p-4 rounded border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'bg-slate-50 border-slate-900 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                  {formatCategoryName(cat.key)}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {cat.count} {cat.count === 1 ? 'issue' : 'issues'}
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-slate-900 tracking-tight font-mono">
                    {formatCurrency(cat.amount)}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {pct}%
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-slate-800 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(parseFloat(pct), cat.amount > 0 ? 3 : 0)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
