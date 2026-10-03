'use client';

import React from 'react';
import { Database, GitCompare, CheckCheck, Search } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Ingest',
      desc: 'Load and process all 508 vendor invoices.',
      icon: Database,
    },
    {
      num: '02',
      title: 'Reconcile',
      desc: 'Compare invoice data against contracted rates, GST references, arithmetic, subtotals, duplicate patterns, and allowed charge types.',
      icon: GitCompare,
    },
    {
      num: '03',
      title: 'Verify',
      desc: 'Independently recalculate detected overcharges and confirm the final result.',
      icon: CheckCheck,
    },
    {
      num: '04',
      title: 'Investigate',
      desc: 'Search and inspect every flagged invoice and its financial impact.',
      icon: Search,
    },
  ];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          How the Audit Works
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          End-to-end automated verification workflow
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#176B3A] bg-[#EAF8D7] px-2 py-0.5 rounded">
                  {step.num}
                </span>
                <Icon className="w-4 h-4 text-slate-400" />
              </div>

              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide pt-1">
                {step.title}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
