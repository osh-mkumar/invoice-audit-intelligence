'use client';

import React from 'react';
import { LayoutDashboard, FileText, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SidebarProps {
  activeTab: 'overview' | 'invoices' | 'issues' | 'summary';
  setActiveTab: (tab: 'overview' | 'invoices' | 'issues' | 'summary') => void;
  totalIssues: number;
  flaggedCount: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  totalIssues,
  flaggedCount,
}: SidebarProps) {
  const navItems: Array<{
    id: 'overview' | 'invoices' | 'issues' | 'summary';
    label: string;
    icon: any;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText, badge: flaggedCount },
    { id: 'issues', label: 'Issues', icon: AlertTriangle, badge: totalIssues },
    { id: 'summary', label: 'Audit Summary', icon: ShieldCheck },
  ];


  return (
    <aside className="w-56 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none text-slate-700 font-sans">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-3 h-3 rounded-full bg-[#176B3A] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#A8E95B]"></div>
            </div>
            <h1 className="font-bold text-slate-900 text-sm tracking-tight">
              Invoice Audit
            </h1>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
            v1.0
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-[#EAF8D7] text-[#176B3A] font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#176B3A]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-[#176B3A]/10 text-[#176B3A]'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Audit Engine Footer Indicator */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200/60">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-[#176B3A]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#176B3A]" />
          <span>Audit Engine Verified</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
          Deterministic 6-check audit logic
        </p>
      </div>
    </aside>
  );
}
