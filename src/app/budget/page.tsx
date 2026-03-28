'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppHeader } from '@/components/navigation';
import type { BucketConfig, SafeAccount } from '@/types';
import { FinancialManager } from '@/lib/engine';
import Decimal from 'decimal.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

function getProgressColor(percent: number): string {
  if (percent > 100) return 'var(--destructive)';
  if (percent > 75) return 'var(--chart-3)';
  return 'var(--primary)';
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BudgetPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [buckets, setBuckets] = useState<BucketConfig[]>(DEMO_BUCKETS);
  const [accounts, setAccounts] = useState<SafeAccount[]>(DEMO_ACCOUNTS);

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

  const masterAccount = useMemo(
    () => accounts.find((a) => a.isMaster) || accounts[0],
    [accounts],
  );

  const monthLabel = `${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  const prevMonth = useCallback(() => {
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }, []);

  const nextMonth = useCallback(() => {
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }, []);

  // Run allocation engine to compute amounts
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
  const totalUnallocated = allocation?.summary?.remainingUnallocated ?? (totalIncome - totalAllocated);
  const bucketDetails = allocation?.summary?.bucketDetails ?? [];

  // Pie chart data
  const pieSlices = useMemo(() => {
    if (bucketDetails.length === 0) return [];
    const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', '#A78BFA', '#F9A8D4', '#6EE7B7'];
    let cumulative = 0;
    return bucketDetails.map((b, i) => {
      const pct = totalAllocated > 0 ? (b.allocated / totalAllocated) * 100 : 0;
      const start = cumulative;
      cumulative += pct;
      return {
        name: b.name,
        emoji: b.emoji,
        allocated: b.allocated,
        percent: pct,
        startAngle: start,
        endAngle: cumulative,
        color: colors[i % colors.length],
      };
    });
  }, [bucketDetails, totalAllocated]);

  // Build conic-gradient for pie
  const conicGradient = useMemo(() => {
    if (pieSlices.length === 0) return 'conic-gradient(var(--muted) 0% 100%)';
    const stops = pieSlices.map(
      (s) => `${s.color} ${s.startAngle}% ${s.endAngle}%`,
    );
    return `conic-gradient(${stops.join(', ')})`;
  }, [pieSlices]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader />

      <main className="container mx-auto py-6 px-4 max-w-5xl">
        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            aria-label="Previous month"
            className="min-w-[44px] min-h-[44px]"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight min-w-[240px] text-center">
            {monthLabel}
          </h1>
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

        {/* Income Summary */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card className="grove-card-glow">
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Income</p>
              <p className="text-2xl font-bold money-amount mt-1">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="grove-card-glow">
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Allocated</p>
              <p className="text-2xl font-bold money-amount mt-1" style={{ color: 'var(--primary)' }}>
                {formatCurrency(totalAllocated)}
              </p>
            </CardContent>
          </Card>
          <Card className="grove-card-glow">
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Unallocated</p>
              <p className="text-2xl font-bold money-amount mt-1" style={{ color: totalUnallocated > 0 ? 'var(--chart-3)' : 'var(--primary)' }}>
                {formatCurrency(totalUnallocated)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Bucket Breakdown */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Branch Breakdown</h2>
            {bucketDetails.length > 0 ? (
              <div className="space-y-3">
                {bucketDetails.map((bucket) => {
                  const allocated = bucket.allocated;
                  // For now, "spent" is the allocated amount (placeholder)
                  const spent = allocated;
                  const remaining = allocated - spent;
                  const progressPct = allocated > 0 ? Math.min((spent / allocated) * 100, 120) : 0;
                  const displayPct = Math.min(progressPct, 100);
                  const progressColor = getProgressColor(progressPct);

                  return (
                    <Card key={bucket.bucketId}>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{bucket.emoji}</span>
                            <span className="font-semibold">{bucket.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                              {bucket.category}
                            </span>
                          </div>
                          <span className="font-bold money-amount">{formatCurrency(allocated)}</span>
                        </div>

                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-primary/20 mb-2">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${displayPct}%`,
                              backgroundColor: progressColor,
                            }}
                          />
                        </div>

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Spent: {formatCurrency(spent)}</span>
                          <span>Remaining: {formatCurrency(remaining)}</span>
                          <span>{Math.round(progressPct)}% used</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <p className="text-muted-foreground">No branches yet. Create some on the dashboard to see your budget.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pie Chart */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Allocation Split</h2>
            <Card>
              <CardContent className="pt-6 flex flex-col items-center">
                {/* CSS Conic Gradient Pie Chart */}
                <div
                  className="w-48 h-48 rounded-full mb-4 relative"
                  style={{
                    background: conicGradient,
                    boxShadow: '0 0 30px rgba(100, 255, 218, 0.1)',
                  }}
                  role="img"
                  aria-label="Allocation breakdown pie chart"
                >
                  {/* Center hole for donut effect */}
                  <div
                    className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-card flex items-center justify-center"
                  >
                    <span className="text-sm font-bold money-amount">{formatCurrency(totalAllocated)}</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="w-full space-y-2">
                  {pieSlices.map((slice) => (
                    <div key={slice.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: slice.color }}
                        />
                        <span>{slice.emoji} {slice.name}</span>
                      </div>
                      <span className="money-amount text-muted-foreground">{Math.round(slice.percent)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
