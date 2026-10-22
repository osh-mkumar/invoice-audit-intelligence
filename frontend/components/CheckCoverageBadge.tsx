'use client';

import React from 'react';
import { CheckStatus } from '@/types/audit';
import { CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

interface CheckCoverageBadgeProps {
  completed: CheckStatus[];
  skipped?: CheckStatus[];
}

export default function CheckCoverageBadge({ completed, skipped = [] }: CheckCoverageBadgeProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Audit Check Verification Status
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Coverage breakdown across the six deterministic auditing routines
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded-full bg-[#EAF8D7] text-[#176B3A] font-semibold border border-[#A8E95B]/40">
            {completed.length} Completed
          </span>
          {skipped.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
              {skipped.length} Skipped / Partial
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {completed.map((chk) => (
          <div
            key={chk.check_name}
            className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
              chk.status === 'partial'
                ? 'bg-amber-50/50 border-amber-200/80 text-amber-900'
                : 'bg-[#F8FAF6] border-slate-200/80 text-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-slate-900 text-xs">{chk.display_name}</span>
              {chk.status === 'partial' ? (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-semibold shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>Partial</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-[#EAF8D7] text-[#176B3A] font-semibold shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Completed</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              {chk.message}
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Evaluated: {chk.invoices_evaluated} inv</span>
              <span className={chk.issues_found > 0 ? 'text-red-600 font-bold' : 'text-slate-500'}>
                {chk.issues_found} issue(s)
              </span>
            </div>
          </div>
        ))}

        {skipped.map((chk) => (
          <div
            key={`skipped-${chk.check_name}`}
            className="p-3 rounded-xl border bg-slate-50 border-slate-200/70 text-xs flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-slate-600 text-xs">{chk.display_name}</span>
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-semibold shrink-0">
                <AlertCircle className="w-2.5 h-2.5 text-slate-500" />
                <span>Skipped</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              {chk.message}
            </p>
            <div className="mt-2 pt-1.5 border-t border-slate-200/50 text-[10px] text-slate-400 font-mono">
              <span>Insufficient Reference Data</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
