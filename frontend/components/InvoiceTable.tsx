'use client';

import React, { useState, useMemo } from 'react';
import { FlaggedInvoice } from '@/types/audit';
import { formatCurrency, getIssueTypeBadge } from '@/lib/utils';
import { Search, Filter } from 'lucide-react';

interface InvoiceTableProps {
  invoices: FlaggedInvoice[];
  onSelectInvoice: (inv: FlaggedInvoice) => void;
  selectedCategoryFilter: string | null;
  onSelectCategoryFilter: (cat: string | null) => void;
}

export default function InvoiceTable({
  invoices,
  onSelectInvoice,
  selectedCategoryFilter,
  onSelectCategoryFilter,
}: InvoiceTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const categories = [
    { label: 'All Issues', value: null },
    { label: 'Duplicate Invoice', value: 'duplicate_invoice' },
    { label: 'GST Mismatch', value: 'gst_mismatch' },
    { label: 'Calculation Error', value: 'calculation_error' },
    { label: 'Mystery Surcharge', value: 'mystery_surcharge' },
    { label: 'Subtotal Mismatch', value: 'subtotal_mismatch' },
    { label: 'Rate Card Violation', value: 'rate_card_violation' },
  ];

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (selectedCategoryFilter) {
        const hasType = inv.issues.some((i) => i.issue_type === selectedCategoryFilter);
        if (!hasType) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchId = inv.invoice_id.toLowerCase().includes(query);
        const matchVendor = inv.vendor_name.toLowerCase().includes(query);
        if (!matchId && !matchVendor) return false;
      }
      return true;
    });
  }, [invoices, selectedCategoryFilter, searchQuery]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  const handleFilterChange = (val: string | null) => {
    onSelectCategoryFilter(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
      {/* Table Controls Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Invoices requiring attention
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredInvoices.length} invoices contain one or more detected billing anomalies.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Invoice ID or Vendor..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300/80 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#176B3A] transition-colors"
            />
          </div>
        </div>

        {/* Filter Pills with Lime Accent */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {categories.map((cat) => {
            const isSelected = selectedCategoryFilter === cat.value;
            return (
              <button
                key={cat.label}
                onClick={() => handleFilterChange(cat.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#EAF8D7] text-[#176B3A] font-semibold border border-[#A8E95B]/40 shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200/80 tracking-wider">
            <tr>
              <th className="py-2.5 px-4">Invoice</th>
              <th className="py-2.5 px-4">Vendor</th>
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-4">Issues</th>
              <th className="py-2.5 px-4 text-right">Invoice Total</th>
              <th className="py-2.5 px-4 text-right">Exposure</th>
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                  No invoices match the selected filter.
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((inv) => (
                <tr
                  key={inv.invoice_id}
                  onClick={() => onSelectInvoice(inv)}
                  className="hover:bg-[#F3FCE8]/40 cursor-pointer transition-colors group"
                >
                  {/* Invoice ID */}
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900 group-hover:text-[#176B3A] group-hover:underline">
                    {inv.invoice_id}
                  </td>

                  {/* Vendor */}
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    {inv.vendor_name}
                  </td>

                  {/* Date */}
                  <td className="py-2.5 px-4 font-mono text-slate-500">
                    {inv.invoice_date}
                  </td>

                  {/* Issues */}
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {inv.issues.map((issue, i) => {
                        const badge = getIssueTypeBadge(issue.issue_type);
                        return (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                        );
                      })}
                    </div>
                  </td>

                  {/* Invoice Total */}
                  <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                    {formatCurrency(inv.total)}
                  </td>

                  {/* Exposure */}
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-red-600">
                    {formatCurrency(inv.total_overcharge)}
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                      Review
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <span>
          Page <strong className="text-slate-900">{currentPage}</strong> of{' '}
          <strong className="text-slate-900">{totalPages}</strong> ({filteredInvoices.length} invoices)
        </span>

        <div className="flex items-center space-x-1.5">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
          >
            Prev
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
