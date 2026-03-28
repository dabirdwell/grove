'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Sparkles } from 'lucide-react';
import { AppHeader } from '@/components/navigation';
import type { BucketConfig, SafeAccount } from '@/types';
import { FinancialManager } from '@/lib/engine';
import Decimal from 'decimal.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GOALS_STORAGE_KEY = 'grove-savings-goals';

const DEMO_ACCOUNTS: SafeAccount[] = [
  {
    accountId: 'demo-checking',
    name: 'Everyday Checking',
    mask: '4921',
    plaidType: 'depository',
    plaidSubtype: 'checking',
    balance: 3850.00,
    institutionName: 'Chase',
    isMaster: true,
  },
];

const DEMO_BUCKETS: BucketConfig[] = [
  { bucketId: 'demo-rent', name: 'Rent', emoji: '🏠', allocationType: 'fixed_dollar', value: 1200, priority: 1 },
  { bucketId: 'demo-car', name: 'Car Payment', emoji: '🚗', allocationType: 'fixed_dollar', value: 350, priority: 1 },
  { bucketId: 'demo-pet', name: 'Pet Fund', emoji: '🐾', allocationType: 'fixed_dollar', value: 50, priority: 1 },
  { bucketId: 'demo-savings-bucket', name: 'Savings', emoji: '💰', allocationType: 'percent_of_income', value: 0.15, priority: 2 },
  { bucketId: 'demo-emergency', name: 'Emergency Fund', emoji: '🛡️', allocationType: 'percent_of_income', value: 0.10, priority: 2 },
  { bucketId: 'demo-groceries', name: 'Groceries', emoji: '🛒', allocationType: 'percent_of_discretionary', value: 0.25, priority: 3 },
  { bucketId: 'demo-fun', name: 'Fun Money', emoji: '🎉', allocationType: 'percent_of_discretionary', value: 0.20, priority: 3 },
  { bucketId: 'demo-datenight', name: 'Date Night', emoji: '🍷', allocationType: 'percent_of_discretionary', value: 0.15, priority: 3 },
];

// Fake slightly-improving savings rate trend for demo
const SAVINGS_TREND = [
  { month: 'Jan', rate: 18 },
  { month: 'Feb', rate: 22 },
  { month: 'Mar', rate: 25 },
];

interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 81) return { label: 'Flourishing', color: 'var(--primary)' };
  if (score >= 61) return { label: 'Thriving', color: 'var(--chart-2)' };
  if (score >= 41) return { label: 'Growing', color: 'var(--chart-3)' };
  return { label: 'Getting started', color: 'var(--destructive)' };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InsightsPage() {
  const [buckets, setBuckets] = useState<BucketConfig[]>(DEMO_BUCKETS);
  const [accounts, setAccounts] = useState<SafeAccount[]>(DEMO_ACCOUNTS);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Fetch real data if available
  useEffect(() => {
    async function fetchData() {
      try {
        const [accountsRes, bucketsRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/buckets'),
        ]);
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          if (accountsData.accounts?.length > 0) {
            setAccounts(accountsData.accounts);
          }
        }
        if (bucketsRes.ok) {
          const bucketsData = await bucketsRes.json();
          if (bucketsData.buckets?.length > 0) {
            setBuckets(bucketsData.buckets);
          }
        }
      } catch {
        // Fall back to demo data
      }
    }
    fetchData();
  }, []);

  // Load goals from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GOALS_STORAGE_KEY);
      if (stored) {
        setGoals(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const masterAccount = useMemo(
    () => accounts.find((a) => a.isMaster) || accounts[0],
    [accounts],
  );

  // Run allocation engine
  const allocation = useMemo(() => {
    const income = masterAccount?.balance ?? 3850;
    try {
      const fm = new FinancialManager({
        accountId: masterAccount?.accountId || 'demo-checking',
        accountType: 'master',
        balance: new Decimal(income),
        name: masterAccount?.name || 'Checking',
      });

      for (const b of buckets) {
        fm.addBucket({
          bucketId: b.bucketId,
          name: b.name,
          emoji: b.emoji,
          allocationType: b.allocationType,
          masterAccountId: masterAccount?.accountId || 'demo-checking',
          value: new Decimal(b.value),
          priority: b.priority,
          virtualBalance: new Decimal(0),
        });
      }

      return fm.processIncomeAllocation(new Decimal(income));
    } catch {
      return null;
    }
  }, [buckets, masterAccount]);

  const totalIncome = allocation?.summary?.totalIncome ?? masterAccount?.balance ?? 0;
  const totalAllocated = allocation?.summary?.totalAllocated ?? 0;
  const savingsRate = allocation?.summary?.savingsRate ?? 0;
  const totalToSavings = allocation?.summary?.totalToSavings ?? 0;
  const bucketDetails = allocation?.summary?.bucketDetails ?? [];

  // Biggest category
  const biggestCategory = useMemo(() => {
    if (bucketDetails.length === 0) return null;
    return [...bucketDetails].sort((a, b) => b.allocated - a.allocated)[0];
  }, [bucketDetails]);

  // Goals on track calculation
  const goalsOnTrack = useMemo(() => {
    if (goals.length === 0) return 1; // No goals = full score
    const onTrack = goals.filter((g) => {
      const pct = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
      if (!g.deadline) return pct > 0;
      const now = new Date();
      const deadline = new Date(g.deadline);
      const created = new Date(g.createdAt);
      const totalTime = deadline.getTime() - created.getTime();
      const elapsed = now.getTime() - created.getTime();
      if (totalTime <= 0) return pct >= 1;
      const expectedPct = Math.min(elapsed / totalTime, 1);
      return pct >= expectedPct * 0.7; // 70% of expected pace is "on track"
    });
    return goals.length > 0 ? onTrack.length / goals.length : 1;
  }, [goals]);

  // All buckets funded?
  const allBucketsFunded = useMemo(() => {
    if (bucketDetails.length === 0) return 0;
    const funded = bucketDetails.filter((b) => b.allocated > 0);
    return funded.length / bucketDetails.length;
  }, [bucketDetails]);

  // Money Health Score
  const healthScore = useMemo(() => {
    const savingsComponent = Math.min(savingsRate * 100 / 25, 1) * 40; // 25%+ savings = max
    const bucketsComponent = allBucketsFunded * 30;
    const goalsComponent = goalsOnTrack * 30;
    return Math.round(savingsComponent + bucketsComponent + goalsComponent);
  }, [savingsRate, allBucketsFunded, goalsOnTrack]);

  const healthInfo = getHealthLabel(healthScore);

  // Emergency fund growth (demo: estimate from goals)
  const emergencyGrowth = useMemo(() => {
    const emergencyGoal = goals.find((g) =>
      g.name.toLowerCase().includes('emergency'),
    );
    if (emergencyGoal) {
      return Math.min(emergencyGoal.currentAmount * 0.15, emergencyGoal.currentAmount);
    }
    return totalToSavings * 0.4; // rough estimate
  }, [goals, totalToSavings]);

  // Needs vs Wants
  const needsWants = useMemo(() => {
    let needs = 0;
    let wants = 0;
    let savings = 0;
    for (const b of bucketDetails) {
      if (b.category === 'savings') {
        savings += b.allocated;
      } else if (b.allocationType === 'fixed_dollar' || b.category === 'bills') {
        needs += b.allocated;
      } else {
        wants += b.allocated;
      }
    }
    const total = needs + wants + savings;
    return {
      needs,
      wants,
      savings,
      needsPct: total > 0 ? (needs / total) * 100 : 0,
      wantsPct: total > 0 ? (wants / total) * 100 : 0,
      savingsPct: total > 0 ? (savings / total) * 100 : 0,
    };
  }, [bucketDetails]);

  // Donut chart
  const CHART_COLORS = ['#64FFDA', '#4FD1C5', '#FFD93D', '#FF6B6B', '#81E6D9', '#A78BFA', '#F9A8D4', '#6EE7B7'];

  const donutGradient = useMemo(() => {
    if (bucketDetails.length === 0 || totalAllocated === 0) {
      return 'conic-gradient(#1e3a52 0% 100%)';
    }
    let cumulative = 0;
    const stops = bucketDetails.map((b, i) => {
      const pct = (b.allocated / totalAllocated) * 100;
      const start = cumulative;
      cumulative += pct;
      return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${cumulative}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [bucketDetails, totalAllocated]);

  // Gauge arc for health score
  const gaugeArc = useMemo(() => {
    const radius = 70;
    const circumference = Math.PI * radius; // half circle
    const offset = circumference - (healthScore / 100) * circumference;
    return { radius, circumference, offset };
  }, [healthScore]);

  // Max bar height for savings trend
  const maxTrendRate = Math.max(...SAVINGS_TREND.map((t) => t.rate), 1);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading insights...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader />

      <main className="container mx-auto py-6 px-4 max-w-5xl space-y-8">
        {/* Your Money Story */}
        <section>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Your Money Story</h1>
          <Card className="grove-card-glow">
            <CardContent className="pt-6 pb-5 space-y-3">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="space-y-2 text-sm leading-relaxed">
                  <p>
                    This month, you allocated{' '}
                    <span className="font-bold money-amount" style={{ color: 'var(--primary)' }}>
                      {formatCurrency(totalAllocated)}
                    </span>{' '}
                    of your{' '}
                    <span className="font-bold money-amount">{formatCurrency(totalIncome)}</span>{' '}
                    income.
                  </p>
                  {biggestCategory && (
                    <p>
                      Your biggest category was{' '}
                      <span className="font-semibold">
                        {biggestCategory.emoji} {biggestCategory.name}
                      </span>{' '}
                      at{' '}
                      <span className="font-bold money-amount">
                        {formatCurrency(biggestCategory.allocated)}
                      </span>.
                    </p>
                  )}
                  <p>
                    You saved{' '}
                    <span className="font-bold" style={{ color: 'var(--primary)' }}>
                      {Math.round(savingsRate * 100)}%
                    </span>{' '}
                    of your income.
                    {emergencyGrowth > 0 && (
                      <>
                        {' '}Your emergency fund grew by{' '}
                        <span className="font-bold money-amount" style={{ color: 'var(--primary)' }}>
                          {formatCurrency(emergencyGrowth)}
                        </span>.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Donut Chart — Allocation Breakdown */}
          <section>
            <h2 className="text-xl font-bold mb-4">Allocation Breakdown</h2>
            <Card className="grove-card-glow">
              <CardContent className="pt-6 flex flex-col items-center">
                <div
                  className="w-48 h-48 rounded-full mb-4 relative"
                  style={{
                    background: donutGradient,
                    boxShadow: '0 0 30px rgba(100, 255, 218, 0.1)',
                  }}
                  role="img"
                  aria-label="Allocation breakdown donut chart"
                >
                  <div className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-card flex items-center justify-center">
                    <span className="text-sm font-bold money-amount">{formatCurrency(totalAllocated)}</span>
                  </div>
                </div>
                <div className="w-full space-y-2">
                  {bucketDetails.map((b, i) => {
                    const pct = totalAllocated > 0 ? (b.allocated / totalAllocated) * 100 : 0;
                    return (
                      <div key={b.bucketId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span>{b.emoji} {b.name}</span>
                        </div>
                        <span className="money-amount text-muted-foreground">{Math.round(pct)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Money Health Score */}
          <section>
            <h2 className="text-xl font-bold mb-4">Money Health Score</h2>
            <Card className="grove-card-glow">
              <CardContent className="pt-6 flex flex-col items-center">
                {/* Circular Gauge */}
                <div className="relative w-48 h-28 mb-2">
                  <svg viewBox="0 0 160 90" className="w-full h-full">
                    {/* Background arc */}
                    <path
                      d="M 10 80 A 70 70 0 0 1 150 80"
                      fill="none"
                      stroke="#1e3a52"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    {/* Score arc */}
                    <path
                      d="M 10 80 A 70 70 0 0 1 150 80"
                      fill="none"
                      stroke={healthInfo.color}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${gaugeArc.circumference}`}
                      strokeDashoffset={`${gaugeArc.offset}`}
                      style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                    <span className="text-3xl font-bold" style={{ color: healthInfo.color }}>
                      {healthScore}
                    </span>
                  </div>
                </div>
                <p className="text-lg font-semibold" style={{ color: healthInfo.color }}>
                  {healthInfo.label}
                </p>
                <p className="text-xs text-muted-foreground mt-2 text-center max-w-[240px]">
                  Based on savings rate ({Math.round(savingsRate * 100)}%), budget coverage ({Math.round(allBucketsFunded * 100)}%), and goal progress ({Math.round(goalsOnTrack * 100)}%)
                </p>

                {/* Score breakdown */}
                <div className="w-full mt-4 space-y-2">
                  {[
                    { label: 'Savings Rate', weight: '40%', value: Math.round(Math.min(savingsRate * 100 / 25, 1) * 40) },
                    { label: 'Buckets Funded', weight: '30%', value: Math.round(allBucketsFunded * 30) },
                    { label: 'Goals On Track', weight: '30%', value: Math.round(goalsOnTrack * 30) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.label} ({item.weight})</span>
                      <span className="font-semibold money-amount">{item.value} pts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Needs vs Wants */}
        <section>
          <h2 className="text-xl font-bold mb-4">Needs vs Wants</h2>
          <Card className="grove-card-glow">
            <CardContent className="pt-6 space-y-4">
              {/* Actual split bar */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Your Split</p>
                <div className="h-6 w-full rounded-full overflow-hidden flex" role="img" aria-label="Needs wants savings split bar">
                  {needsWants.needsPct > 0 && (
                    <div
                      className="h-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        width: `${needsWants.needsPct}%`,
                        backgroundColor: '#4FD1C5',
                        color: 'var(--primary-foreground)',
                        minWidth: needsWants.needsPct > 8 ? undefined : '24px',
                      }}
                    >
                      {Math.round(needsWants.needsPct)}%
                    </div>
                  )}
                  {needsWants.wantsPct > 0 && (
                    <div
                      className="h-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        width: `${needsWants.wantsPct}%`,
                        backgroundColor: '#A78BFA',
                        color: 'var(--primary-foreground)',
                        minWidth: needsWants.wantsPct > 8 ? undefined : '24px',
                      }}
                    >
                      {Math.round(needsWants.wantsPct)}%
                    </div>
                  )}
                  {needsWants.savingsPct > 0 && (
                    <div
                      className="h-full flex items-center justify-center text-[10px] font-bold"
                      style={{
                        width: `${needsWants.savingsPct}%`,
                        backgroundColor: 'var(--primary)',
                        color: 'var(--primary-foreground)',
                        minWidth: needsWants.savingsPct > 8 ? undefined : '24px',
                      }}
                    >
                      {Math.round(needsWants.savingsPct)}%
                    </div>
                  )}
                </div>
              </div>

              {/* 50/30/20 guideline */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">50 / 30 / 20 Guideline</p>
                <div className="h-6 w-full rounded-full overflow-hidden flex">
                  <div className="h-full flex items-center justify-center text-[10px] font-bold" style={{ width: '50%', backgroundColor: '#4FD1C5', color: 'var(--primary-foreground)', opacity: 0.4 }}>50%</div>
                  <div className="h-full flex items-center justify-center text-[10px] font-bold" style={{ width: '30%', backgroundColor: '#A78BFA', color: 'var(--primary-foreground)', opacity: 0.4 }}>30%</div>
                  <div className="h-full flex items-center justify-center text-[10px] font-bold" style={{ width: '20%', backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', opacity: 0.4 }}>20%</div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4FD1C5' }} />
                  <span>Needs {formatCurrency(needsWants.needs)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#A78BFA' }} />
                  <span>Wants {formatCurrency(needsWants.wants)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                  <span>Savings {formatCurrency(needsWants.savings)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Savings Rate Trend */}
        <section>
          <h2 className="text-xl font-bold mb-4">Savings Rate Trend</h2>
          <Card className="grove-card-glow">
            <CardContent className="pt-6">
              <div className="flex items-end gap-4 h-40 justify-center">
                {SAVINGS_TREND.map((month) => {
                  const barHeight = (month.rate / maxTrendRate) * 100;
                  return (
                    <div key={month.month} className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
                      <span className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        {month.rate}%
                      </span>
                      <div className="w-full relative" style={{ height: '100px' }}>
                        <div
                          className="absolute bottom-0 w-full rounded-t-md transition-all"
                          style={{
                            height: `${barHeight}%`,
                            background: 'linear-gradient(to top, #134E5E, #64FFDA)',
                            boxShadow: '0 0 12px rgba(100, 255, 218, 0.2)',
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{month.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" style={{ color: 'var(--primary)' }} aria-hidden="true" />
                <span>Trending up — you&apos;re building momentum!</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
