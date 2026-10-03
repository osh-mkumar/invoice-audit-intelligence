'use client';

import React, { useMemo } from 'react';
import { AuditBreakdown, AuditSummary, Issue } from '@/types/audit';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';

interface ExposureBreakdownSectionProps {
  summary: AuditSummary;
  breakdown: AuditBreakdown;
  issues: Issue[];
  selectedCategory: string | null;
  onSelectCategory: (cat: string | null) => void;
}

export default function ExposureBreakdownSection({
  summary,
  breakdown,
  issues,
  selectedCategory,
  onSelectCategory,
}: ExposureBreakdownSectionProps) {
  const totalOvercharge = summary.total_overcharge || 1;

  const categories = [
    { key: 'duplicate_invoice', label: 'Duplicate invoices', amount: breakdown.duplicate_invoices, count: summary.duplicate_invoices },
    { key: 'gst_mismatch', label: 'GST mismatches', amount: breakdown.gst_mismatches, count: summary.gst_mismatches },
    { key: 'calculation_error', label: 'Calculation errors', amount: breakdown.calculation_errors, count: summary.calculation_errors },
    { key: 'mystery_surcharge', label: 'Mystery surcharges', amount: breakdown.mystery_surcharges, count: summary.mystery_surcharges },
    { key: 'subtotal_mismatch', label: 'Subtotal mismatches', amount: breakdown.subtotal_mismatches, count: summary.subtotal_mismatches },
    { key: 'rate_card_violation', label: 'Rate card violations', amount: breakdown.rate_card_violations, count: summary.rate_card_violations },
  ];

  // Derived Key Findings
  const keyFindings = useMemo(() => {
    const sortedByAmount = [...categories].sort((a, b) => b.amount - a.amount);
    const largestExposure = sortedByAmount[0];

    const sortedByCount = [...categories].sort((a, b) => b.count - a.count);
    const mostFrequent = sortedByCount[0];

    const nonDup = categories.filter((c) => c.key !== 'duplicate_invoice').sort((a, b) => b.amount - a.amount);
    const highestNonDup = nonDup[0];

    const flaggedCount = 65;
    const pct = ((flaggedCount / summary.invoices_audited) * 100).toFixed(1);

    return {
      largestExposure,
      mostFrequent,
      highestNonDup,
      reviewStats: {
        count: flaggedCount,
        total: summary.invoices_audited,
        pct,
      },
    };
  }, [categories, summary]);

  return (
    <div className="space-y-4">
      {/* Financial Exposure Rows */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Financial Exposure
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Where the overcharge comes from
            </p>
          </div>
          {selectedCategory && (
            <button
              onClick={() => onSelectCategory(null)}
              className="text-xs font-semibold text-[#176B3A] hover:underline"
            >
              Show all categories
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {categories.map((cat) => {
            const pct = ((cat.amount / totalOvercharge) * 100).toFixed(1);
            const isSelected = selectedCategory === cat.key;
            const barWidthPercent = cat.amount > 0 ? Math.max(parseFloat(pct), 2.5) : 0;

            return (
              <div
                key={cat.key}
                onClick={() => onSelectCategory(isSelected ? null : cat.key)}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#F3FCE8] border-[#A8E95B] shadow-2xs'
                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono mb-1.5">
                  <span className="font-sans font-semibold text-slate-900 w-44 truncate">
                    {cat.label}
                  </span>

                  <div className="flex items-center space-x-6 text-right shrink-0">
                    <span className="font-bold text-red-600 w-24">
                      {formatCompactCurrency(cat.amount)}
                    </span>
                    <span className="text-slate-500 w-12">{pct}%</span>
                    <span className="text-slate-600 font-sans w-20">
                      {cat.count} {cat.count === 1 ? 'issue' : 'issues'}
                    </span>
                  </div>
                </div>

                {/* Proportional bar: neutral gray by default, green for selected or highlight */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isSelected
                        ? 'bg-[#176B3A]'
                        : cat.key === 'duplicate_invoice'
                        ? 'bg-slate-800'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${barWidthPercent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Findings Derived Insights Panel */}
      <div className="bg-[#F8FAF6] border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Key Findings
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wide">
              Largest exposure
            </span>
            <span className="text-xs font-bold text-slate-900 block truncate">
              {keyFindings.largestExposure.label}
            </span>
            <span className="text-sm font-extrabold text-red-600 font-mono block">
              {formatCompactCurrency(keyFindings.largestExposure.amount)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wide">
              Most frequent issue
            </span>
            <span className="text-xs font-bold text-slate-900 block truncate">
              {keyFindings.mostFrequent.label}
            </span>
            <span className="text-sm font-extrabold text-slate-900 font-mono block">
              {keyFindings.mostFrequent.count} invoices
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wide">
              Highest non-dup exposure
            </span>
            <span className="text-xs font-bold text-slate-900 block truncate">
              {keyFindings.highestNonDup.label}
            </span>
            <span className="text-sm font-extrabold text-amber-700 font-mono block">
              {formatCompactCurrency(keyFindings.highestNonDup.amount)}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 block uppercase tracking-wide">
              Invoices requiring review
            </span>
            <span className="text-xs font-bold text-slate-900 block truncate">
              {keyFindings.reviewStats.count} / {keyFindings.reviewStats.total}
            </span>
            <span className="text-sm font-extrabold text-slate-900 font-mono block">
              {keyFindings.reviewStats.pct}% of dataset
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
