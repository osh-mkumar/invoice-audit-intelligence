'use client';

import React, { useState } from 'react';
import { AuditBatchItem, LineItem } from '@/types/audit';
import { Plus, Trash2, Info, Check, Play, AlertCircle } from 'lucide-react';

interface ManualEntryFormProps {
  availableVendors: string[];
  onAddInvoiceToBatch: (invoice: AuditBatchItem) => void;
  onRunAuditImmediately: (invoice: AuditBatchItem) => void;
}

const DEFAULT_LINE_ITEM: LineItem = {
  description: '',
  quantity: 1,
  unit_price: 100,
  amount: 100,
  gst_rate: 18,
  hsn_code: '9965',
};

export default function ManualEntryForm({
  availableVendors,
  onAddInvoiceToBatch,
  onRunAuditImmediately,
}: ManualEntryFormProps) {
  const [invoiceId, setInvoiceId] = useState(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [vendorName, setVendorName] = useState(availableVendors[0] || 'Delhivery Logistics');
  const [isCustomVendor, setIsCustomVendor] = useState(false);
  const [customVendorName, setCustomVendorName] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTerms, setPaymentTerms] = useState('Net 30');

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      description: 'Freight charges - Zone A',
      quantity: 10,
      unit_price: 20.16,
      amount: 201.6,
      gst_rate: 18,
      hsn_code: '9965',
    },
  ]);

  // User-entered invoice totals
  const [billedSubtotal, setBilledSubtotal] = useState<number>(201.6);
  const [billedGstAmount, setBilledGstAmount] = useState<number>(36.29);
  const [billedTotal, setBilledTotal] = useState<number>(237.89);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live calculated expected figures (for auditor guidance only)
  const calculatedLineSums = lineItems.reduce((acc, item) => {
    const expectedLine = Math.round(item.quantity * item.unit_price * 100) / 100;
    const billedLine = item.amount;
    const gstRate = item.gst_rate ?? 18;
    const lineGst = Math.round((billedLine * gstRate) / 100 * 100) / 100;

    return {
      expectedSubtotal: acc.expectedSubtotal + expectedLine,
      billedLinesSum: acc.billedLinesSum + billedLine,
      expectedGstSum: acc.expectedGstSum + lineGst,
    };
  }, { expectedSubtotal: 0, billedLinesSum: 0, expectedGstSum: 0 });

  const calculatedExpectedSubtotal = Math.round(calculatedLineSums.billedLinesSum * 100) / 100;
  const calculatedExpectedGst = Math.round(calculatedLineSums.expectedGstSum * 100) / 100;
  const calculatedExpectedTotal = Math.round((calculatedExpectedSubtotal + calculatedExpectedGst) * 100) / 100;

  const handleLineItemChange = (index: number, field: keyof LineItem, val: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: val };
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { ...DEFAULT_LINE_ITEM }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      setValidationError('Invoice must contain at least one line item.');
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const buildCurrentInvoice = (): AuditBatchItem | null => {
    setValidationError(null);
    const finalVendor = isCustomVendor ? customVendorName.trim() : vendorName;

    if (!invoiceId.trim()) {
      setValidationError('Invoice ID / Number is required.');
      return null;
    }
    if (!finalVendor) {
      setValidationError('Vendor name is required.');
      return null;
    }
    if (lineItems.length === 0) {
      setValidationError('Invoice must contain at least one line item.');
      return null;
    }
    for (let i = 0; i < lineItems.length; i++) {
      const it = lineItems[i];
      if (!it.description.trim()) {
        setValidationError(`Line item #${i + 1} requires a description.`);
        return null;
      }
      if (it.quantity <= 0) {
        setValidationError(`Line item #${i + 1} quantity must be greater than zero.`);
        return null;
      }
      if (it.unit_price < 0) {
        setValidationError(`Line item #${i + 1} unit price cannot be negative.`);
        return null;
      }
    }

    return {
      invoice_id: invoiceId.trim(),
      vendor_name: finalVendor,
      invoice_date: invoiceDate,
      payment_terms: paymentTerms,
      subtotal: Number(billedSubtotal),
      gst_amount: Number(billedGstAmount),
      total: Number(billedTotal),
      line_items: lineItems,
    };
  };

  const handleAddToBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = buildCurrentInvoice();
    if (!inv) return;

    onAddInvoiceToBatch(inv);
    setSuccessMsg(`Invoice "${inv.invoice_id}" added to the audit batch drawer!`);
    setTimeout(() => setSuccessMsg(null), 3000);

    // Increment invoice id for convenient next entry
    setInvoiceId(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleAuditImmediately = () => {
    const inv = buildCurrentInvoice();
    if (!inv) return;
    onRunAuditImmediately(inv);
  };

  return (
    <form onSubmit={handleAddToBatch} className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-[#F8FAF6] border border-slate-200/80 rounded-xl p-4 flex items-start space-x-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-[#176B3A] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-slate-800">Deterministic Financial Auditing: </span>
          Enter invoice amounts exactly as stated on the supplier document. The audit engine will compare user-entered billed values against calculated line arithmetic (<code className="font-mono text-[11px] bg-slate-200/60 px-1 py-0.5 rounded">qty × unit_price</code>), contracted vendor rate cards, and statutory GST schedules.
        </div>
      </div>

      {validationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#EAF8D7] border border-[#A8E95B]/60 rounded-xl flex items-center space-x-2 text-xs text-[#176B3A] font-semibold">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invoice Meta Grid */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          1. Invoice Metadata
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Invoice Number / ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="e.g. INV-9821"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:bg-white focus:outline-none focus:border-[#176B3A]"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Vendor / Supplier <span className="text-red-500">*</span>
            </label>
            {!isCustomVendor ? (
              <div className="space-y-1">
                <select
                  value={vendorName}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomVendor(true);
                      setCustomVendorName('');
                    } else {
                      setVendorName(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#176B3A]"
                >
                  {availableVendors.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  <option value="__custom__">+ Enter New Vendor...</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="New Vendor Name"
                  value={customVendorName}
                  onChange={(e) => setCustomVendorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#176B3A]"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomVendor(false)}
                  className="px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-slate-900 bg-slate-100 rounded-lg"
                >
                  Preset
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Invoice Date
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#176B3A]"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Payment Terms
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. Net 30"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-[#176B3A]"
            />
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              2. Line Items ({lineItems.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live calculated expected figures shown in green for auditor reference
            </p>
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#EAF8D7] text-[#176B3A] font-semibold text-xs border border-[#A8E95B]/40 hover:bg-[#d8f4bc] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Line Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item, index) => {
            const expectedLineMath = Math.round(item.quantity * item.unit_price * 100) / 100;
            const hasCalcMismatch = item.amount !== expectedLineMath;

            return (
              <div
                key={index}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Line Item #{index + 1}
                  </span>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Remove line item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
                  <div className="lg:col-span-2">
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Service or Product Description"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:border-[#176B3A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      HSN / SAC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9965"
                      value={item.hsn_code || ''}
                      onChange={(e) => handleLineItemChange(index, 'hsn_code', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-[#176B3A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-[#176B3A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Unit Price (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={item.unit_price}
                      onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:border-[#176B3A]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Billed Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={item.amount}
                      onChange={(e) => handleLineItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-[#176B3A]"
                    />
                  </div>
                </div>

                {/* Arithmetic Guidance Bar */}
                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-600">
                      Calculated expected: <strong className="text-slate-900 font-bold">₹{expectedLineMath.toFixed(2)}</strong> ({item.quantity} × ₹{item.unit_price})
                    </span>
                    {hasCalcMismatch && (
                      <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-semibold">
                        Anomaly will be flagged: +₹{(item.amount - expectedLineMath).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span>GST Rate:</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={item.gst_rate ?? 18}
                      onChange={(e) => handleLineItemChange(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                      className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center font-mono text-xs"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Totals Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
          3. Stated Invoice Totals & Discrepancy Reconciliation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Billed Subtotal (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={billedSubtotal}
              onChange={(e) => setBilledSubtotal(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-[#176B3A]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Sum of lines: ₹{calculatedExpectedSubtotal.toFixed(2)}
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Billed GST Tax (₹)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={billedGstAmount}
              onChange={(e) => setBilledGstAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-[#176B3A]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Calculated GST: ₹{calculatedExpectedGst.toFixed(2)}
            </span>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1">
              Billed Grand Total (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={billedTotal}
              onChange={(e) => setBilledTotal(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-[#176B3A]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Calculated Grand Total: ₹{calculatedExpectedTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            * Billed figures are preserved as entered to test anomaly discovery rules.
          </p>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              Add to Batch Drawer
            </button>
            <button
              type="button"
              onClick={handleAuditImmediately}
              className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#176B3A] hover:bg-[#12542d] text-white text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Audit Invoice Immediately</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
