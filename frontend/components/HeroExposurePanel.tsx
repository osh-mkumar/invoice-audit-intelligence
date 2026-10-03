'use client';

import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface HeroExposurePanelProps {
  totalOvercharge: number;
  invoicesAudited: number;
  flaggedCount: number;
}

export default function HeroExposurePanel({
  totalOvercharge,
  invoicesAudited,
  flaggedCount,
}: HeroExposurePanelProps) {
  const percentage = ((flaggedCount / invoicesAudited) * 100).toFixed(1);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Total Verified Overcharge
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-red-700 tracking-tight mt-1 font-mono">
            {formatCurrency(totalOvercharge)}
          </h2>
        </div>

        <div className="md:text-right bg-slate-50 p-3 rounded border border-slate-200 text-xs">
          <span className="font-bold text-slate-900 block">
            {flaggedCount} of {invoicesAudited} invoices require investigation
          </span>
          <span className="text-slate-500 font-medium block mt-0.5">
            {percentage}% of dataset flagged with anomalies
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 border-t border-slate-100 pt-3 leading-relaxed">
        Calculated from 5 audit checks and duplicate detection, independently verified against the source datasets.
      </p>
    </div>
  );
}
