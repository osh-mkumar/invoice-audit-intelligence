'use client';

import React from 'react';
import { LayoutDashboard, FileText, AlertTriangle, ShieldCheck, CheckCircle2, PlusCircle, Database } from 'lucide-react';

interface SidebarProps {
  auditMode: 'demo' | 'custom';
  setAuditMode: (mode: 'demo' | 'custom') => void;
  activeTab: 'overview' | 'invoices' | 'issues' | 'summary' | 'new-audit';
  setActiveTab: (tab: 'overview' | 'invoices' | 'issues' | 'summary' | 'new-audit') => void;
  totalIssues: number;
  flaggedCount: number;
  hasCustomAuditResults: boolean;
  onStartNewAudit: () => void;
}

export default function Sidebar({
  auditMode,
  setAuditMode,
  activeTab,
  setActiveTab,
  totalIssues,
  flaggedCount,
  hasCustomAuditResults,
  onStartNewAudit,
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
    <aside className="w-60 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none text-slate-700 font-sans">
      <div className="overflow-y-auto">
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-3.5 h-3.5 rounded-full bg-[#176B3A] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#A8E95B]"></div>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-sm tracking-tight leading-none">
                Invoice Audit
              </h1>
              <span className="text-[10px] text-slate-400 font-medium">Intelligence Platform</span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
            v2.0
          </span>
        </div>

        {/* AUDIT MODE SELECTOR */}
        <div className="p-3 border-b border-slate-100 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
            Audit Workspace
          </span>

          <button
            onClick={() => {
              setAuditMode('demo');
              if (activeTab === 'new-audit') setActiveTab('overview');
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              auditMode === 'demo' && activeTab !== 'new-audit'
                ? 'bg-[#EAF8D7] text-[#176B3A] shadow-2xs border border-[#A8E95B]/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Database className="w-3.5 h-3.5" />
              <span>Demo Audit</span>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              508 Inv
            </span>
          </button>

          <button
            onClick={onStartNewAudit}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'new-audit'
                ? 'bg-[#176B3A] text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <div className="flex items-center space-x-2">
              <PlusCircle className={`w-3.5 h-3.5 ${activeTab === 'new-audit' ? 'text-white' : 'text-[#176B3A]'}`} />
              <span>New Audit</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                activeTab === 'new-audit' ? 'bg-white/20 text-white' : 'bg-[#EAF8D7] text-[#176B3A]'
              }`}
            >
              Manual / File
            </span>
          </button>

          {hasCustomAuditResults && (
            <button
              onClick={() => {
                setAuditMode('custom');
                if (activeTab === 'new-audit') setActiveTab('overview');
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                auditMode === 'custom' && activeTab !== 'new-audit'
                  ? 'bg-[#EAF8D7] text-[#176B3A] shadow-2xs border border-[#A8E95B]/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Custom Results</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Active</span>
            </button>
          )}
        </div>

        {/* WORKSPACE NAVIGATION ITEMS */}
        <div className="p-3 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
            {activeTab === 'new-audit'
              ? 'New Audit Setup'
              : auditMode === 'demo'
              ? 'Demo Exploration'
              : 'Audit Results'}
          </span>

          {activeTab !== 'new-audit' ? (
            navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
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
                        isActive ? 'bg-[#176B3A]/10 text-[#176B3A]' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="p-3 bg-[#F8FAF6] border border-slate-200/60 rounded-xl space-y-1.5 text-xs text-slate-600">
              <span className="font-bold text-slate-800 block text-[11px]">Audit Intake Active</span>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Add invoices manually or upload a batch file. Results will populate dynamically upon audit execution.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Attribution Card */}
      <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
        <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#176B3A]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#176B3A] shrink-0" />
          <span>Audit Engine Verified</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          {auditMode === 'demo'
            ? 'Demonstration dataset from the Mosaic Fellowship 2026 invoice auditing challenge.'
            : 'Deterministic 6-check audit logic running on local Python backend.'}
        </p>
      </div>
    </aside>
  );
}
