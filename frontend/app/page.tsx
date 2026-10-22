'use client';

import React, { useEffect, useState } from 'react';
import { AuditResults, FlaggedInvoice, ReferenceData } from '@/types/audit';
import Sidebar from '@/components/Sidebar';
import HeroIntro from '@/components/HeroIntro';
import KPICards from '@/components/KPICards';
import HowItWorksSection from '@/components/HowItWorksSection';
import AuditChecksSection from '@/components/AuditChecksSection';
import ExposureBreakdownSection from '@/components/ExposureBreakdownSection';
import InvoiceTable from '@/components/InvoiceTable';
import IssuesList from '@/components/IssuesList';
import InvoiceDetailModal from '@/components/InvoiceDetailModal';
import AuditSummarySection from '@/components/AuditSummarySection';
import NewAuditView from '@/components/NewAuditView';
import CheckCoverageBadge from '@/components/CheckCoverageBadge';
import { AlertCircle, PlusCircle, Database, RefreshCw } from 'lucide-react';
import { formatCompactCurrency } from '@/lib/utils';

export default function Home() {
  const [demoData, setDemoData] = useState<AuditResults | null>(null);
  const [customData, setCustomData] = useState<AuditResults | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [auditMode, setAuditMode] = useState<'demo' | 'custom'>('demo');
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'issues' | 'summary' | 'new-audit'>('overview');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<FlaggedInvoice | null>(null);

  // Load baseline demo dataset and reference data
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        // Load demo audit results
        const res = await fetch('/api/audit-results');
        if (!res.ok) {
          throw new Error(`Failed to load audit results: HTTP ${res.status}`);
        }
        const json: AuditResults = await res.json();
        // Enrich demo data with clean invoice calculation
        const cleanCount = json.summary.invoices_audited - json.flagged_invoices.length;
        setDemoData({
          ...json,
          is_demo: true,
          clean_invoices_count: cleanCount,
          flagged_invoices_count: json.flagged_invoices.length,
        });

        // Load reference data in parallel
        try {
          const refRes = await fetch('/api/reference-data');
          if (refRes.ok) {
            const refJson: ReferenceData = await refRes.json();
            setReferenceData(refJson);
          }
        } catch (e) {
          // Non-critical reference fetch fallback
        }
      } catch (err: any) {
        setError(err.message || 'Error initializing application');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Determine current active dataset
  const activeData: AuditResults | null =
    auditMode === 'custom' && customData ? customData : demoData;

  const handleSelectInvoiceById = (invoiceId: string) => {
    if (!activeData) return;
    const inv = activeData.flagged_invoices.find((i) => i.invoice_id === invoiceId);
    if (inv) {
      setSelectedInvoice(inv);
    } else {
      const issue = activeData.issues.find((i) => i.invoice_id === invoiceId);
      if (issue) {
        setSelectedInvoice({
          invoice_id: issue.invoice_id,
          vendor_name: issue.vendor_name,
          invoice_date: issue.invoice_date || 'N/A',
          subtotal: issue.stated_subtotal || 0,
          gst_amount: 0,
          total: issue.invoice_total || issue.amount || 0,
          issues: activeData.issues.filter((i) => i.invoice_id === invoiceId),
          total_overcharge: activeData.issues
            .filter((i) => i.invoice_id === invoiceId)
            .reduce((sum, i) => sum + i.overcharge, 0),
        });
      }
    }
  };

  const handleExploreClick = () => {
    setActiveTab('invoices');
  };

  const handleStartNewAudit = () => {
    setActiveTab('new-audit');
  };

  const handleAuditCompleted = (results: AuditResults) => {
    setCustomData(results);
    setAuditMode('custom');
    setActiveTab('overview');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-[#176B3A] animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading audit workstation...</p>
        </div>
      </div>
    );
  }

  if (error || !activeData) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md p-6 bg-white border border-slate-200/90 rounded-2xl text-center space-y-3 shadow-xs">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-900 uppercase">Failed to load audit dataset</h2>
          <p className="text-xs text-slate-500">{error || 'Please ensure output/audit_results.json exists.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#176B3A] hover:bg-[#12542d] rounded-lg text-xs font-semibold text-white transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { summary, breakdown, issues, flagged_invoices } = activeData;
  const isDemo = auditMode === 'demo';
  const cleanCount = activeData.clean_invoices_count ?? summary.invoices_audited - flagged_invoices.length;
  const flaggedRate = summary.invoices_audited > 0 ? ((flagged_invoices.length / summary.invoices_audited) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#F8FAF6] text-slate-900 flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        auditMode={auditMode}
        setAuditMode={setAuditMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalIssues={issues.length}
        flaggedCount={flagged_invoices.length}
        hasCustomAuditResults={!!customData}
        onStartNewAudit={handleStartNewAudit}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Invoice Audit Intelligence
              </h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                isDemo
                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-[#EAF8D7] text-[#176B3A] border-[#A8E95B]/40'
              }`}>
                {isDemo ? 'Demo Mode: Mosaic Fellowship 2026' : 'Custom Interactive Audit'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic invoice reconciliation and financial exposure detection
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 font-semibold" title="Total invoices analyzed by audit engine">
              {summary.invoices_audited} Audited
            </span>
            <span className="px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 font-bold" title="Invoices with detected discrepancies">
              {flagged_invoices.length} Flagged ({flaggedRate}%)
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#EAF8D7] border border-[#A8E95B]/40 text-[#176B3A] font-semibold" title="Invoices passing all checks without detected anomalies">
              {cleanCount} No Issues Detected
            </span>
            <span className="px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 font-bold">
              {formatCompactCurrency(summary.total_overcharge)} Exposure
            </span>

            {activeTab !== 'new-audit' && (
              <button
                onClick={handleStartNewAudit}
                className="ml-2 px-3 py-1 bg-[#176B3A] hover:bg-[#12542d] text-white rounded-md text-xs font-sans font-semibold transition-colors flex items-center space-x-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Audit</span>
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Mode Switcher Banner (if viewing custom audit) */}
        {!isDemo && activeTab !== 'new-audit' && (
          <div className="bg-[#EAF8D7]/60 border-b border-[#A8E95B]/40 px-6 py-2.5 flex items-center justify-between text-xs text-[#176B3A]">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#176B3A]"></span>
              <span className="font-semibold">
                Viewing Custom Audit Results ({summary.invoices_audited} invoices evaluated)
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleStartNewAudit}
                className="hover:underline font-semibold"
              >
                + Audit Another Batch
              </button>
              <span>•</span>
              <button
                onClick={() => setAuditMode('demo')}
                className="hover:underline font-bold"
              >
                Switch to Demo Dataset (508 Invoices)
              </button>
            </div>
          </div>
        )}

        {/* Tab Content Container */}
        <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          {activeTab === 'new-audit' && (
            <NewAuditView
              availableVendors={referenceData?.vendors || []}
              onAuditCompleted={handleAuditCompleted}
              onBackToDemo={() => {
                setAuditMode('demo');
                setActiveTab('overview');
              }}
            />
          )}

          {activeTab === 'overview' && (
            <>
              {/* Product Explanation Hero Intro & Pipeline */}
              <HeroIntro
                onExploreClick={handleExploreClick}
                invoicesAudited={summary.invoices_audited}
                flaggedCount={flagged_invoices.length}
                totalOvercharge={summary.total_overcharge}
                isDemo={isDemo}
              />

              {/* 5-Metric Structured KPI Cards & Disclaimer */}
              <KPICards
                totalOvercharge={summary.total_overcharge}
                invoicesAudited={summary.invoices_audited}
                flaggedInvoicesCount={flagged_invoices.length}
                totalIssuesCount={issues.length}
                cleanInvoicesCount={cleanCount}
                isDemo={isDemo}
              />

              {/* Verification Coverage Status (if available) */}
              {activeData.checks_completed && activeData.checks_completed.length > 0 && (
                <CheckCoverageBadge
                  completed={activeData.checks_completed}
                  skipped={activeData.checks_skipped || []}
                />
              )}

              {/* How the Audit Works */}
              <HowItWorksSection />

              {/* 6 Automated Audit Checks Explanation */}
              <AuditChecksSection
                summary={summary}
                breakdown={breakdown}
                selectedCategory={selectedCategoryFilter}
                onSelectCategory={setSelectedCategoryFilter}
              />

              {/* Financial Exposure Breakdown & Key Findings */}
              <ExposureBreakdownSection
                summary={summary}
                breakdown={breakdown}
                issues={issues}
                selectedCategory={selectedCategoryFilter}
                onSelectCategory={setSelectedCategoryFilter}
              />

              {/* Invoice Review Table Section */}
              <InvoiceTable
                invoices={flagged_invoices}
                onSelectInvoice={setSelectedInvoice}
                selectedCategoryFilter={selectedCategoryFilter}
                onSelectCategoryFilter={setSelectedCategoryFilter}
                totalAuditedCount={summary.invoices_audited}
                notFlaggedCount={cleanCount}
              />
            </>
          )}

          {activeTab === 'invoices' && (
            <InvoiceTable
              invoices={flagged_invoices}
              onSelectInvoice={setSelectedInvoice}
              selectedCategoryFilter={selectedCategoryFilter}
              onSelectCategoryFilter={setSelectedCategoryFilter}
              totalAuditedCount={summary.invoices_audited}
              notFlaggedCount={cleanCount}
            />
          )}

          {activeTab === 'issues' && (
            <IssuesList
              issues={issues}
              flaggedInvoices={flagged_invoices}
              onSelectInvoice={handleSelectInvoiceById}
              selectedCategoryFilter={selectedCategoryFilter}
              onSelectCategoryFilter={setSelectedCategoryFilter}
            />
          )}

          {activeTab === 'summary' && (
            <AuditSummarySection summary={summary} breakdown={breakdown} />
          )}
        </div>
      </main>

      {/* Invoice Detail Inspector Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onSelectInvoice={handleSelectInvoiceById}
      />
    </div>
  );
}
