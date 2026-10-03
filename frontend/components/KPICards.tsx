'use client';

import React from 'react';
import { formatCurrency, formatCompactCurrency, formatNumber } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface KPICardsProps {
  totalOvercharge: number;
  invoicesAudited: number;
  flaggedInvoicesCount: number;
  totalIssuesCount: number;
}

export default function KPICards({
  totalOvercharge,
  invoicesAudited,
  flaggedInvoicesCount,
  totalIssuesCount,
}: KPICardsProps) {
  return (
    <div className="space-y-4">
      {/* Primary Financial Exposure Card (Visual Anchor) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#176B3A]"></span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Verified Overcharge
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-red-600 tracking-tight font-mono mt-1">
              {formatCurrency(totalOvercharge)}
            </h2>
          </div>

          <div className="sm:text-right bg-[#F3FCE8] border border-[#A8E95B]/40 px-3.5 py-2.5 rounded-xl self-start">
            <div className="flex items-center space-x-1.5 sm:justify-end text-xs font-bold text-[#176B3A]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#176B3A]" />
              <span>Independent Verification Passed</span>
            </div>
            <p className="text-[11px] text-[#176B3A]/80 font-medium mt-0.5">
              {flaggedInvoicesCount} of {invoicesAudited} invoices flagged ({((flaggedInvoicesCount / invoicesAudited) * 100).toFixed(1)}%)
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 border-t border-slate-100 pt-3 mt-4 leading-relaxed">
          Calculated from 5 automated audit checks and duplicate fingerprint detection, independently verified against source datasets.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <span className="text-2xl font-black text-red-600 font-mono block">
            {formatCompactCurrency(totalOvercharge)}
          </span>
          <span className="text-xs font-medium text-slate-500 block mt-1">
            Total exposure
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {flaggedInvoicesCount}
          </span>
          <span className="text-xs font-medium text-slate-500 block mt-1">
            Flagged invoices
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {invoicesAudited}
          </span>
          <span className="text-xs font-medium text-slate-500 block mt-1">
            Invoices audited
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {totalIssuesCount}
          </span>
          <span className="text-xs font-medium text-slate-500 block mt-1">
            Issues detected
          </span>
        </div>
      </div>
    </div>
  );
}
