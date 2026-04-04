'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import {
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Check,
  Building2,
  TreePine,
  Sparkles,
  Shield,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';

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

// ─── TYPES & CONSTANTS ──────────────────────────────────────────────────

interface BudgetCategory {
  id: string;
  name: string;
  emoji: string;
  defaultBudget: number;
  color: string;
}

const CATEGORIES: BudgetCategory[] = [
  { id: 'housing',        name: 'Housing',        emoji: '🏠', defaultBudget: 1500, color: '#4FD1C5' },
  { id: 'food',           name: 'Food',           emoji: '🛒', defaultBudget: 600,  color: '#64FFDA' },
  { id: 'transportation', name: 'Transport',      emoji: '🚗', defaultBudget: 400,  color: '#81E6D9' },
  { id: 'healthcare',     name: 'Healthcare',     emoji: '💊', defaultBudget: 200,  color: '#7E57C2' },
  { id: 'utilities',      name: 'Utilities',      emoji: '⚡', defaultBudget: 250,  color: '#4FC3F7' },
  { id: 'entertainment',  name: 'Fun',            emoji: '🎉', defaultBudget: 200,  color: '#FFD93D' },
  { id: 'savings',        name: 'Savings',        emoji: '💰', defaultBudget: 500,  color: '#66BB6A' },
  { id: 'other',          name: 'Other',          emoji: '📦', defaultBudget: 200,  color: '#FF6B6B' },
];

const STEPS = ['income', 'budgets', 'connect', 'tree'] as const;
type Step = (typeof STEPS)[number];

const STEP_META: Record<Step, { title: string; subtitle: string }> = {
  income:  { title: 'Your Income',      subtitle: 'How much do you earn each month?' },
  budgets: { title: 'Budget Targets',   subtitle: 'Set spending targets for each category' },
  connect: { title: 'Connect Your Bank', subtitle: 'Optional: supercharge your tree with live data' },
  tree:    { title: 'Your Money Tree',  subtitle: 'Watch your finances come to life' },
};

// ─── HELPERS ────────────────────────────────────────────────────────────

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── PAGE ───────────────────────────────────────────────────────────────

export default function GettingStartedPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('income');
  const [income, setIncome] = useState('');
  const [budgets, setBudgets] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const cat of CATEGORIES) {
      initial[cat.id] = String(cat.defaultBudget);
    }
    return initial;
  });

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  // Load any previously saved values
  useEffect(() => {
    setMounted(true);
    try {
      const savedIncome = localStorage.getItem('grove-income');
      if (savedIncome) setIncome(savedIncome);
    } catch { /* ignore */ }
    try {
      const mk = monthKey();
      const raw = localStorage.getItem(`grove-budget-${mk}`);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.budgets) {
          setBudgets(prev => {
            const next = { ...prev };
            for (const [k, v] of Object.entries(data.budgets)) {
              next[k] = String(v);
            }
            return next;
          });
        }
        if (data.income) setIncome(String(data.income));
      }
    } catch { /* ignore */ }
  }, []);

  const incomeNum = useMemo(() => {
    const n = parseFloat(income);
    return isNaN(n) ? 0 : n;
  }, [income]);

  const totalBudgeted = useMemo(() => {
    return Object.values(budgets).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  }, [budgets]);

  const treeBranches = useMemo(() => {
    const total = incomeNum || 1;
    return CATEGORIES.map(cat => ({
      id: cat.id,
      name: cat.name,
      amount: parseFloat(budgets[cat.id]) || 0,
      percentage: ((parseFloat(budgets[cat.id]) || 0) / total) * 100,
      color: cat.color,
    })).filter(b => b.amount > 0);
  }, [budgets, incomeNum]);

  // Navigation
  const next = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  }, [step]);

  const prev = useCallback(() => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }, [step]);

  // Save & finish
  const handleComplete = useCallback(() => {
    const mk = monthKey();
    const budgetNums: Record<string, number> = {};
    for (const [k, v] of Object.entries(budgets)) {
      budgetNums[k] = parseFloat(v) || 0;
    }

    // Save income
    localStorage.setItem('grove-income', income);

    // Save budget data for current month
    try {
      const existing = localStorage.getItem(`grove-budget-${mk}`);
      const data = existing ? JSON.parse(existing) : { income: 0, entries: [], budgets: {} };
      data.income = incomeNum;
      data.budgets = budgetNums;
      localStorage.setItem(`grove-budget-${mk}`, JSON.stringify(data));
    } catch {
      localStorage.setItem(`grove-budget-${mk}`, JSON.stringify({
        income: incomeNum,
        entries: [],
        budgets: budgetNums,
      }));
    }

    // Mark onboarding complete
    localStorage.setItem('grove-onboarding-complete', 'true');
    router.push('/');
  }, [budgets, income, incomeNum, router]);

  const handleIncomeInput = useCallback((value: string) => {
    setIncome(value.replace(/[^\d.]/g, ''));
  }, []);

  const handleBudgetInput = useCallback((categoryId: string, value: string) => {
    setBudgets(prev => ({ ...prev, [categoryId]: value.replace(/[^\d.]/g, '') }));
  }, []);

  if (!mounted) return null;

  // ─── STEP RENDERERS ─────────────────────────────────────────────────

  const renderIncome = () => (
    <motion.div
      key="income"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3">
        <motion.div
          className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <DollarSign className="h-10 w-10 text-primary" />
        </motion.div>
        <h2 className="text-2xl font-bold">What&apos;s your monthly income?</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          This helps us size your money tree. You can always change it later in Settings.
        </p>
      </div>

      <div className="max-w-xs mx-auto">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-medium">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={income}
            onChange={(e) => handleIncomeInput(e.target.value)}
            placeholder="5,000"
            autoFocus
            className="w-full rounded-xl border border-input bg-transparent pl-10 pr-4 py-4 text-3xl font-bold text-center tabular-nums shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow]"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">per month, before taxes</p>
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={next}
          disabled={incomeNum <= 0}
          className="gap-2 min-w-[160px]"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderBudgets = () => (
    <motion.div
      key="budgets"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Set your monthly targets</h2>
        <p className="text-sm text-muted-foreground">
          Each category becomes a branch on your money tree.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between text-sm px-1">
        <span className="text-muted-foreground">
          Budgeted: <span className="font-semibold text-foreground tabular-nums">{formatCurrency(totalBudgeted)}</span>
        </span>
        <span className={`font-semibold tabular-nums ${
          incomeNum > 0 && totalBudgeted > incomeNum ? 'text-destructive' : 'text-primary'
        }`}>
          {incomeNum > 0
            ? (totalBudgeted <= incomeNum
                ? `${formatCurrency(incomeNum - totalBudgeted)} remaining`
                : `${formatCurrency(totalBudgeted - incomeNum)} over budget`)
            : ''}
        </span>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-3"
          >
            <span className="text-xl w-8 text-center flex-shrink-0">{cat.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{cat.name}</p>
            </div>
            <div className="relative w-24 flex-shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={budgets[cat.id]}
                onChange={(e) => handleBudgetInput(cat.id, e.target.value)}
                className="w-full rounded-md border border-input bg-transparent pl-6 pr-2 py-1.5 text-sm text-right tabular-nums shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow]"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prev} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button size="lg" onClick={next} className="gap-2 min-w-[160px]">
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderConnect = () => (
    <motion.div
      key="connect"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3">
        <motion.div
          className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Building2 className="h-10 w-10 text-blue-500" />
        </motion.div>
        <h2 className="text-2xl font-bold">Connect Your Bank</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Link your bank account to unlock the full Grove experience.
          This is optional &mdash; you can always connect later in Settings.
        </p>
      </div>

      {/* Benefits grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
        {[
          { icon: RefreshCw, label: 'Auto-sync transactions', desc: 'Spending updates in real-time' },
          { icon: TrendingUp, label: 'Smarter insights', desc: 'See trends across months' },
          { icon: Shield, label: 'Bank-level security', desc: 'Powered by Plaid encryption' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-lg border border-border bg-card/50 p-4 text-center space-y-2">
            <Icon className="h-6 w-6 mx-auto text-primary" />
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center space-y-3 max-w-xs mx-auto">
        <Button variant="outline" size="lg" className="w-full gap-2" disabled>
          <Building2 className="h-4 w-4" />
          Connect Bank (Coming Soon)
        </Button>
        <p className="text-xs text-muted-foreground">
          Bank connection requires Plaid API keys. For now, Grove works
          beautifully with manual budget tracking.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prev} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button size="lg" onClick={next} className="gap-2 min-w-[160px]">
          See My Tree <TreePine className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderTree = () => (
    <motion.div
      key="tree"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <Sparkles className="h-8 w-8 text-primary mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold">Your Money Tree</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Each branch represents a budget category. A healthy tree means balanced spending.
        </p>
      </div>

      {/* 3D Tree */}
      <div className="rounded-xl border border-border overflow-hidden bg-[#0A1628]" style={{ height: 360 }}>
        <MoneyTree3D
          branches={treeBranches}
          totalIncome={incomeNum || 5000}
          healthScore={incomeNum > 0 ? Math.max(0, Math.min(100, ((incomeNum - totalBudgeted) / incomeNum) * 100 + 50)) : 75}
        />
      </div>

      {/* Budget summary chips */}
      <div className="flex flex-wrap gap-2 justify-center">
        {treeBranches.map(b => (
          <span
            key={b.name}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-medium"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
            {b.name}: {formatCurrency(b.amount)}
          </span>
        ))}
      </div>

      {/* Finish */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={prev} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button size="lg" onClick={handleComplete} className="gap-2 min-w-[180px]">
          <Check className="h-4 w-4" />
          Start Using Grove
        </Button>
      </div>
    </motion.div>
  );

  const renderStep = () => {
    switch (step) {
      case 'income':  return renderIncome();
      case 'budgets': return renderBudgets();
      case 'connect': return renderConnect();
      case 'tree':    return renderTree();
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-background flex flex-col">
      {/* Progress header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 max-w-2xl">
          <div className="flex items-center gap-4">
            <Wallet className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {stepIndex + 1} / {STEPS.length}
            </span>
          </div>

          {/* Step dots */}
          <div className="flex justify-between mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex items-center gap-1.5 text-xs ${i <= stepIndex ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  i < stepIndex
                    ? 'bg-primary text-primary-foreground'
                    : i === stepIndex
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{STEP_META[s].title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Card className="grove-card-glow">
          <CardContent className="pt-8 pb-8">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
