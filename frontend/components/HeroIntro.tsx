'use client';

import React from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';

interface HeroIntroProps {
  onExploreClick: () => void;
}

export default function HeroIntro({ onExploreClick }: HeroIntroProps) {
  const steps = [
    { label: '508 INVOICES', sub: 'Dataset ingested' },
    { label: '6 AUDIT CHECKS', sub: 'Rules applied' },
    { label: '65 FLAGGED INVOICES', sub: 'Anomalies detected' },
    { label: '₹17.56M EXPOSURE', sub: 'Verified overcharge', highlight: true },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#EAF8D7] text-[#176B3A] border border-[#A8E95B]/40 text-xs font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#176B3A]"></span>
            <span>Automated Audit Workstation</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Invoice Audit Intelligence
          </h2>

          <p className="text-xs font-semibold text-[#176B3A]">
            Automated invoice reconciliation and financial exposure detection
          </p>

          <p className="text-xs text-slate-600 leading-relaxed pt-1">
            This system audits 508 vendor invoices against contracted rate cards and GST rules. It validates invoice calculations, detects duplicate billing and unauthorized charges, and calculates the resulting financial exposure.
          </p>
        </div>

        <button
          onClick={onExploreClick}
          className="self-start md:self-center px-4 py-2.5 rounded-xl bg-[#176B3A] text-white font-semibold text-xs hover:bg-[#12542d] transition-all shadow-xs flex items-center space-x-2 shrink-0 group"
        >
          <span>Explore Flagged Invoices</span>
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
