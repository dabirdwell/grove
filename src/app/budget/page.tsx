'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Trash2,
  TreePine,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AppHeader } from '@/components/navigation';
import dynamic from 'next/dynamic';

// Dynamic import for 3D tree (avoid SSR)
const MoneyTree3D = dynamic(
  () => import('@/components/money-tree-3d').then(mod => mod.MoneyTree3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-3 h-3 rounded-full mx-auto mb-2 animate-pulse" style={{ backgroundColor: 'var(--primary)' }} />
          <p className="text-xs" style={{ color: 'var(--primary)', opacity: 0.7 }}>Growing...</p>
        </div>
      </div>
    ),
  }
);

// ─── TYPES ───────────────────────────────────────────────────────────────

interface BudgetCategory {
  id: string;
  name: string;
  emoji: string;
  budget: number;
  color: string;
}

interface SpendingEntry {
  id: string;
  categoryId: string;
  amount: number;
  note: string;
  timestamp: number;
}

interface MonthData {
  income: number;
  entries: SpendingEntry[];
  budgets: Record<string, number>; // categoryId -> budget override
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: BudgetCategory[] = [
  { id: 'housing',        name: 'Housing',        emoji: '🏠', budget: 1500, color: '#4FD1C5' },
  { id: 'food',           name: 'Food',           emoji: '🛒', budget: 600,  color: '#64FFDA' },
  { id: 'transportation', name: 'Transport',      emoji: '🚗', budget: 400,  color: '#81E6D9' },
  { id: 'healthcare',     name: 'Healthcare',     emoji: '💊', budget: 200,  color: '#7E57C2' },
  { id: 'utilities',      name: 'Utilities',      emoji: '⚡', budget: 250,  color: '#4FC3F7' },
  { id: 'entertainment',  name: 'Fun',            emoji: '🎉', budget: 200,  color: '#FFD93D' },
  { id: 'savings',        name: 'Savings',        emoji: '💰', budget: 500,  color: '#66BB6A' },
  { id: 'other',          name: 'Other',          emoji: '📦', budget: 200,  color: '#FF6B6B' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── HELPERS ─────────────────────────────────────────────────────────────

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
  return '$' + Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatCurrencyExact(amount: number): string {
  return '$' + amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function loadMonthData(key: string): MonthData {
  try {
    const raw = localStorage.getItem(`grove-budget-${key}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { income: 4000, entries: [], budgets: {} };
}

function saveMonthData(key: string, data: MonthData) {
  try {
    localStorage.setItem(`grove-budget-${key}`, JSON.stringify(data));
  } catch { /* ignore */ }
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [monthData, setMonthData] = useState<MonthData>({ income: 4000, entries: [], budgets: {} });
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [showTree, setShowTree] = useState(false);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const incomeInputRef = useRef<HTMLInputElement>(null);

  const key = monthKey(selectedDate);
  const monthLabel = `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  // Load data when month changes
  useEffect(() => {
    setMonthData(loadMonthData(key));
    setActiveCategory(null);
    setShowHistory(null);
  }, [key]);

  // Save on changes
  useEffect(() => {
    saveMonthData(key, monthData);
  }, [key, monthData]);

  // Focus amount input when category selected
  useEffect(() => {
    if (activeCategory && amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, [activeCategory]);

  useEffect(() => {
    if (editingIncome && incomeInputRef.current) {
      incomeInputRef.current.focus();
    }
  }, [editingIncome]);

  // ─── Derived state ──────────────────────────────────────────────────

  const categories = useMemo(() => {
    return DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      budget: monthData.budgets[cat.id] ?? cat.budget,
    }));
  }, [monthData.budgets]);

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of DEFAULT_CATEGORIES) map[cat.id] = 0;
    for (const entry of monthData.entries) {
      map[entry.categoryId] = (map[entry.categoryId] || 0) + entry.amount;
    }
    return map;
  }, [monthData.entries]);

  const totalBudget = useMemo(
    () => categories.reduce((sum, c) => sum + c.budget, 0),
    [categories]
  );

  const totalSpent = useMemo(
    () => Object.values(spentByCategory).reduce((sum, v) => sum + v, 0),
    [spentByCategory]
  );

  const remaining = monthData.income - totalSpent;

  // Health score: 100 when 0% spent, 0 when 100%+ spent, weighted by category overages
  const healthScore = useMemo(() => {
    if (totalBudget === 0) return 50;
    let score = 100;
    for (const cat of categories) {
      const spent = spentByCategory[cat.id] || 0;
      if (cat.budget > 0) {
        const ratio = spent / cat.budget;
        if (ratio > 1) {
          // Penalize overages proportional to budget weight
          const weight = cat.budget / totalBudget;
          score -= (ratio - 1) * weight * 100;
        }
      }
    }
    // Also factor in overall spending vs income
    const overallRatio = totalSpent / monthData.income;
    if (overallRatio > 1) score -= (overallRatio - 1) * 50;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [categories, spentByCategory, totalBudget, totalSpent, monthData.income]);

  // Tree branches from categories
  const treeBranches = useMemo(() => {
    return categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      amount: spentByCategory[cat.id] || 0,
      percentage: totalBudget > 0 ? (cat.budget / totalBudget) * 100 : 12.5,
      color: cat.color,
    }));
  }, [categories, spentByCategory, totalBudget]);

  // ─── Actions ────────────────────────────────────────────────────────

  const prevMonth = useCallback(() => {
    setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  const addEntry = useCallback(() => {
    if (!activeCategory || !entryAmount) return;
    const amount = parseFloat(entryAmount);
    if (isNaN(amount) || amount <= 0) return;

    const entry: SpendingEntry = {
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      categoryId: activeCategory,
      amount,
      note: entryNote.trim(),
      timestamp: Date.now(),
    };

    setMonthData(prev => ({
      ...prev,
      entries: [...prev.entries, entry],
    }));
    setEntryAmount('');
    setEntryNote('');
    setActiveCategory(null);
  }, [activeCategory, entryAmount, entryNote]);

  const deleteEntry = useCallback((entryId: string) => {
    setMonthData(prev => ({
      ...prev,
      entries: prev.entries.filter(e => e.id !== entryId),
    }));
  }, []);

  const updateIncome = useCallback(() => {
    const val = parseFloat(incomeInput);
    if (!isNaN(val) && val >= 0) {
      setMonthData(prev => ({ ...prev, income: val }));
    }
    setEditingIncome(false);
  }, [incomeInput]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="mx-auto max-w-lg px-4 pt-4 pb-24">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            aria-label="Previous month"
            className="min-w-[44px] min-h-[44px]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">{monthLabel}</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            aria-label="Next month"
            className="min-w-[44px] min-h-[44px]"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Top summary card */}
        <Card className="mb-4 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Remaining</p>
                <p
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: remaining >= 0 ? 'var(--primary)' : 'var(--destructive)' }}
                >
                  {remaining < 0 ? '-' : ''}{formatCurrency(remaining)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTree(t => !t)}
                aria-label={showTree ? 'Hide tree' : 'Show tree'}
                className="min-w-[44px] min-h-[44px]"
              >
                <TreePine
                  className="h-5 w-5"
                  style={{ color: showTree ? 'var(--primary)' : undefined }}
                />
              </Button>
            </div>

            {/* Income / Spent / Budget row */}
            <div className="flex gap-4 text-sm">
              <button
                type="button"
                onClick={() => {
                  setIncomeInput(String(monthData.income));
                  setEditingIncome(true);
                }}
                className="text-left flex-1 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors"
              >
                <span className="text-muted-foreground block text-xs">Income</span>
                <span className="font-semibold tabular-nums">{formatCurrency(monthData.income)}</span>
              </button>
              <div className="flex-1 px-2 py-1.5">
                <span className="text-muted-foreground block text-xs">Spent</span>
                <span className="font-semibold tabular-nums">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="flex-1 px-2 py-1.5">
                <span className="text-muted-foreground block text-xs">Budgeted</span>
                <span className="font-semibold tabular-nums">{formatCurrency(totalBudget)}</span>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="mt-3">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (totalSpent / monthData.income) * 100)}%`,
                    backgroundColor: totalSpent > monthData.income ? 'var(--destructive)' : 'var(--primary)',
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right tabular-nums">
                {Math.round((totalSpent / monthData.income) * 100)}% of income
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Income edit overlay */}
        {editingIncome && (
          <Card className="mb-4 border-primary/30">
            <CardContent className="p-4">
              <label className="text-sm font-medium mb-2 block">Monthly Income</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <input
                    ref={incomeInputRef}
                    type="number"
                    inputMode="decimal"
                    value={incomeInput}
                    onChange={e => setIncomeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') updateIncome(); }}
                    className="w-full h-11 rounded-md border bg-muted pl-7 pr-3 text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <Button onClick={updateIncome} className="h-11 px-5">Save</Button>
                <Button variant="ghost" size="icon" onClick={() => setEditingIncome(false)} className="h-11 w-11">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tree mini-view */}
        {showTree && (
          <Card className="mb-4 overflow-hidden">
            <CardContent className="p-0">
              <div className="h-[280px] relative">
                <MoneyTree3D
                  branches={treeBranches}
                  totalIncome={monthData.income}
                  healthScore={healthScore}
                  autoRotate
                />
                {/* Health badge */}
                <div
                  className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                  style={{
                    backgroundColor: 'rgba(10, 22, 40, 0.8)',
                    color: healthScore >= 70 ? 'var(--primary)' : healthScore >= 40 ? 'var(--chart-3)' : 'var(--destructive)',
                  }}
                >
                  {healthScore >= 70 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {healthScore}%
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {categories.map(cat => {
            const spent = spentByCategory[cat.id] || 0;
            const pct = cat.budget > 0 ? Math.min(100, (spent / cat.budget) * 100) : 0;
            const over = spent > cat.budget;
            const isActive = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  if (isActive) {
                    setActiveCategory(null);
                  } else {
                    setActiveCategory(cat.id);
                    setEntryAmount('');
                    setEntryNote('');
                    setShowHistory(null);
                  }
                }}
                className={`rounded-xl p-3 text-left transition-all border ${
                  isActive
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border bg-card hover:border-border/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg" role="img" aria-label={cat.name}>{cat.emoji}</span>
                  {over && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">
                      OVER
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{cat.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(spent)} / {formatCurrency(cat.budget)}
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: over ? 'var(--destructive)' : cat.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick-add panel (shown when category selected) */}
        {activeCategory && (
          <Card className="mb-4 border-primary/30">
            <CardContent className="p-4">
              {(() => {
                const cat = categories.find(c => c.id === activeCategory);
                if (!cat) return null;
                const spent = spentByCategory[cat.id] || 0;
                const catEntries = monthData.entries
                  .filter(e => e.categoryId === activeCategory)
                  .sort((a, b) => b.timestamp - a.timestamp);

                return (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.emoji}</span>
                        <div>
                          <p className="font-semibold text-sm">{cat.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatCurrency(cat.budget - spent)} left
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setActiveCategory(null)}
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Amount input */}
                    <div className="flex gap-2 mb-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <input
                          ref={amountInputRef}
                          type="number"
                          inputMode="decimal"
                          placeholder="0.00"
                          value={entryAmount}
                          onChange={e => setEntryAmount(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addEntry(); }}
                          className="w-full h-12 rounded-md border bg-muted pl-7 pr-3 text-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <Button
                        onClick={addEntry}
                        disabled={!entryAmount || parseFloat(entryAmount) <= 0}
                        className="h-12 px-4"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>

                    {/* Optional note */}
                    <input
                      type="text"
                      placeholder="Note (optional)"
                      value={entryNote}
                      onChange={e => setEntryNote(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addEntry(); }}
                      className="w-full h-9 rounded-md border bg-muted px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mb-3"
                    />

                    {/* Recent entries for this category */}
                    {catEntries.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowHistory(showHistory === activeCategory ? null : activeCategory)}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
                        >
                          {catEntries.length} {catEntries.length === 1 ? 'entry' : 'entries'}{' '}
                          {showHistory === activeCategory ? '▲' : '▼'}
                        </button>
                        {showHistory === activeCategory && (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {catEntries.map(entry => (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between py-1.5 px-2 rounded-md text-sm bg-muted/50 group"
                              >
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium tabular-nums">
                                    {formatCurrencyExact(entry.amount)}
                                  </span>
                                  {entry.note && (
                                    <span className="text-muted-foreground ml-2 truncate">
                                      {entry.note}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteEntry(entry.id)}
                                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                                    aria-label="Delete entry"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Spending breakdown bars */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Spending Breakdown</p>
            <div className="space-y-3">
              {categories.map(cat => {
                const spent = spentByCategory[cat.id] || 0;
                const pct = cat.budget > 0 ? (spent / cat.budget) * 100 : 0;
                const over = spent > cat.budget;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="flex items-center gap-1.5">
                        <span>{cat.emoji}</span>
                        <span className="font-medium">{cat.name}</span>
                      </span>
                      <span className="tabular-nums text-xs">
                        <span style={{ color: over ? 'var(--destructive)' : undefined }}>
                          {formatCurrency(spent)}
                        </span>
                        <span className="text-muted-foreground"> / {formatCurrency(cat.budget)}</span>
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                      {/* Budget limit marker */}
                      {pct > 100 && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-foreground/30 z-10"
                          style={{ left: `${(100 / pct) * 100}%` }}
                        />
                      )}
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: over ? 'var(--destructive)' : cat.color,
                          opacity: spent === 0 ? 0.3 : 1,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
