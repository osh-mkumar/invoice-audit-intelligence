'use client';

import React from 'react';
import { AuditBreakdown } from '@/types/audit';
import { formatCurrency, formatCategoryName, getIssueTypeBadge } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

interface OverchargeChartProps {
  breakdown: AuditBreakdown;
  selectedCategory: string | null;
  onSelectCategory: (categoryKey: string | null) => void;
}

export default function OverchargeChart({
  breakdown,
  selectedCategory,
  onSelectCategory,
}: OverchargeChartProps) {
  const data = [
    {
      key: 'duplicate_invoice',
      name: 'Duplicate Invoices',
      amount: breakdown.duplicate_invoices,
      color: '#f43f5e',
    },
    {
      key: 'gst_mismatch',
      name: 'GST Mismatches',
      amount: breakdown.gst_mismatches,
      color: '#f59e0b',
    },
    {
      key: 'calculation_error',
      name: 'Calculation Errors',
      amount: breakdown.calculation_errors,
      color: '#f97316',
    },
    {
      key: 'mystery_surcharge',
      name: 'Mystery Surcharges',
      amount: breakdown.mystery_surcharges,
      color: '#a855f7',
    },
    {
      key: 'subtotal_mismatch',
      name: 'Subtotal Mismatches',
      amount: breakdown.subtotal_mismatches,
      color: '#0ea5e9',
    },
    {
      key: 'rate_card_violation',
      name: 'Rate Card Violations',
      amount: breakdown.rate_card_violations,
      color: '#10b981',
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-950 border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
          <p className="font-bold text-slate-200">{item.name}</p>
          <p className="text-rose-400 font-semibold text-sm mt-1">
            Overcharge: {formatCurrency(item.amount)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-3 border-b border-slate-800 gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
            Overcharge Exposure by Category (₹)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Duplicate Invoices & GST Mismatches represent over 99% of total financial risk
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
            <span className="text-slate-300 font-medium">Duplicate Invoices (92.6%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
            <span className="text-slate-300 font-medium">GST Mismatches (6.8%)</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              stroke="#64748b"
              fontSize={11}
              tickFormatter={(val) =>
                val >= 1000000
                  ? `₹${(val / 1000000).toFixed(1)}M`
                  : val >= 1000
                  ? `₹${(val / 1000).toFixed(0)}k`
                  : `₹${val}`
              }
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#94a3b8"
              fontSize={12}
              width={140}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30, 41, 59, 0.5)' }} />
            <Bar
              dataKey="amount"
              radius={[0, 4, 4, 0]}
              onClick={(entry: any) => {
                const k = entry && entry.key ? String(entry.key) : null;
                onSelectCategory(selectedCategory === k ? null : k);
              }}
              className="cursor-pointer"
            >

              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={selectedCategory === null || selectedCategory === entry.key ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
