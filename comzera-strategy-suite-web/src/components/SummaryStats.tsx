"use client";

import React, { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { API_URL } from '@/lib/api';

interface SummaryData {
  totalExpenses: number;
  expenseCount: number;
  pendingTotal: number;
  pendingCount: number;
}

interface SummaryStatsProps {
  month: string;
  companyId?: string;
}

export default function SummaryStats({ month, companyId }: SummaryStatsProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const companyParam = companyId && companyId !== 'all' ? `&companyId=${companyId}` : '';
    fetch(`${API_URL.SUMMARY}?month=${month}${companyParam}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Summary fetch failed:", err);
        setLoading(false);
      });
  }, [month, companyId]);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-card h-32 rounded-2xl border border-border" />
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="text-sm font-medium text-muted mb-2">Total Expenses</div>
        <div className="text-3xl font-bold tracking-tight text-main">
          {formatCurrency(data?.totalExpenses || 0)}
        </div>
        <div className="text-xs text-muted mt-2">{data?.expenseCount || 0} transactions</div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="text-sm font-medium text-muted mb-2">Pending Total</div>
        <div className="text-3xl font-bold tracking-tight text-accent-red">
          {formatCurrency(data?.pendingTotal || 0)}
        </div>
        <div className="text-xs text-muted mt-2">{data?.pendingCount || 0} unpaid items</div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl backdrop-blur-md">
        <div className="text-sm font-medium text-muted mb-2">Payment Completion</div>
        <div className="text-3xl font-bold tracking-tight text-accent-green">
          {data && data.totalExpenses > 0 
            ? `${Math.round(((data.totalExpenses - data.pendingTotal) / data.totalExpenses) * 100)}%`
            : '100%'}
        </div>
        <div className="text-xs text-muted mt-2">of monthly target</div>
      </div>
    </div>
  );
}
