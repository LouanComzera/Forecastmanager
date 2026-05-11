"use client";

import React, { useEffect, useState } from 'react';
import { TrendingUp, Save, X, Loader2, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { API_URL } from '@/lib/api';

interface ForecastItem {
  id: number;
  description: string;
  amount: number;
  companyId: number;
  source: string;
}

interface ForecastingViewProps {
  month: string;
  companyId: string;
}

export default function ForecastingView({ month, companyId }: ForecastingViewProps) {
  const [items, setItems] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editData, setEditData] = useState({ amount: '', applyToFuture: false });
  const [year, monthInt] = month.split('-').map(Number);

  useEffect(() => {
    fetchForecast();
  }, [month, companyId]);

  const fetchForecast = async () => {
    setLoading(true);
    const companyParam = companyId && companyId !== 'all' ? `&companyId=${companyId}` : '';
    try {
      const res = await fetch(`${API_URL.BASE}/forecasting?year=${year}&month=${monthInt}${companyParam}`);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch forecast:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item: ForecastItem, idx: number) => {
    setEditingId(item.id || `new-${idx}`);
    setEditData({ amount: item.amount.toString(), applyToFuture: false });
  };

  const saveEdit = async (item: ForecastItem, idx: number) => {
    setLoading(true);
    try {
      let url = `${API_URL.BASE}/forecasting/${item.id}`;
      let method = 'PUT';
      
      // If it's a recurring item without a forecast record yet, we create one
      if (item.id === 0) {
        url = `${API_URL.BASE}/forecasting`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          description: item.description,
          amount: parseFloat(editData.amount),
          companyId: item.companyId,
          year: year,
          month: monthInt,
          applyToFuture: editData.applyToFuture
        })
      });

      if (res.ok) {
        setEditingId(null);
        fetchForecast();
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6 fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-2xl shadow-xl bg-gradient-to-br from-primary/10 to-transparent">
          <p className="text-sm font-medium text-muted mb-1">Projected Total</p>
          <h3 className="text-3xl font-bold text-primary font-mono">{formatCurrency(total)}</h3>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted">
            <TrendingUp className="w-4 h-4 text-primary" />
            Strategic projection for {new Date(year, monthInt-1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-border flex justify-between items-center bg-white/5">
          <h3 className="text-lg font-bold text-main flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Projected Expenses
          </h3>
          <p className="text-xs text-muted">Click an amount to edit & propagate</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-muted text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && !editingId ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 opacity-50" />
                    Calculating projection...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-muted">No projected expenses found.</td>
                </tr>
              ) : (
                items.map((item, idx) => {
                  const isEditing = editingId === (item.id || `new-${idx}`);
                  return (
                    <tr key={idx} className={`hover:bg-white/5 transition-all ${isEditing ? 'bg-primary/5' : ''}`}>
                      <td className="px-6 py-4 font-medium text-main">{item.description}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          item.source === 'Recurring' ? 'bg-primary/20 text-primary' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {item.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="number"
                                step="0.01"
                                autoFocus
                                value={editData.amount}
                                onChange={(e) => setEditData({...editData, amount: e.target.value})}
                                className="bg-background border border-primary rounded-lg p-2 text-right w-32 font-mono text-main outline-none"
                              />
                              <button onClick={() => saveEdit(item, idx)} className="p-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-all">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-2 bg-white/10 text-muted rounded-lg hover:bg-white/20 transition-all">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <span className="text-[10px] text-muted group-hover:text-primary transition-colors">Apply to all future months</span>
                              <input 
                                type="checkbox"
                                checked={editData.applyToFuture}
                                onChange={(e) => setEditData({...editData, applyToFuture: e.target.checked})}
                                className="w-3 h-3 rounded border-border bg-background checked:bg-primary"
                              />
                            </label>
                          </div>
                        ) : (
                          <button 
                            onClick={() => startEdit(item, idx)}
                            className="font-mono text-main font-bold hover:text-primary transition-all border-b border-dashed border-muted/30 hover:border-primary"
                          >
                            {formatCurrency(item.amount)}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && items.length > 0 && (
              <tfoot className="bg-white/5">
                <tr>
                  <td colSpan={2} className="px-6 py-4 font-bold text-main">Total Projected Outflow</td>
                  <td className="px-6 py-4 text-right font-mono text-xl font-bold text-primary">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
