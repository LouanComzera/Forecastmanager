"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, Building2, Loader2 } from 'lucide-react';
import { Company } from '@/types';
import { API_URL } from '@/lib/api';

export default function SettingsView() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [fyStartMonth, setFyStartMonth] = useState('03'); // Default March
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
    const savedMonth = localStorage.getItem('fyStartMonth');
    if (savedMonth) setFyStartMonth(savedMonth);
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch(API_URL.COMPANIES);
      const data = await res.json();
      setCompanies(data);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(API_URL.COMPANIES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCompanyName })
      });
      if (res.ok) {
        setNewCompanyName('');
        fetchCompanies();
      }
    } catch (err) {
      console.error("Failed to add company:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteCompany = async (id: number) => {
    if (!confirm("Are you sure? This will delete all expenses for this company.")) return;
    try {
      await fetch(`${API_URL.COMPANIES}/${id}`, { method: 'DELETE' });
      fetchCompanies();
    } catch (err) {
      console.error("Failed to delete company:", err);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('fyStartMonth', fyStartMonth);
    alert("Settings saved!");
  };

  return (
    <div className="space-y-8 fade-in max-w-4xl">
      {/* FY Settings */}
      <section className="bg-card border border-border p-8 rounded-2xl shadow-xl">
        <h3 className="text-xl font-bold text-main mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> General Settings
        </h3>
        <div className="flex flex-col gap-4 max-w-sm">
          <label className="text-sm font-semibold text-muted">Financial Year Start Month</label>
          <select 
            value={fyStartMonth}
            onChange={(e) => setFyStartMonth(e.target.value)}
            className="bg-background border border-border rounded-xl p-3 text-main outline-none focus:border-primary transition-all cursor-pointer"
          >
            <option value="01">January</option>
            <option value="02">February</option>
            <option value="03">March</option>
            <option value="04">April</option>
            <option value="05">May</option>
            <option value="06">June</option>
            <option value="07">July</option>
            <option value="08">August</option>
            <option value="09">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>
          <button 
            onClick={saveSettings}
            className="bg-primary text-white py-3 rounded-xl font-bold shadow-glow hover:bg-primary-hover transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Save className="w-5 h-5" /> Save General Settings
          </button>
        </div>
      </section>

      {/* Company Management */}
      <section className="bg-card border border-border p-8 rounded-2xl shadow-xl">
        <h3 className="text-xl font-bold text-main mb-6 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" /> Company Management
        </h3>
        
        <form onSubmit={handleAddCompany} className="flex gap-4 mb-8">
          <input 
            type="text" 
            placeholder="New Company Name"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            className="flex-1 bg-background border border-border rounded-xl p-3 text-main outline-none focus:border-primary transition-all"
          />
          <button 
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-6 rounded-xl font-bold shadow-glow hover:bg-primary-hover transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Add Company
          </button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {companies.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl hover:border-primary/50 transition-all group">
              <span className="font-bold text-main">{c.name}</span>
              <button 
                onClick={() => deleteCompany(c.id)}
                className="text-muted hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
