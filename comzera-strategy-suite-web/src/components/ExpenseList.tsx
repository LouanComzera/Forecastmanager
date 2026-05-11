"use client";

import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Expense } from '@/types';
import { CheckCircle, Circle, Trash2 } from 'lucide-react';

interface ExpenseListProps {
  month: string;
  companyId?: string;
  onRefresh?: () => void;
}

export default function ExpenseList({ month, companyId, onRefresh }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = () => {
    setLoading(true);
    const companyParam = companyId && companyId !== 'all' ? `&companyId=${companyId}` : '';
    fetch(`http://localhost:5000/api/expenses?month=${month}${companyParam}`)
      .then(res => res.json())
      .then(d => {
        setExpenses(d);
        setLoading(false);
      })
      .catch(err => {
        console.error("Expenses fetch failed:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExpenses();
  }, [month, companyId]);

  const togglePaid = async (id: number) => {
    try {
      await fetch(`http://localhost:5000/api/expenses/${id}/toggle-paid`, { method: 'PUT' });
      fetchExpenses();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Toggle paid failed:", err);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await fetch(`http://localhost:5000/api/expenses/${id}`, { method: 'DELETE' });
      fetchExpenses();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted">Loading transactions...</div>;

  if (expenses.length === 0) return (
    <div className="p-20 text-center text-muted border border-dashed border-border rounded-2xl">
      No transactions found for this period.
    </div>
  );

  // Group by company
  const grouped = expenses.reduce((acc: any, exp) => {
    const compName = exp.company?.name || 'Uncategorized';
    if (!acc[compName]) acc[compName] = { items: [], total: 0 };
    acc[compName].items.push(exp);
    acc[compName].total += exp.amount;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 gap-6">
      {Object.keys(grouped).sort().map(company => (
        <div key={company} className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
          <div className="bg-white/5 px-6 py-4 flex justify-between items-center border-b border-border">
            <span className="font-bold text-primary">{company}</span>
            <span className="font-mono font-bold text-accent-red">{formatCurrency(grouped[company].total)}</span>
          </div>
          <div className="divide-y divide-border">
            {grouped[company].items.map((exp: Expense) => (
              <div key={exp.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-all ${exp.isPaid ? 'opacity-50' : ''}`}>
                <button 
                  onClick={() => togglePaid(exp.id)}
                  className={`transition-colors ${exp.isPaid ? 'text-accent-green' : 'text-muted hover:text-main'}`}
                >
                  {exp.isPaid ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <div className="flex-1">
                  <div className={`font-medium ${exp.isPaid ? 'line-through' : ''}`}>{exp.description}</div>
                  <div className="text-xs text-muted">{formatDate(exp.date)}</div>
                </div>
                <div className="font-mono font-semibold">{formatCurrency(exp.amount)}</div>
                <button 
                  onClick={() => deleteExpense(exp.id)}
                  className="text-muted hover:text-accent-red transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
