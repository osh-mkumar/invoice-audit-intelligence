'use client';

import React, { useEffect, useState } from 'react';
import { AuditResults, FlaggedInvoice } from '@/types/audit';
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
import { AlertCircle } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<AuditResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'issues' | 'summary'>('overview');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<FlaggedInvoice | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch('/api/audit-results');
        if (!res.ok) {
          throw new Error(`Failed to load audit results: HTTP ${res.status}`);
        }
        const json: AuditResults = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }

    }
    fetchData();
  }, []);

  const handleSelectInvoiceById = (invoiceId: string) => {
    if (!data) return;
    const inv = data.flagged_invoices.find((i) => i.invoice_id === invoiceId);
    if (inv) {
      setSelectedInvoice(inv);
    } else {
      const issue = data.issues.find((i) => i.invoice_id === invoiceId);
      if (issue) {
        setSelectedInvoice({
          invoice_id: issue.invoice_id,
          vendor_name: issue.vendor_name,
          invoice_date: issue.invoice_date || 'N/A',
          subtotal: issue.stated_subtotal || 0,
          gst_amount: 0,
          total: issue.invoice_total || issue.amount || 0,
          issues: data.issues.filter((i) => i.invoice_id === invoiceId),
          total_overcharge: data.issues
            .filter((i) => i.invoice_id === invoiceId)
            .reduce((sum, i) => sum + i.overcharge, 0),
        });
      }
    }
  };

  const handleExploreClick = () => {
    setActiveTab('invoices');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] text-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-[#176B3A] animate-spin"></div>
          <p className="text-xs font-semibold text-slate-500">Loading audit results...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
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

  const { summary, breakdown, issues, flagged_invoices } = data;

  return (
    <div className="min-h-screen bg-[#F8FAF6] text-slate-900 flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalIssues={issues.length}
        flaggedCount={flagged_invoices.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs">
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Invoice Audit Intelligence
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Automated invoice reconciliation and financial exposure detection
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 font-semibold">
              508 Audited
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#EAF8D7] border border-[#A8E95B]/40 text-[#176B3A] font-semibold">
              65 Flagged
            </span>
            <span className="px-2.5 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 font-bold">
              ₹17.56M Exposure
            </span>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
          {activeTab === 'overview' && (
            <>
              {/* Product Explanation Hero Intro & Pipeline */}
              <HeroIntro onExploreClick={handleExploreClick} />

              {/* Primary Exposure Anchor Card & KPI Grid */}
              <KPICards
                totalOvercharge={summary.total_overcharge}
                invoicesAudited={summary.invoices_audited}
                flaggedInvoicesCount={flagged_invoices.length}
                totalIssuesCount={issues.length}
              />

              {/* How the Audit Works (4-step workflow) */}
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
              />
            </>
          )}

          {activeTab === 'invoices' && (
            <InvoiceTable
              invoices={flagged_invoices}
              onSelectInvoice={setSelectedInvoice}
              selectedCategoryFilter={selectedCategoryFilter}
              onSelectCategoryFilter={setSelectedCategoryFilter}
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
