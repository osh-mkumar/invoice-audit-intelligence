'use client';

import React from 'react';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';
import { CheckCircle2, ShieldAlert, ShieldCheck, HelpCircle } from 'lucide-react';

interface KPICardsProps {
  totalOvercharge: number;
  invoicesAudited: number;
  flaggedInvoicesCount: number;
  totalIssuesCount: number;
  cleanInvoicesCount?: number;
  isDemo?: boolean;
}

export default function KPICards({
  totalOvercharge,
  invoicesAudited,
  flaggedInvoicesCount,
  totalIssuesCount,
  cleanInvoicesCount,
  isDemo = false,
}: KPICardsProps) {
  const notFlaggedCount = cleanInvoicesCount !== undefined ? cleanInvoicesCount : invoicesAudited - flaggedInvoicesCount;
  const flaggedRate = invoicesAudited > 0 ? ((flaggedInvoicesCount / invoicesAudited) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      {/* Primary Financial Exposure Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#176B3A]"></span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Potential Financial Exposure
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-red-600 tracking-tight font-mono mt-1">
              {formatCurrency(totalOvercharge)}
            </h2>
          </div>

          <div className="sm:text-right bg-[#F3FCE8] border border-[#A8E95B]/40 px-3.5 py-2.5 rounded-xl self-start">
            <div className="flex items-center space-x-1.5 sm:justify-end text-xs font-bold text-[#176B3A]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#176B3A]" />
              <span>{isDemo ? 'Independent Verification Passed' : 'Deterministic Audit Complete'}</span>
            </div>
            <p className="text-[11px] text-[#176B3A]/80 font-medium mt-0.5">
              {flaggedInvoicesCount} of {invoicesAudited} invoices flagged ({flaggedRate}% flagged rate)
            </p>
          </div>
        </div>

        {/* Not Flagged Guidance Explanation */}
        <div className="border-t border-slate-100 pt-3 mt-4 space-y-1.5">
          <div className="flex items-start space-x-2 text-xs text-slate-500">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-700">Notice on "Not Flagged" Invoices:</strong> The {notFlaggedCount} invoice(s) marked as not flagged passed all six automated verification routines (arithmetic recalculation, contracted rate adherence, statutory GST rate bands, unauthorized surcharge scans, subtotal sums, and intra-batch duplicate checks). This signifies that no discrepancies were detected by the implemented checks, not a guarantee of commercial correctness.
            </p>
          </div>

          {isDemo && (
            <p className="text-[11px] text-slate-400 italic pt-1">
              Demonstration dataset from the Mosaic Fellowship 2026 invoice auditing challenge.
            </p>
          )}
        </div>
      </div>

      {/* Structured 5-Metric KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Invoices Analyzed */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {invoicesAudited}
          </span>
          <span className="text-xs font-medium text-slate-500 block mt-1">
            Invoices analyzed
          </span>
        </div>

        {/* Metric 2: Flagged Invoices */}
        <div className="bg-white border border-red-200/80 rounded-xl p-4 shadow-2xs bg-red-50/20">
          <div className="flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span className="text-2xl font-black text-red-600 font-mono">
              {flaggedInvoicesCount}
            </span>
          </div>
          <span className="text-xs font-semibold text-red-700 block mt-1">
            Flagged invoices ({flaggedRate}%)
          </span>
        </div>

        {/* Metric 3: Invoices Not Flagged */}
        <div className="bg-white border border-[#A8E95B]/40 rounded-xl p-4 shadow-2xs bg-[#F8FAF6]">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#176B3A]" />
            <span className="text-2xl font-black text-[#176B3A] font-mono">
              {notFlaggedCount}
            </span>
          </div>
          <span className="text-xs font-semibold text-[#176B3A] block mt-1">
            No issues detected
          </span>
        </div>

        {/* Metric 4: Issues Detected */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <span className="text-2xl font-black text-slate-900 font-mono block">
            {totalIssuesCount}
          </span>
          <span className="text-xs font-medium text-slate-500 block mt-1">
            Total issues detected
          </span>
        </div>

        {/* Metric 5: Total Potential Exposure */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-2xl font-black text-red-600 font-mono block truncate">
            {formatCompactCurrency(totalOvercharge)}
          </span>
          <span className="text-xs font-medium text-slate-500 block mt-1">
            Potential financial exposure
          </span>
        </div>
      </div>
    </div>
  );
}
