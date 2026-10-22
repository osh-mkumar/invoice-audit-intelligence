'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Shield, Download, Check } from 'lucide-react';

interface CustomReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  customRateCard: Record<string, Record<string, number>>;
  customGstReference: Record<string, number>;
  onSaveReferences: (
    rateCard: Record<string, Record<string, number>>,
    gstRef: Record<string, number>
  ) => void;
}

export default function CustomReferenceModal({
  isOpen,
  onClose,
  customRateCard,
  customGstReference,
  onSaveReferences,
}: CustomReferenceModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'rate_cards' | 'gst'>('rate_cards');
  const [rateCards, setRateCards] = useState<Record<string, Record<string, number>>>(customRateCard);
  const [gstRef, setGstRef] = useState<Record<string, number>>(customGstReference);

  // New rate card item state
  const [newVendor, setNewVendor] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newContractPrice, setNewContractPrice] = useState<number>(100);

  // New GST reference state
  const [newHsn, setNewHsn] = useState('');
  const [newGstRate, setNewGstRate] = useState<number>(18);

  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleAddRateCardEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.trim() || !newItemDesc.trim()) return;

    const updated = { ...rateCards };
    const v = newVendor.trim();
    if (!updated[v]) updated[v] = {};
    updated[v][newItemDesc.trim()] = Number(newContractPrice);

    setRateCards(updated);
    setNewItemDesc('');
  };

  const handleRemoveRateCardEntry = (vendor: string, itemDesc: string) => {
    const updated = { ...rateCards };
    if (updated[vendor]) {
      delete updated[vendor][itemDesc];
      if (Object.keys(updated[vendor]).length === 0) {
        delete updated[vendor];
      }
    }
    setRateCards(updated);
  };

  const handleAddGstEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHsn.trim()) return;
    setGstRef({
      ...gstRef,
      [newHsn.trim()]: Number(newGstRate),
    });
    setNewHsn('');
  };

  const handleRemoveGstEntry = (hsn: string) => {
    const updated = { ...gstRef };
    delete updated[hsn];
    setGstRef(updated);
  };

  const handleSaveAndApply = () => {
    onSaveReferences(rateCards, gstRef);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Shield className="w-4 h-4 text-[#176B3A]" />
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Manage Custom Rate Cards & GST References
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center space-x-4 text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('rate_cards')}
            className={`pb-3 border-b-2 transition-all ${
              activeSubTab === 'rate_cards'
                ? 'border-[#176B3A] text-[#176B3A]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Vendor Rate Cards ({Object.keys(rateCards).length})
          </button>
          <button
            onClick={() => setActiveSubTab('gst')}
            className={`pb-3 border-b-2 transition-all ${
              activeSubTab === 'gst'
                ? 'border-[#176B3A] text-[#176B3A]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Statutory GST References ({Object.keys(gstRef).length})
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {activeSubTab === 'rate_cards' ? (
            <div className="space-y-4">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Add agreed contracted unit pricing for new suppliers or supplemental items. The audit engine uses these prices to catch price inflation and unauthorized mystery surcharges.
              </p>

              {/* Add form */}
              <form onSubmit={handleAddRateCardEntry} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">Add Contracted Rate</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Vendor Name"
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Item / Service Name"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="Contracted ₹"
                      value={newContractPrice}
                      onChange={(e) => setNewContractPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#176B3A] text-white font-semibold rounded-lg shrink-0 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Existing list */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {Object.keys(rateCards).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No custom rate cards added yet. Default repository rate cards will be used where applicable.
                  </div>
                ) : (
                  Object.entries(rateCards).map(([vName, items]) => (
                    <div key={vName} className="p-3 bg-white space-y-1.5">
                      <div className="font-bold text-slate-900 text-xs">{vName}</div>
                      <div className="space-y-1 pl-2">
                        {Object.entries(items).map(([desc, price]) => (
                          <div key={desc} className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>{desc}</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-slate-900">₹{price.toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRateCardEntry(vName, desc)}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Add statutory GST percentage rates for specific HSN or SAC codes. Invoices with different GST rates applied to these codes will be flagged as tax mismatches.
              </p>

              {/* Add form */}
              <form onSubmit={handleAddGstEntry} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <span className="font-bold text-slate-800 block text-xs">Add Statutory HSN Rate</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="HSN / SAC Code (e.g. 9983)"
                    value={newHsn}
                    onChange={(e) => setNewHsn(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    required
                    placeholder="Statutory GST Rate %"
                    value={newGstRate}
                    onChange={(e) => setNewGstRate(parseFloat(e.target.value) || 0)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#176B3A] text-white font-semibold rounded-lg flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add HSN Rule</span>
                  </button>
                </div>
              </form>

              {/* Existing list */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                {Object.keys(gstRef).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No custom GST reference rules added. Baseline statutory GST references will apply.
                  </div>
                ) : (
                  <div className="p-3 bg-white divide-y divide-slate-100">
                    {Object.entries(gstRef).map(([hsn, rate]) => (
                      <div key={hsn} className="py-1.5 flex items-center justify-between text-[11px] text-slate-600">
                        <span className="font-mono font-bold text-slate-900">HSN: {hsn}</span>
                        <div className="flex items-center space-x-3">
                          <span className="font-mono text-slate-800">{rate}% GST</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveGstEntry(hsn)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2">
            <a
              href="/templates/sample_custom_references.json"
              download="sample_custom_references.json"
              className="inline-flex items-center space-x-1.5 text-[11px] text-[#176B3A] hover:underline font-semibold"
            >
              <Download className="w-3 h-3" />
              <span>Download sample reference format JSON</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[11px] text-slate-400">
            {savedNotice ? (
              <span className="text-[#176B3A] font-bold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Reference data applied!</span>
              </span>
            ) : (
              'Changes will be included in the next audit run'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApply}
              className="px-4 py-1.5 rounded-lg bg-[#176B3A] hover:bg-[#12542d] text-white text-xs font-semibold shadow-xs"
            >
              Save & Apply References
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
