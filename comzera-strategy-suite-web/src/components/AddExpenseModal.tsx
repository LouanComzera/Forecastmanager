"use client";

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Company } from '@/types';
import { API_URL } from '@/lib/api';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companies: Company[];
}

export default function AddExpenseModal({ isOpen, onClose, onSuccess, companies }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    companyId: '',
    isPaid: false,
    isFixed: false
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyId) return alert("Please select a company");
    
    setLoading(true);
    try {
      const res = await fetch(API_URL.EXPENSES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          amount: parseFloat(formData.amount) || 0,
          date: new Date(formData.date).toISOString(),
          isPaid: formData.isPaid,
          isFixed: formData.isFixed,
          companyId: parseInt(formData.companyId)
        })
      });

      if (res.ok) {
        onSuccess();
        onClose();
        setFormData({ ...formData, description: '', amount: '' });
      }
    } catch (err) {
      console.error("Add expense failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden fade-in">
        <div className="p-6 border-b border-border flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-main">Add New Expense</h2>
          <button onClick={onClose} className="text-muted hover:text-main transition-colors"><X className="w-6 h-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted ml-1">Company</label>
            <select 
              required
              value={formData.companyId}
              onChange={(e) => setFormData({...formData, companyId: e.target.value})}
              className="bg-background border border-border rounded-xl p-3 text-main outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="">Select Company</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-muted ml-1">Description</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Office Rent"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="bg-background border border-border rounded-xl p-3 text-main outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-muted ml-1">Amount (R)</label>
              <input 
                required
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="bg-background border border-border rounded-xl p-3 text-main font-mono outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-muted ml-1">Date</label>
              <div className="relative flex items-center">
                <CalendarIcon className="absolute left-3 w-4 h-4 text-primary pointer-events-none" />
                <input 
                  required
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="bg-background border border-border rounded-xl p-3 pl-10 text-main outline-none focus:border-primary transition-all w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 mt-2 ml-1">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={formData.isPaid}
                onChange={(e) => setFormData({...formData, isPaid: e.target.checked})}
                className="w-5 h-5 rounded border-border bg-background checked:bg-primary transition-all cursor-pointer"
              />
              <span className="text-sm font-medium text-muted group-hover:text-main transition-colors">Mark as Paid</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={formData.isFixed}
                onChange={(e) => setFormData({...formData, isFixed: e.target.checked})}
                className="w-5 h-5 rounded border-border bg-background checked:bg-primary transition-all cursor-pointer"
              />
              <span className="text-sm font-medium text-muted group-hover:text-main transition-colors">Fixed (Recurring)</span>
            </label>
          </div>

          <div className="flex gap-4 mt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/5 border border-border text-main py-3 rounded-xl font-bold hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-glow hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
