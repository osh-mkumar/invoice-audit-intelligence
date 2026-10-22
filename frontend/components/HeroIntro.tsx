'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { formatCompactCurrency } from '@/lib/utils';

interface HeroIntroProps {
  onExploreClick: () => void;
  invoicesAudited?: number;
  flaggedCount?: number;
  totalOvercharge?: number;
  isDemo?: boolean;
}

export default function HeroIntro({
  onExploreClick,
  invoicesAudited = 508,
  flaggedCount = 65,
  totalOvercharge = 17560098.94,
  isDemo = true,
}: HeroIntroProps) {
  const flaggedRate = invoicesAudited > 0 ? ((flaggedCount / invoicesAudited) * 100).toFixed(1) : '0';

  const steps = [
    { label: `${invoicesAudited} INVOICES`, sub: 'Dataset analyzed' },
    { label: '6 AUDIT CHECKS', sub: 'Rules applied' },
    { label: `${flaggedCount} FLAGGED (${flaggedRate}%)`, sub: 'Discrepancies found' },
    {
      label: `${formatCompactCurrency(totalOvercharge)} EXPOSURE`,
      sub: 'Potential financial exposure',
      highlight: true,
    },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#EAF8D7] text-[#176B3A] border border-[#A8E95B]/40 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#176B3A]"></span>
            <span>{isDemo ? 'Verified Demonstration Audit' : 'Custom Interactive Audit'}</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Invoice Audit Intelligence
          </h2>

          <p className="text-xs font-semibold text-[#176B3A]">
            Automated invoice reconciliation and financial exposure detection
          </p>

          <p className="text-xs text-slate-600 leading-relaxed pt-1">
            {isDemo
              ? 'This system audits 508 vendor invoices against contracted rate cards and statutory GST tax rules. It detects arithmetic errors, duplicate billing, unauthorized charges, and subtotal variances with exact cent-level exposure calculations.'
              : `This interactive audit evaluated ${invoicesAudited} user-submitted invoice(s) across six deterministic verification routines.`}
          </p>

          {isDemo && (
            <p className="text-[11px] text-slate-400 italic pt-0.5">
              Demonstration dataset from the Mosaic Fellowship 2026 invoice auditing challenge.
            </p>
          )}
        </div>

        <button
          onClick={onExploreClick}
          className="self-start md:self-center px-4 py-2.5 rounded-xl bg-[#176B3A] text-white font-semibold text-xs hover:bg-[#12542d] transition-all shadow-xs flex items-center space-x-2 shrink-0 group"
        >
          <span>Explore Flagged Invoices ({flaggedCount})</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Clear Visual Process Pipeline */}
      <div className="border-t border-slate-100 pt-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
          Audit Processing Pipeline
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex items-center">
              <div
                className={`w-full p-3 rounded-xl border text-center font-mono ${
                  step.highlight
                    ? 'bg-red-50/70 border-red-200/90 text-red-700'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-800'
                }`}
              >
                <span className="text-xs font-bold block">{step.label}</span>
                <span className="text-[10px] font-sans text-slate-500 font-medium block mt-0.5">
                  {step.sub}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="hidden lg:flex items-center justify-center absolute -right-2.5 z-10 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400">
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
