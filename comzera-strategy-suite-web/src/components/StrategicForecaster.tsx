"use client";

import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Download, Upload, Percent, DollarSign, ChevronRight, ChevronLeft, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { API_URL } from '@/lib/api';

interface ForecastLine {
  id: number;
  description: string;
  section: string;
  baseAmount: number;
  escalationPercent: number;
  values: { year: number; month: number; amount: number }[];
}

interface StrategicForecasterProps {
  companyId: string;
}

export default function StrategicForecaster({ companyId }: StrategicForecasterProps) {
  const [lines, setLines] = useState<ForecastLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [durationYears, setDurationYears] = useState(3);
  const [globalEscalation, setGlobalEscalation] = useState(5);
  const [viewType, setViewType] = useState('monthly'); // 'monthly' or 'yearly'
  
  // Grid range (e.g., MAR 2026 - FEB 2027)
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(3); // Default March (FY start)

  useEffect(() => {
    if (companyId && companyId !== 'all') {
      fetchLines();
    }
  }, [companyId]);

  const fetchLines = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL.BASE}/strategicforecasting?companyId=${companyId}`);
      const data = await res.json();
      setLines(data);
    } catch (err) {
      console.error("Failed to fetch forecast lines:", err);
    } finally {
      setLoading(false);
    }
  };

  const getMonths = () => {
    const months = [];
    const date = new Date(startYear, startMonth - 1, 1);
    const totalMonths = durationYears * 12;
    for (let i = 0; i < totalMonths; i++) {
      months.push({
        label: date.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' }).toUpperCase(),
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });
      date.setMonth(date.getMonth() + 1);
    }
    return months;
  };

  const months = getMonths();

  const handleValueChange = async (lineId: number, year: number, month: number, amount: number, applyToFuture: boolean) => {
    // 1. Update local state immediately for responsiveness
    const newLines = [...lines];
    const line = newLines.find(l => l.id === lineId);
    if (!line) return;

    const updateAllFuture = (currentYear: number, currentMonth: number, newAmount: number) => {
        const startIndex = months.findIndex(m => m.year === currentYear && m.month === currentMonth);
        for (let i = startIndex; i < months.length; i++) {
            const m = months[i];
            const valIdx = line.values.findIndex(v => v.year === m.year && v.month === m.month);
            if (valIdx > -1) line.values[valIdx].amount = newAmount;
            else line.values.push({ year: m.year, month: m.month, amount: newAmount });
        }
    };

    if (applyToFuture) {
        updateAllFuture(year, month, amount);
    } else {
        const valIdx = line.values.findIndex(v => v.year === year && v.month === month);
        if (valIdx > -1) line.values[valIdx].amount = amount;
        else line.values.push({ year, month, amount });
    }
    setLines(newLines);

    // 2. Persist to backend
    try {
        await fetch(`${API_URL.BASE}/strategicforecasting/bulk-update-values`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(line.values)
        });
    } catch (err) {
        console.error("Save failed:", err);
    }
  };

  const renderSection = (title: string, sectionKey: string) => {
    const sectionLines = lines.filter(l => l.section === sectionKey);
    
    return (
      <div className="mb-12">
        <div className="bg-white/5 border-b border-border p-4 flex justify-between items-center rounded-t-2xl">
          <h3 className="text-xl font-bold text-main">{title}</h3>
          <span className="text-[10px] uppercase font-bold text-muted tracking-widest">Monthly Projection</span>
        </div>
        <div className="overflow-x-auto bg-card border-x border-b border-border rounded-b-2xl shadow-2xl">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 text-muted text-[10px] uppercase tracking-tighter border-b border-border">
                <th className="px-6 py-4 font-bold min-w-[200px]">Line Item</th>
                <th className="px-4 py-4 font-bold text-center">Base Amount</th>
                <th className="px-4 py-4 font-bold text-center">Esc %</th>
                {months.map((m, i) => (
                  <th key={i} className="px-4 py-4 font-bold text-center min-w-[100px] border-l border-border/50">{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sectionLines.map(line => (
                <tr key={line.id} className="hover:bg-white/5 transition-all">
                  <td className="px-6 py-4 font-bold text-main">{line.description}</td>
                  <td className="px-4 py-4">
                    <input 
                      type="number" 
                      defaultValue={line.baseAmount}
                      className="bg-transparent border border-transparent hover:border-primary/30 rounded p-1 w-full text-center outline-none focus:border-primary font-mono text-muted"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <input 
                      type="number" 
                      defaultValue={line.escalationPercent}
                      className="bg-transparent border border-transparent hover:border-primary/30 rounded p-1 w-full text-center outline-none focus:border-primary font-mono text-muted"
                    />
                  </td>
                  {months.map((m, i) => {
                    // Calculate which fiscal year we are in (0-indexed)
                    const monthIndex = i;
                    const fiscalYearIndex = Math.floor(monthIndex / 12);
                    
                    // Base calculation with compounded escalation
                    const escalatedBase = line.baseAmount * Math.pow(1 + (line.escalationPercent / 100), fiscalYearIndex);
                    
                    // Check for manual override
                    const override = line.values.find(v => v.year === m.year && v.month === m.month);
                    const val = override ? override.amount : escalatedBase;

                    return (
                      <td key={i} className="px-2 py-4 border-l border-border/50 group relative">
                        <input 
                          type="number"
                          value={Math.round(val)}
                          onChange={(e) => {
                            const newAmount = parseFloat(e.target.value);
                            handleValueChange(line.id, m.year, m.month, newAmount, false);
                          }}
                          className={`bg-transparent w-full text-center font-mono font-bold outline-none border-b border-transparent hover:border-primary/50 focus:border-primary ${val > 0 ? 'text-emerald-400' : 'text-muted/50'}`}
                        />
                        <button 
                          onClick={() => handleValueChange(line.id, m.year, m.month, val, true)}
                          title="Apply to all future months"
                          className="absolute bottom-0 right-0 p-1 opacity-0 group-hover:opacity-100 hover:text-primary transition-all scale-75"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Add row button */}
              <tr className="border-t border-border bg-white/[0.02]">
                <td colSpan={months.length + 3} className="p-2">
                  <button className="flex items-center gap-2 text-[10px] uppercase font-bold text-primary hover:text-primary-hover p-2 rounded-lg transition-all ml-4">
                    <Plus className="w-3 h-3" /> Add {title} Item
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <h2 className="text-3xl font-bold text-main tracking-tight">Strategic Forecasting</h2>
        
        <div className="flex flex-wrap items-center gap-4 bg-card border border-border p-2 rounded-2xl shadow-xl">
          <div className="flex p-1 bg-white/5 rounded-xl border border-border">
            <button 
              onClick={() => setViewType('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'monthly' ? 'bg-primary text-white shadow-glow' : 'text-muted'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setViewType('yearly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewType === 'yearly' ? 'bg-primary text-white shadow-glow' : 'text-muted'}`}
            >
              Yearly
            </button>
          </div>
          
          <div className="flex items-center gap-3 px-4 border-l border-border">
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-bold text-muted">Duration (Years)</span>
              <input type="number" value={durationYears} onChange={e => setDurationYears(parseInt(e.target.value))} className="bg-transparent text-sm font-bold text-primary w-8 outline-none" />
            </div>
            <div className="flex flex-col border-l border-border/50 pl-4">
              <span className="text-[8px] uppercase font-bold text-muted">Global Escalation %</span>
              <input type="number" value={globalEscalation} onChange={e => setGlobalEscalation(parseInt(e.target.value))} className="bg-transparent text-sm font-bold text-primary w-8 outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button className="flex items-center gap-2 bg-white/5 border border-border text-main px-5 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-all text-xs">
          <TrendingUp className="w-4 h-4" /> Import Sales
        </button>
        <button className="flex items-center gap-2 bg-white/5 border border-border text-main px-5 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-all text-xs">
          <Download className="w-4 h-4" /> Import COS
        </button>
        <button className="flex items-center gap-2 bg-white/5 border border-border text-main px-5 py-2.5 rounded-xl font-bold hover:bg-white/10 transition-all text-xs">
          <Upload className="w-4 h-4" /> Import Expenses
        </button>
        <button className="flex-1"></button>
        <button className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold shadow-glow hover:bg-primary-hover transition-all active:scale-95 text-xs">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Grid Sections */}
      <div className="space-y-12">
        {renderSection("Sales / Revenue", "Sales")}
        {renderSection("Cost of Sales", "COS")}
        {renderSection("Expenses", "Expenses")}
      </div>
    </div>
  );
}
