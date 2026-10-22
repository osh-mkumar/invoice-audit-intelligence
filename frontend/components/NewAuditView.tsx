'use client';

import React, { useState } from 'react';
import { AuditBatchItem, AuditResults } from '@/types/audit';
import ManualEntryForm from './ManualEntryForm';
import FileUploadTab from './FileUploadTab';
import CustomReferenceModal from './CustomReferenceModal';
import { Edit3, UploadCloud, Shield, Play, Trash2, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface NewAuditViewProps {
  availableVendors: string[];
  onAuditCompleted: (results: AuditResults) => void;
  onBackToDemo: () => void;
}

export default function NewAuditView({
  availableVendors,
  onAuditCompleted,
  onBackToDemo,
}: NewAuditViewProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [batchInvoices, setBatchInvoices] = useState<AuditBatchItem[]>([]);
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [customRateCard, setCustomRateCard] = useState<Record<string, Record<string, number>>>({});
  const [customGstReference, setCustomGstReference] = useState<Record<string, number>>({});
  const [useDefaultReference, setUseDefaultReference] = useState(true);

  const [auditing, setAuditing] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const handleAddInvoiceToBatch = (inv: AuditBatchItem) => {
    // Avoid duplicate IDs in draft batch
    const exists = batchInvoices.some((b) => b.invoice_id === inv.invoice_id);
    if (exists) {
      setBatchInvoices(batchInvoices.map((b) => (b.invoice_id === inv.invoice_id ? inv : b)));
    } else {
      setBatchInvoices([...batchInvoices, inv]);
    }
    setAuditError(null);
  };

  const handleAddMultipleInvoices = (invoices: AuditBatchItem[]) => {
    setBatchInvoices((prev) => {
      const map = new Map<string, AuditBatchItem>();
      prev.forEach((inv) => map.set(inv.invoice_id, inv));
      invoices.forEach((inv) => map.set(inv.invoice_id, inv));
      return Array.from(map.values());
    });
    setAuditError(null);
  };

  const handleRemoveBatchInvoice = (invoiceId: string) => {
    setBatchInvoices(batchInvoices.filter((inv) => inv.invoice_id !== invoiceId));
  };

  const clearBatch = () => {
    setBatchInvoices([]);
    setAuditError(null);
  };

  const executeAuditRequest = async (invoicesToAudit: AuditBatchItem[]) => {
    if (invoicesToAudit.length === 0) {
      setAuditError('Please add or upload at least one invoice before running the audit.');
      return;
    }

    try {
      setAuditing(true);
      setAuditError(null);

      const payload = {
        invoices: invoicesToAudit,
        custom_rate_card: customRateCard,
        custom_gst_reference: customGstReference,
        use_default_reference_data: useDefaultReference,
      };

      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status} Error`);
      }

      // Tag as interactive new audit with dynamic title
      const enrichedResults: AuditResults = {
        ...data,
        is_demo: false,
        audit_title: `Custom Interactive Audit (${invoicesToAudit.length} Invoices)`,
      };

      onAuditCompleted(enrichedResults);
    } catch (err: any) {
      setAuditError(err.message || 'Failed to complete audit request.');
    } finally {
      setAuditing(false);
    }
  };

  const totalBatchValue = batchInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalLineCount = batchInvoices.reduce((sum, inv) => sum + (inv.line_items?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Controls & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full bg-[#EAF8D7] text-[#176B3A] border border-[#A8E95B]/40 text-[10px] font-bold uppercase tracking-wider">
              Interactive Audit Mode
            </span>
            <span className="text-slate-300">•</span>
            <button
              onClick={onBackToDemo}
              className="text-xs text-[#176B3A] hover:underline font-semibold flex items-center space-x-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Demo Audit (508 Invoices)</span>
            </button>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            New Invoice Audit
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit custom invoices via manual entry or file upload against contracted pricing schedules and GST rules.
          </p>
        </div>

        {/* References Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsReferenceModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-semibold text-slate-700 flex items-center space-x-2 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-[#176B3A]" />
            <span>
              Custom References{' '}
              {Object.keys(customRateCard).length > 0 || Object.keys(customGstReference).length > 0 ? (
                <span className="text-[10px] bg-[#176B3A] text-white px-1.5 py-0.2 rounded-full font-mono">
                  {Object.keys(customRateCard).length + Object.keys(customGstReference).length}
                </span>
              ) : null}
            </span>
          </button>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 shadow-xs flex items-center max-w-md">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'manual'
              ? 'bg-[#EAF8D7] text-[#176B3A] shadow-2xs border border-[#A8E95B]/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Manual Entry Form</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'upload'
              ? 'bg-[#EAF8D7] text-[#176B3A] shadow-2xs border border-[#A8E95B]/30'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Files (JSON / CSV)</span>
        </button>
      </div>

      {/* Audit Error Banner */}
      {auditError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-start space-x-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Audit Submission Error</span>
            <p className="text-[11px] leading-relaxed">{auditError}</p>
          </div>
        </div>
      )}

      {/* Batch Drawer / Summary Banner */}
      {batchInvoices.length > 0 && (
        <div className="bg-white border-2 border-[#176B3A]/30 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#176B3A] animate-pulse"></span>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Audit Batch Queue ({batchInvoices.length} Invoices • {totalLineCount} Line Items)
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-900">
                Total Billed: ₹{totalBatchValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                onClick={clearBatch}
                className="text-xs text-slate-400 hover:text-red-600 flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* List of Batch Invoices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto">
            {batchInvoices.map((inv) => (
              <div
                key={inv.invoice_id}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-slate-900 truncate">{inv.invoice_id}</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {inv.vendor_name} • {inv.line_items.length} lines
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="font-mono font-bold text-slate-900 text-[11px]">
                    ₹{inv.total.toLocaleString('en-IN')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBatchInvoice(inv.invoice_id)}
                    className="text-slate-400 hover:text-red-600 p-0.5"
                    title="Remove from batch"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Run Batch Audit Button */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              disabled={auditing}
              onClick={() => executeAuditRequest(batchInvoices)}
              className="px-6 py-2.5 bg-[#176B3A] hover:bg-[#12542d] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2"
            >
              {auditing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Auditing Batch ({batchInvoices.length} Invoices)...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Run Deterministic Audit ({batchInvoices.length} Invoices)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'manual' ? (
        <ManualEntryForm
          availableVendors={availableVendors}
          onAddInvoiceToBatch={handleAddInvoiceToBatch}
          onRunAuditImmediately={(inv) => executeAuditRequest([inv])}
        />
      ) : (
        <FileUploadTab
          onInvoicesLoaded={handleAddMultipleInvoices}
          onRunAuditImmediately={(invs) => executeAuditRequest(invs)}
        />
      )}

      {/* Reference Modal */}
      <CustomReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        customRateCard={customRateCard}
        customGstReference={customGstReference}
        onSaveReferences={(rc, gst) => {
          setCustomRateCard(rc);
          setCustomGstReference(gst);
        }}
      />
    </div>
  );
}
