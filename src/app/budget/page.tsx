'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Waves, BarChart3 } from 'lucide-react';
import { AppHeader } from '@/components/navigation';
import { BucketCard, BucketForm } from '@/components/buckets';
import { AllocationPanel, BudgetSummaryCard } from '@/components/dashboard';
import { SankeyDiagram, generateFlowData } from '@/components/flow';
import type { BucketConfig, SafeAccount, AllocationResult, FlowData } from '@/types';
import { FinancialManager } from '@/lib/engine';
import { toast } from 'sonner';
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

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BudgetPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [buckets, setBuckets] = useState<BucketConfig[]>(DEMO_BUCKETS);
  const [accounts, setAccounts] = useState<SafeAccount[]>(DEMO_ACCOUNTS);
  const [showBucketForm, setShowBucketForm] = useState(false);
  const [editingBucket, setEditingBucket] = useState<BucketConfig | null>(null);
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [isAllocating, setIsAllocating] = useState(false);
  const [vizMode, setVizMode] = useState<'chart' | 'sankey'>('chart');

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

  // Generate Sankey flow data from allocation
  const sankeyFlowData: FlowData = useMemo(() => {
    if (bucketDetails.length === 0) return { nodes: [], links: [] };
    return generateFlowData(
      totalIncome,
      masterAccount?.name || 'Main Account',
      bucketDetails.map(b => ({
        bucketId: b.bucketId,
        name: b.name,
        emoji: b.emoji,
        allocationType: b.allocationType ?? 'fixed_dollar',
        allocated: b.allocated,
        virtualBalance: b.allocated,
      }))
    );
  }, [bucketDetails, totalIncome, masterAccount?.name]);

  // Handle allocation from AllocationPanel
  const handleAllocate = useCallback(async (amount: number): Promise<AllocationResult> => {
    setIsAllocating(true);
    try {
      const fm = new FinancialManager({
        accountId: masterAccount?.accountId || 'demo-checking',
        accountType: 'master',
        balance: new Decimal(amount),
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
      const result = fm.processIncomeAllocation(new Decimal(amount));
      setAllocationResult(result);
      toast.success('Allocation complete!');
      return result;
    } catch {
      toast.error('Allocation failed');
      throw new Error('Allocation failed');
    } finally {
      setIsAllocating(false);
    }
  }, [buckets, masterAccount]);

  // Handle bucket create
  const handleCreateBucket = useCallback((bucketData: Omit<BucketConfig, 'id' | 'bucketId' | 'priority'>) => {
    const newBucket: BucketConfig = {
      ...bucketData,
      id: `bucket-${Date.now()}`,
      bucketId: `bucket-${Date.now()}`,
      priority: buckets.length + 1,
    };
    setBuckets(prev => [...prev, newBucket]);
    toast.success(`"${newBucket.name}" added`);
  }, [buckets.length]);

  // Handle bucket delete
  const handleDeleteBucket = useCallback((bucketId: string) => {
    setBuckets(prev => prev.filter(b => b.bucketId !== bucketId));
    toast.success('Branch pruned');
  }, []);

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

        {/* Budget Summary Card */}
        {allocation?.summary && (
          <div className="mb-8">
            <BudgetSummaryCard summary={allocation.summary} />
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Left Sidebar — Allocation Panel */}
          <div className="space-y-4">
            <AllocationPanel
              onAllocate={handleAllocate}
              isLoading={isAllocating}
              lastResult={allocationResult}
              masterBalance={masterAccount?.balance}
            />
          </div>

          {/* Right — Bucket Cards + Visualization */}
          <div className="space-y-6">
            {/* Branch heading + add button */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Your Branches</h2>
              <Button
                size="sm"
                onClick={() => setShowBucketForm(true)}
                className="min-h-[36px]"
              >
                <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Add Branch
              </Button>
            </div>

            {/* Bucket Cards Grid */}
            {buckets.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {buckets.map((bucket) => (
                  <BucketCard
                    key={bucket.bucketId}
                    bucket={bucket}
                    onEdit={(b) => {
                      setEditingBucket(b);
                      setShowBucketForm(true);
                    }}
                    onDelete={handleDeleteBucket}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <p className="text-muted-foreground">No branches yet. Add one to start budgeting.</p>
                </CardContent>
              </Card>
            )}

            {/* Visualization Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={vizMode === 'chart' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVizMode('chart')}
              >
                <BarChart3 className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Pie Chart
              </Button>
              <Button
                variant={vizMode === 'sankey' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVizMode('sankey')}
              >
                <Waves className="h-4 w-4 mr-1.5" aria-hidden="true" />
                Flow Diagram
              </Button>
            </div>

            {vizMode === 'chart' ? (
              /* Pie Chart */
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Allocation Split</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div
                    className="w-48 h-48 rounded-full mb-4 relative"
                    style={{
                      background: conicGradient,
                      boxShadow: '0 0 30px rgba(100, 255, 218, 0.1)',
                    }}
                    role="img"
                    aria-label="Allocation breakdown pie chart"
                  >
                    <div className="absolute inset-0 m-auto w-24 h-24 rounded-full bg-card flex items-center justify-center">
                      <span className="text-sm font-bold money-amount">{formatCurrency(totalAllocated)}</span>
                    </div>
                  </div>
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
            ) : (
              /* Sankey Flow Diagram */
              <Card className="grove-card-glow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Money Flow</CardTitle>
                  <CardDescription>How income flows into each branch</CardDescription>
                </CardHeader>
                <CardContent>
                  {sankeyFlowData.nodes.length > 0 ? (
                    <SankeyDiagram data={sankeyFlowData} height={350} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Waves className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">No allocation data to visualize yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Bucket Form Dialog */}
        <BucketForm
          open={showBucketForm}
          onOpenChange={(open) => {
            setShowBucketForm(open);
            if (!open) setEditingBucket(null);
          }}
          onSubmit={handleCreateBucket}
          editBucket={editingBucket}
          externalAccounts={accounts.filter(a => !a.isMaster)}
          bucketCount={buckets.length}
        />
      </main>
    </div>
  );
}
