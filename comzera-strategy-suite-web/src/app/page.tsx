"use client";

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  Settings, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  Calendar,
  LogOut
} from 'lucide-react';
import { Company } from '@/types';
import SummaryStats from '@/components/SummaryStats';
import ExpenseList from '@/components/ExpenseList';
import AddExpenseModal from '@/components/AddExpenseModal';
import { getYearMonth } from '@/lib/utils';
import { API_URL } from '@/lib/api';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState('summary');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(getYearMonth(new Date()));
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    fetch(API_URL.COMPANIES)
      .then(res => res.json())
      .then(data => setCompanies(data))
      .catch(err => console.error("Failed to fetch companies:", err));
  }, [refreshKey]);

  const changeMonth = (offset: number) => {
    const date = new Date(currentMonth + '-01');
    date.setMonth(date.getMonth() + offset);
    setCurrentMonth(getYearMonth(date));
  };

  const monthName = new Date(currentMonth + '-01').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-main">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-border flex flex-col z-[100]">
        <div className="p-6 flex items-center gap-3 font-bold text-xl text-primary border-b border-border">
          <TrendingUp className="w-6 h-6" />
          <span>Strategy Suite</span>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <div className="text-[0.7rem] font-semibold uppercase text-muted tracking-wider mb-2 ml-3">Navigation</div>
          
          <button 
            onClick={() => setCurrentView('summary')}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === 'summary' ? 'bg-primary text-white shadow-glow' : 'text-muted hover:bg-white/5 hover:text-main'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>

          <button 
            onClick={() => setCurrentView('expenses')}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === 'expenses' ? 'bg-primary text-white shadow-glow' : 'text-muted hover:bg-white/5 hover:text-main'}`}
          >
            <Receipt className="w-5 h-5" />
            <span className="font-medium">Expenses</span>
          </button>

          <button 
            onClick={() => setCurrentView('forecasting')}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === 'forecasting' ? 'bg-primary text-white shadow-glow' : 'text-muted hover:bg-white/5 hover:text-main'}`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="font-medium">Forecasting</span>
          </button>

          <button 
            onClick={() => setCurrentView('settings')}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${currentView === 'settings' ? 'bg-primary text-white shadow-glow' : 'text-muted hover:bg-white/5 hover:text-main'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>

          <div className="mt-8 text-[0.7rem] font-semibold uppercase text-muted tracking-wider mb-4 ml-3">Month Selector</div>
          <div className="flex items-center justify-between bg-card border border-border p-1 rounded-lg mx-2 mb-8">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/5 rounded text-muted"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[0.75rem] font-bold text-main">{monthName}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/5 rounded text-muted"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <div className="text-[0.7rem] font-semibold uppercase text-muted tracking-wider mb-2 ml-3">Filter by Company</div>
          <select 
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-card border border-border text-main text-sm rounded-lg p-2 outline-none mx-2 mb-4 cursor-pointer hover:border-primary transition-all"
          >
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted text-center">Comzera Group v1.5.0</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-background sticky top-0 z-50">
          <div>
            <h1 className="text-2xl font-bold capitalize text-main tracking-tight">{currentView}</h1>
            <p className="text-xs text-muted font-medium">{monthName}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-glow hover:bg-primary-hover transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" /> Add Expense
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scroll-smooth bg-[#0a0f1d]">
          <div className="max-w-6xl mx-auto">
            <SummaryStats key={`stats-${refreshKey}-${currentMonth}-${selectedCompany}`} month={currentMonth} companyId={selectedCompany} />
            
            <div className="fade-in mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-main flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> 
                  {selectedCompany === 'all' ? 'All Transactions' : 'Company Transactions'}
                </h2>
              </div>
              <ExpenseList 
                key={`list-${refreshKey}-${currentMonth}-${selectedCompany}`} 
                month={currentMonth} 
                companyId={selectedCompany} 
                onRefresh={triggerRefresh} 
              />
            </div>
          </div>
        </div>

        <AddExpenseModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={triggerRefresh}
          companies={companies}
        />
      </main>
    </div>
  );
}
