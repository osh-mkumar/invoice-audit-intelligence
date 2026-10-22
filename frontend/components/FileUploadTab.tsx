'use client';

import React, { useState, useRef } from 'react';
import { AuditBatchItem } from '@/types/audit';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Trash2, Download, Play, HelpCircle } from 'lucide-react';

interface FileUploadTabProps {
  onInvoicesLoaded: (invoices: AuditBatchItem[]) => void;
  onRunAuditImmediately: (invoices: AuditBatchItem[]) => void;
}

export default function FileUploadTab({
  onInvoicesLoaded,
  onRunAuditImmediately,
}: FileUploadTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsedInvoices, setParsedInvoices] = useState<AuditBatchItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = () => {
    setFile(null);
    setParsedInvoices([]);
    setErrors([]);
    setWarnings([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseCsvText = (text: string): { invoices: AuditBatchItem[]; errs: string[]; warns: string[] } => {
    const errs: string[] = [];
    const warns: string[] = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    if (lines.length < 2) {
      errs.push('CSV file is empty or missing headers.');
      return { invoices: [], errs, warns };
    }

    // Parse header row
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''));
    const requiredCols = ['invoice_id', 'vendor_name', 'description', 'quantity', 'unit_price', 'amount'];
    for (const req of requiredCols) {
      if (!headers.includes(req)) {
        errs.push(`Missing required column: "${req}". Please refer to the CSV template.`);
      }
    }
    if (errs.length > 0) return { invoices: [], errs, warns };

    const getIdx = (col: string) => headers.indexOf(col);
    const invoiceMap: Record<string, AuditBatchItem> = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Basic CSV split supporting simple commas
      const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < headers.length) {
        warns.push(`Row ${i + 1} has fewer columns than headers. Skipped.`);
        continue;
      }

      const invId = cols[getIdx('invoice_id')];
      const vendor = cols[getIdx('vendor_name')];
      const desc = cols[getIdx('description')];
      const qtyStr = cols[getIdx('quantity')];
      const priceStr = cols[getIdx('unit_price')];
      const amtStr = cols[getIdx('amount')];

      if (!invId || !vendor || !desc) {
        warns.push(`Row ${i + 1}: Missing invoice ID, vendor, or description.`);
        continue;
      }

      const quantity = parseFloat(qtyStr);
      const unit_price = parseFloat(priceStr);
      const amount = parseFloat(amtStr);

      if (isNaN(quantity) || isNaN(unit_price) || isNaN(amount)) {
        warns.push(`Row ${i + 1}: Non-numeric quantity, unit price, or amount.`);
        continue;
      }

      const gstRateIdx = getIdx('gst_rate');
      const hsnIdx = getIdx('hsn_code');
      const dateIdx = getIdx('invoice_date');
      const subtotalIdx = getIdx('subtotal');
      const gstAmtIdx = getIdx('gst_amount');
      const totalIdx = getIdx('total');
      const termsIdx = getIdx('payment_terms');

      const gst_rate = gstRateIdx !== -1 && cols[gstRateIdx] ? parseFloat(cols[gstRateIdx]) : undefined;
      const hsn_code = hsnIdx !== -1 && cols[hsnIdx] ? cols[hsnIdx] : undefined;
      const invoice_date = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().split('T')[0];
      const payment_terms = termsIdx !== -1 && cols[termsIdx] ? cols[termsIdx] : undefined;

      const statedSubtotal = subtotalIdx !== -1 && cols[subtotalIdx] ? parseFloat(cols[subtotalIdx]) : 0;
      const statedGst = gstAmtIdx !== -1 && cols[gstAmtIdx] ? parseFloat(cols[gstAmtIdx]) : 0;
      const statedTotal = totalIdx !== -1 && cols[totalIdx] ? parseFloat(cols[totalIdx]) : 0;

      if (!invoiceMap[invId]) {
        invoiceMap[invId] = {
          invoice_id: invId,
          vendor_name: vendor,
          invoice_date,
          payment_terms,
          subtotal: statedSubtotal || amount,
          gst_amount: statedGst || 0,
          total: statedTotal || amount + (statedGst || 0),
          line_items: [],
        };
      }

      invoiceMap[invId].line_items.push({
        description: desc,
        quantity,
        unit_price,
        amount,
        gst_rate,
        hsn_code,
      });
    }

    const invoices = Object.values(invoiceMap);
    if (invoices.length === 0 && errs.length === 0) {
      errs.push('No valid invoice records could be parsed from the CSV file.');
    }

    return { invoices, errs, warns };
  };

  const parseJsonText = (text: string): { invoices: AuditBatchItem[]; errs: string[]; warns: string[] } => {
    const errs: string[] = [];
    const warns: string[] = [];

    try {
      const parsed = JSON.parse(text);
      let rawList: any[] = [];

      if (Array.isArray(parsed)) {
        rawList = parsed;
      } else if (parsed && Array.isArray(parsed.invoices)) {
        rawList = parsed.invoices;
      } else if (parsed && parsed.invoice_id) {
        rawList = [parsed];
      } else {
        errs.push('Invalid JSON structure. Expected a list of invoice objects or { "invoices": [...] }');
        return { invoices: [], errs, warns };
      }

      const validInvoices: AuditBatchItem[] = [];

      for (let i = 0; i < rawList.length; i++) {
        const item = rawList[i];
        if (!item.invoice_id || !item.vendor_name) {
          warns.push(`Record #${i + 1}: Missing invoice_id or vendor_name.`);
          continue;
        }
        if (!Array.isArray(item.line_items) || item.line_items.length === 0) {
          warns.push(`Invoice ${item.invoice_id}: Line items array is missing or empty.`);
          continue;
        }

        const validItems = [];
        for (const line of item.line_items) {
          if (!line.description) continue;
          validItems.push({
            description: String(line.description),
            quantity: Number(line.quantity) || 1,
            unit_price: Number(line.unit_price) || 0,
            amount: Number(line.amount) || 0,
            gst_rate: line.gst_rate !== undefined ? Number(line.gst_rate) : undefined,
            hsn_code: line.hsn_code ? String(line.hsn_code) : undefined,
          });
        }

        if (validItems.length === 0) {
          warns.push(`Invoice ${item.invoice_id}: No valid line items.`);
          continue;
        }

        validInvoices.push({
          invoice_id: String(item.invoice_id),
          vendor_name: String(item.vendor_name),
          invoice_date: item.invoice_date || '',
          subtotal: Number(item.subtotal) || validItems.reduce((s, it) => s + it.amount, 0),
          gst_amount: Number(item.gst_amount) || 0,
          total: Number(item.total) || Number(item.subtotal) || 0,
          payment_terms: item.payment_terms || '',
          vendor_type: item.vendor_type || '',
          line_items: validItems,
        });
      }

      if (validInvoices.length === 0 && errs.length === 0) {
        errs.push('No valid invoices found in the provided JSON.');
      }

      return { invoices: validInvoices, errs, warns };
    } catch (e: any) {
      errs.push(`JSON Syntax Error: ${e.message}`);
      return { invoices: [], errs, warns };
    }
  };

  const handleProcessFile = (selectedFile: File) => {
    setFile(selectedFile);
    setParsing(true);
    setErrors([]);
    setWarnings([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const isCsv = selectedFile.name.endsWith('.csv');
      const isJson = selectedFile.name.endsWith('.json');

      if (!isCsv && !isJson) {
        setErrors(['Unsupported file format. Please upload a .json or .csv file.']);
        setParsing(false);
        return;
      }

      const { invoices, errs, warns } = isCsv ? parseCsvText(content) : parseJsonText(content);

      setErrors(errs);
      setWarnings(warns);
      setParsedInvoices(invoices);
      setParsing(false);
    };

    reader.onerror = () => {
      setErrors(['Failed to read file from disk.']);
      setParsing(false);
    };

    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Drop Zone */}
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragOver
              ? 'border-[#176B3A] bg-[#F3FCE8]/50'
              : 'border-slate-300 hover:border-slate-400 bg-white'
          }`}
        >
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EAF8D7] text-[#176B3A] flex items-center justify-center mx-auto">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Upload Invoices for Audit
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Drag and drop your JSON or CSV file here, or browse your files.
              </p>
            </div>

            <div className="pt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessFile(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="invoice-file-input"
              />
              <label
                htmlFor="invoice-file-input"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#176B3A] hover:bg-[#12542d] text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Select File from Computer</span>
              </label>
            </div>

            <p className="text-[11px] text-slate-400">
              Supports single or multi-invoice batches (.json, .csv). Data is processed locally by your audit server without external third-party AI exposure.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-[#EAF8D7] text-[#176B3A] flex items-center justify-center font-bold text-xs uppercase">
                {file.name.endsWith('.csv') ? 'CSV' : 'JSON'}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">{file.name}</h4>
                <p className="text-[11px] text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB • {parsedInvoices.length} invoice(s) recognized
                </p>
              </div>
            </div>

            <button
              onClick={resetUpload}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove File</span>
            </button>
          </div>

          {/* Validation Feedback */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-800">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>File Validation Errors</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-800">
              <span className="font-bold">Warnings ({warnings.length}):</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1 max-h-24 overflow-y-auto">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedInvoices.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Recognized Invoices Preview ({parsedInvoices.length})</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {parsedInvoices.reduce((sum, inv) => sum + inv.line_items.length, 0)} total line items
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                {parsedInvoices.map((inv) => (
                  <div key={inv.invoice_id} className="p-3 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <div className="font-bold text-slate-900">{inv.invoice_id}</div>
                      <div className="text-[11px] text-slate-500">
                        {inv.vendor_name} • {inv.line_items.length} line item(s) • Date: {inv.invoice_date || 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">
                        ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Subtotal: ₹{inv.subtotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onInvoicesLoaded(parsedInvoices)}
                  className="px-4 py-2 border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  Add to Batch Drawer
                </button>
                <button
                  type="button"
                  onClick={() => onRunAuditImmediately(parsedInvoices)}
                  className="px-5 py-2 bg-[#176B3A] hover:bg-[#12542d] text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center space-x-2"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Run Audit on {parsedInvoices.length} Invoice(s)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates & Documentation Section */}
      <div className="bg-[#F8FAF6] border border-slate-200/80 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 text-[#176B3A]" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Downloadable Synthetic Templates & Schema Guide
            </h4>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
            Independent Synthetic Examples
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Download synthetic test invoices to test the engine immediately. For CSV files, multiple line items sharing the same <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[11px]">invoice_id</code> are automatically grouped into a single multi-line invoice.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <a
            href="/templates/sample_invoices.json"
            download="synthetic_invoices_sample.json"
            className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-[#176B3A] transition-all group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#EAF8D7] text-[#176B3A] flex items-center justify-center font-bold text-[10px]">
                JSON
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block group-hover:text-[#176B3A]">
                  Synthetic Invoices JSON
                </span>
                <span className="text-[10px] text-slate-400 block">
                  3 synthetic test invoices with line items
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-[#176B3A]" />
          </a>

          <a
            href="/templates/sample_invoices.csv"
            download="synthetic_invoices_sample.csv"
            className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-[#176B3A] transition-all group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#EAF8D7] text-[#176B3A] flex items-center justify-center font-bold text-[10px]">
                CSV
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-slate-800 block group-hover:text-[#176B3A]">
                  Synthetic Invoices CSV
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Multi-line CSV structure sample
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-[#176B3A]" />
          </a>
        </div>
      </div>
    </div>
  );
}
