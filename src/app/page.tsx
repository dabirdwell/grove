'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AnimatedSankey, SankeyDiagram, generateFlowData } from '@/components/flow';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Dynamic import for 3D tree (needs to avoid SSR)
const MoneyTree3D = dynamic(
  () => import('@/components/money-tree-3d').then(mod => mod.MoneyTree3D),
  { ssr: false, loading: () => <TreeLoadingState /> }
);

// Loading state for 3D tree
function TreeLoadingState() {
  return (
    <div 
      className="flex items-center justify-center h-[400px] rounded-lg bg-muted"
    >
      <div className="text-center">
        <div 
          className="w-3 h-3 rounded-full mx-auto mb-3 animate-pulse"
          style={{ backgroundColor: 'var(--primary)' }}
        />
        <p style={{ color: 'var(--primary)', opacity: 0.7 }}>
          Growing...
        </p>
      </div>
    </div>
  );
}
import { BucketCard, BucketForm } from '@/components/buckets';
import { AllocationPanel, AccountSelector, BudgetSummaryCard } from '@/components/dashboard';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { celebrations } from '@/components/ui/confetti';
import { Skeleton, LoadingOverlay } from '@/components/ui/loading';
import { OnboardingWizard } from '@/components/onboarding';
import { AppHeader } from '@/components/navigation';
import { PlaidLinkButton } from '@/components/plaid';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { friendlyError } from '@/lib/friendly-errors';
import { toast } from 'sonner';
import {
  Plus,
  Settings,
  RefreshCw,
  Volume2,
  VolumeX,
  Building2,
  Droplets,
  Target,
  ReceiptText,
  Waves,
  TreePine,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { SafeAccount, BucketConfig, AllocationResult, FlowData } from '@/types';

// Time-of-day greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', emoji: '🌱' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '🌿' };
  if (hour < 21) return { text: 'Good evening', emoji: '🌳' };
  return { text: 'Moonlit planning', emoji: '🌙' };
};

// Demo data for initial state (before Plaid connection)
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
  {
    accountId: 'demo-savings',
    name: 'High-Yield Savings',
    mask: '7803',
    plaidType: 'depository',
    plaidSubtype: 'savings',
    balance: 12350.00,
    institutionName: 'Ally Bank',
    isMaster: false,
  },
];

const DEMO_BUCKETS: BucketConfig[] = [
  {
    bucketId: 'demo-rent',
    name: 'Rent',
    emoji: '🏠',
    allocationType: 'fixed_dollar',
    value: 1200,
    priority: 1,
  },
  {
    bucketId: 'demo-car',
    name: 'Car Payment',
    emoji: '🚗',
    allocationType: 'fixed_dollar',
    value: 350,
    priority: 1,
  },
  {
    bucketId: 'demo-pet',
    name: 'Pet Fund',
    emoji: '🐾',
    allocationType: 'fixed_dollar',
    value: 50,
    priority: 1,
  },
  {
    bucketId: 'demo-savings-bucket',
    name: 'Savings',
    emoji: '💰',
    allocationType: 'percent_of_income',
    value: 0.15,
    priority: 2,
  },
  {
    bucketId: 'demo-emergency',
    name: 'Emergency Fund',
    emoji: '🛡️',
    allocationType: 'percent_of_income',
    value: 0.10,
    priority: 2,
  },
  {
    bucketId: 'demo-groceries',
    name: 'Groceries',
    emoji: '🛒',
    allocationType: 'percent_of_discretionary',
    value: 0.25,
    priority: 3,
  },
  {
    bucketId: 'demo-fun',
    name: 'Fun Money',
    emoji: '🎉',
    allocationType: 'percent_of_discretionary',
    value: 0.20,
    priority: 3,
  },
  {
    bucketId: 'demo-datenight',
    name: 'Date Night',
    emoji: '🍷',
    allocationType: 'percent_of_discretionary',
    value: 0.15,
    priority: 3,
  },
];

// ---------------------------------------------------------------------------
// Goals Overview Widget (reads from localStorage, same key as goals page)
// ---------------------------------------------------------------------------

interface GoalSnapshot {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
}

function GoalsOverview() {
  const [goals, setGoals] = useState<GoalSnapshot[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('grove-savings-goals');
      if (stored) {
        const parsed: GoalSnapshot[] = JSON.parse(stored);
        setGoals(parsed.slice(0, 3));
      }
    } catch {
      // ignore
    }
  }, []);

  if (goals.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          Goals Overview
        </h2>
        <Link href="/goals" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          View all
        </Link>
      </div>
      <Card className="grove-card-glow">
        <CardContent className="pt-5 pb-4 space-y-3">
          {goals.map((goal) => {
            const percent = goal.targetAmount > 0
              ? Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100)
              : 0;
            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5 font-medium truncate">
                    <span>{goal.emoji}</span>
                    {goal.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                    {percent}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-secondary">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: percent >= 100 ? 'var(--chart-3)' : 'var(--primary)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upcoming Bills Widget (reads from localStorage, same key as bills page)
// ---------------------------------------------------------------------------

interface BillSnapshot {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  dueDay: number;
  autoPay: boolean;
  paidDates: string[];
}

function getNextPayday(): number {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 5=Fri
  // Find next Friday
  let daysToFri = (5 - dayOfWeek + 7) % 7;
  if (daysToFri === 0) daysToFri = 7; // if today is Friday, next is in 7

  // Bi-weekly: if this week's Friday is even week of year, next payday is this Friday
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  const thisPayWeek = weekNum % 2 === 0;

  if (thisPayWeek && daysToFri <= 7) return daysToFri;
  if (!thisPayWeek) return daysToFri + 7;
  return daysToFri;
}

function UpcomingBills() {
  const [bills, setBills] = useState<BillSnapshot[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('grove-bills');
      if (stored) {
        setBills(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  if (bills.length === 0) return null;

  const today = new Date();
  const todayDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const paidKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Get upcoming unpaid bills sorted by days until due
  const upcoming = bills
    .filter((b) => !b.paidDates.includes(paidKey))
    .map((b) => {
      const day = Math.min(b.dueDay, daysInMonth);
      const daysUntil = day - todayDay;
      return { ...b, effectiveDay: day, daysUntil };
    })
    .filter((b) => b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);

  // Total upcoming this week
  const weekTotal = bills
    .filter((b) => !b.paidDates.includes(paidKey))
    .filter((b) => {
      const day = Math.min(b.dueDay, daysInMonth);
      const diff = day - todayDay;
      return diff >= 0 && diff <= 7;
    })
    .reduce((sum, b) => sum + b.amount, 0);

  const nextPayday = getNextPayday();

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
          Upcoming Bills
        </h2>
        <Link href="/bills" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          View all
        </Link>
      </div>
      <Card className="grove-card-glow">
        <CardContent className="pt-5 pb-4 space-y-3">
          {/* Payday + week total */}
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              Next payday: <span style={{ color: 'var(--primary)' }}>{nextPayday} day{nextPayday !== 1 ? 's' : ''}</span>
            </span>
            {weekTotal > 0 && (
              <span className="text-muted-foreground">
                This week: <span className="money-amount" style={{ color: 'var(--chart-3)' }}>
                  ${weekTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </span>
            )}
          </div>
          {/* Next 3 bills */}
          {upcoming.map((bill) => (
            <div key={bill.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base flex-shrink-0">{bill.emoji}</span>
                <span className="text-sm font-medium truncate">{bill.name}</span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: bill.daysUntil <= 3
                      ? 'rgba(255, 217, 61, 0.12)'
                      : 'rgba(100, 255, 218, 0.08)',
                    color: bill.daysUntil <= 3 ? 'var(--chart-3)' : 'var(--secondary-foreground)',
                  }}
                >
                  {bill.daysUntil === 0
                    ? 'Today'
                    : bill.daysUntil === 1
                    ? 'Tomorrow'
                    : `${bill.daysUntil} days`}
                </span>
              </div>
              <span
                className="money-amount text-sm font-semibold flex-shrink-0 ml-2"
                style={{ color: bill.daysUntil <= 3 ? 'var(--chart-3)' : 'var(--primary)' }}
              >
                ${bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              All bills paid this month
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();

  // Redirect first-time users to onboarding
  useEffect(() => {
    try {
      if (!localStorage.getItem('grove-onboarding-complete')) {
        router.replace('/getting-started');
      }
    } catch { /* ignore */ }
  }, [router]);

  // State
  const [accounts, setAccounts] = useState<SafeAccount[]>(DEMO_ACCOUNTS);
  const [buckets, setBuckets] = useState<(BucketConfig & { virtualBalance?: number })[]>(DEMO_BUCKETS);
  const [masterAccountId, setMasterAccountId] = useState<string>('demo-checking');
  const [allocationResult, _setAllocationResult] = useState<AllocationResult | null>(null);
  const setAllocationResult = useCallback((val: AllocationResult | null) => {
    _setAllocationResult(val);
  }, []);
  const [flowData, setFlowData] = useState<FlowData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showBucketForm, setShowBucketForm] = useState(false);
  const [editingBucket, setEditingBucket] = useState<BucketConfig | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [isFlowAnimating, setIsFlowAnimating] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true); // Start true for demo mode
  const [hasAllocatedBefore, setHasAllocatedBefore] = useState(false);
  const [showMobileAllocate, setShowMobileAllocate] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'flow'>('tree');

  // Sound effects (disabled by default)
  const { play: playSound, enabled: soundEnabled, toggle: toggleSound } = useSoundEffects({ enabled: false });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewBucket: () => {
      setShowBucketForm(true);
      playSound('click');
    },
    onHelp: () => {
      toast.info('Keyboard shortcuts', {
        description: 'N = New bucket, A = Focus allocate, R = Refresh, ? = Help',
        duration: 5000,
      });
    },
  });

  // Pull-to-refresh handler
  useEffect(() => {
    let startY = 0;
    let pulling = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (pulling && e.changedTouches[0].clientY - startY > 80) {
        setIsPullRefreshing(true);
        // Simulate refresh — reload data
        window.dispatchEvent(new CustomEvent('grove-refresh'));
        setTimeout(() => setIsPullRefreshing(false), 1200);
      }
      pulling = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Check if first-time visitor — show onboarding wizard
  useEffect(() => {
    try {
      const completed = localStorage.getItem('grove-onboarding-completed');
      if (!completed) {
        setShowOnboarding(true);
        setHasCompletedOnboarding(false);
      }
    } catch {
      // localStorage unavailable, keep demo mode
    }
  }, []);

  // Get master account
  const masterAccount = accounts.find(a => a.accountId === masterAccountId);
  const externalAccounts = accounts.filter(a => a.accountId !== masterAccountId);

  // Generate Sankey preview data from current buckets (computed after masterAccount)
  const sankeyData = useMemo(() => {
    if (flowData.nodes.length > 0) return flowData;
    if (buckets.length === 0 || !masterAccount) return { nodes: [], links: [] };
    // Build a simple preview: estimate allocations from bucket config
    const balance = masterAccount.balance || 3850;
    let remaining = balance;
    const details: Array<{ bucketId: string; name: string; emoji?: string; allocationType: string; allocated: number; virtualBalance: number }> = [];
    const fixed = buckets.filter(b => b.allocationType === 'fixed_dollar');
    for (const b of fixed) { const a = Math.min(b.value, remaining); remaining -= a; details.push({ bucketId: b.bucketId, name: b.name, emoji: b.emoji, allocationType: b.allocationType, allocated: a, virtualBalance: a }); }
    const pctIncome = buckets.filter(b => b.allocationType === 'percent_of_income');
    for (const b of pctIncome) { const a = Math.min(balance * b.value, remaining); remaining -= a; details.push({ bucketId: b.bucketId, name: b.name, emoji: b.emoji, allocationType: b.allocationType, allocated: a, virtualBalance: a }); }
    const disc = buckets.filter(b => b.allocationType === 'percent_of_discretionary');
    const pool = remaining;
    for (const b of disc) { const a = pool * b.value; remaining -= a; details.push({ bucketId: b.bucketId, name: b.name, emoji: b.emoji, allocationType: b.allocationType, allocated: a, virtualBalance: a }); }
    return generateFlowData(balance, masterAccount.name || 'Main Account', details);
  }, [flowData, buckets, masterAccount]);

  // Demo allocation logic (client-side, no database required)
  const runDemoAllocation = useCallback((amount: number) => {
    let remaining = amount;
    const bucketDetails: Array<{
      bucketId: string;
      name: string;
      emoji?: string;
      allocationType: string;
      allocated: number;
      virtualBalance: number;
    }> = [];

    // Stage 1: Fixed dollar amounts
    const fixedBuckets = buckets.filter(b => b.allocationType === 'fixed_dollar');
    for (const bucket of fixedBuckets) {
      const allocated = Math.min(bucket.value, remaining);
      remaining -= allocated;
      bucketDetails.push({
        bucketId: bucket.bucketId,
        name: bucket.name,
        emoji: bucket.emoji,
        allocationType: bucket.allocationType,
        allocated,
        virtualBalance: (bucket.virtualBalance || 0) + allocated,
      });
    }

    // Stage 2: Percent of income
    const percentIncomeBuckets = buckets.filter(b => b.allocationType === 'percent_of_income');
    for (const bucket of percentIncomeBuckets) {
      const allocated = Math.min(amount * bucket.value, remaining);
      remaining -= allocated;
      bucketDetails.push({
        bucketId: bucket.bucketId,
        name: bucket.name,
        emoji: bucket.emoji,
        allocationType: bucket.allocationType,
        allocated,
        virtualBalance: (bucket.virtualBalance || 0) + allocated,
      });
    }

    // Stage 3: Percent of remainder
    const percentRemainderBuckets = buckets.filter(b => b.allocationType === 'percent_of_remainder');
    const remainderPool = remaining;
    for (const bucket of percentRemainderBuckets) {
      const allocated = Math.min(remainderPool * bucket.value, remaining);
      remaining -= allocated;
      bucketDetails.push({
        bucketId: bucket.bucketId,
        name: bucket.name,
        emoji: bucket.emoji,
        allocationType: bucket.allocationType,
        allocated,
        virtualBalance: (bucket.virtualBalance || 0) + allocated,
      });
    }

    // Stage 4: Percent of discretionary
    const discretionaryBuckets = buckets.filter(b => b.allocationType === 'percent_of_discretionary');
    const discretionaryPool = remaining;
    for (const bucket of discretionaryBuckets) {
      const allocated = discretionaryPool * bucket.value;
      remaining -= allocated;
      bucketDetails.push({
        bucketId: bucket.bucketId,
        name: bucket.name,
        emoji: bucket.emoji,
        allocationType: bucket.allocationType,
        allocated,
        virtualBalance: (bucket.virtualBalance || 0) + allocated,
      });
    }

    // Calculate summary categories
    const totalAllocated = amount - remaining;
    const savingsBuckets = bucketDetails.filter(b => 
      b.name.toLowerCase().includes('saving') || b.allocationType === 'percent_of_income'
    );
    const billsBuckets = bucketDetails.filter(b => 
      (b.allocationType === 'fixed_amount' || b.allocationType === 'fixed_dollar') && !b.name.toLowerCase().includes('saving')
    );
    const discretionary = bucketDetails.filter(b => 
      b.allocationType === 'percent_of_discretionary'
    );

    const totalToSavings = savingsBuckets.reduce((sum, b) => sum + b.allocated, 0);
    const totalToBills = billsBuckets.reduce((sum, b) => sum + b.allocated, 0);
    const totalToDiscretionary = discretionary.reduce((sum, b) => sum + b.allocated, 0);

    // Categorize bucket details for the Money Story
    const categorizedDetails = bucketDetails.map(b => {
      let category: 'savings' | 'bills' | 'discretionary' | 'other' = 'other';
      if (savingsBuckets.some(s => s.bucketId === b.bucketId)) category = 'savings';
      else if (billsBuckets.some(s => s.bucketId === b.bucketId)) category = 'bills';
      else if (discretionary.some(s => s.bucketId === b.bucketId)) category = 'discretionary';
      return { ...b, category };
    });

    return {
      totalIncome: amount,
      totalAllocated,
      unallocated: remaining,
      bucketDetails,
      summary: {
        totalIncome: amount,
        totalAllocated,
        totalToSavings,
        totalToBills,
        totalToDiscretionary,
        remainingUnallocated: remaining,
        savingsRate: amount > 0 ? totalToSavings / amount : 0,
        bucketDetails: categorizedDetails,
      },
    };
  }, [buckets]);

  // Handle allocation
  const handleAllocate = useCallback(async (amount: number): Promise<AllocationResult> => {
    setIsLoading(true);
    try {
      // Try API first, fall back to demo mode
      let result;
      try {
        const response = await fetch('/api/allocate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            incomeAmount: amount,
            userId: 'demo-user',
          }),
        });

        if (response.ok) {
          result = await response.json();
        } else {
          // Fall back to demo mode
          result = runDemoAllocation(amount);
        }
      } catch {
        // Network error, use demo mode
        result = runDemoAllocation(amount);
      }

      setAllocationResult(result);

      // Update bucket virtual balances
      if (result.bucketDetails) {
        setBuckets(prev => prev.map(bucket => {
          const detail = result.bucketDetails.find(
            (d: { bucketId: string }) => d.bucketId === bucket.bucketId
          );
          return detail ? { ...bucket, virtualBalance: detail.virtualBalance } : bucket;
        }));
      }

      // Generate flow visualization data
      const newFlowData = generateFlowData(
        amount,
        masterAccount?.name || 'Main Account',
        result.bucketDetails || []
      );
      setFlowData(newFlowData);
      setIsFlowAnimating(true);

      // Play success sound and celebration
      playSound('success');

      if (!hasAllocatedBefore) {
        // First allocation - extra special celebration!
        celebrations.firstAllocation();
        setHasAllocatedBefore(true);
        toast.success('Your tree is planted! 🌱', {
          description: 'This is your first allocation. Watch your branches grow!',
        });
      } else {
        celebrations.allocationComplete();
        toast.success('Your tree has been watered! 🌿', {
          description: `$${amount.toLocaleString()} is flowing through your branches.`,
        });
      }

      return result;
    } catch (error) {
      toast.error('Oops!', {
        description: friendlyError(error instanceof Error ? error : 'Unknown error'),
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [masterAccount?.name, runDemoAllocation, playSound, hasAllocatedBefore]);

  // Handle bucket creation
  const handleCreateBucket = async (bucketData: Omit<BucketConfig, 'id' | 'bucketId' | 'priority'>) => {
    // Check if we're in demo mode (using demo accounts)
    const isDemoMode = masterAccountId?.startsWith('demo-');
    
    if (isDemoMode) {
      // Demo mode: create bucket locally without API
      const newBucket: BucketConfig & { virtualBalance?: number } = {
        id: `bucket-${Date.now()}`,
        bucketId: `bucket-${Date.now()}`,
        name: bucketData.name,
        emoji: bucketData.emoji,
        description: bucketData.description,
        allocationType: bucketData.allocationType,
        value: bucketData.value,
        priority: buckets.length + 1,
        targetExternalAccountId: bucketData.targetExternalAccountId,
        virtualBalance: 0,
      };
      
      setBuckets(prev => [...prev, newBucket]);
      
      // Play celebration for new bucket
      playSound('coin');
      celebrations.bucketCreated();
      
      toast.success('A new branch is growing! 🌱', {
        description: `"${newBucket.name}" has been added to your tree.`,
      });
      return;
    }
    
    // Real mode: use API
    try {
      const response = await fetch('/api/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'demo-user',
          ...bucketData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create bucket');
      }

      const { bucket } = await response.json();
      setBuckets(prev => [...prev, bucket]);

      // Play celebration for new bucket
      playSound('coin');
      celebrations.bucketCreated();

      toast.success('A new branch is growing! 🌱', {
        description: `"${bucket.name}" has been added to your tree.`,
      });
    } catch (error) {
      toast.error('Oops!', {
        description: friendlyError(error instanceof Error ? error : 'Unknown error'),
      });
    }
  };

  // Handle bucket deletion
  const handleDeleteBucket = async (bucketId: string) => {
    // Check if we're in demo mode
    const isDemoMode = bucketId?.startsWith('demo-') || bucketId?.startsWith('bucket-');
    
    if (isDemoMode) {
      // Demo mode: delete locally
      setBuckets(prev => prev.filter(b => b.bucketId !== bucketId));
      toast.success('Branch pruned');
      return;
    }
    
    // Real mode: use API
    try {
      const response = await fetch(`/api/buckets/${bucketId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete bucket');
      }

      setBuckets(prev => prev.filter(b => b.bucketId !== bucketId));
      toast.success('Branch pruned');
    } catch (error) {
      toast.error('Oops!', {
        description: friendlyError(error instanceof Error ? error : 'Unknown error'),
      });
    }
  };

  // Handle master account selection
  const handleSelectMasterAccount = async (accountId: string) => {
    // Check if we're in demo mode
    const isDemoMode = accountId?.startsWith('demo-') || masterAccountId?.startsWith('demo-');

    if (isDemoMode) {
      // Demo mode: update locally without API
      setAccounts(prev => prev.map(a => ({
        ...a,
        isMaster: a.accountId === accountId,
      })));
      setMasterAccountId(accountId);
      setShowAccountSelector(false);
      toast.success('Master account updated');
      return;
    }

    // Real mode: use API
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          userId: 'demo-user',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to set master account');
      }

      setMasterAccountId(accountId);
      setShowAccountSelector(false);
      toast.success('Master account updated');
    } catch (error) {
      toast.error('Oops!', {
        description: friendlyError(error instanceof Error ? error : 'Unknown error'),
      });
    }
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load accounts
        const accountsRes = await fetch('/api/accounts?userId=demo-user');
        if (accountsRes.ok) {
          const { accounts: loadedAccounts } = await accountsRes.json();
          if (loadedAccounts.length > 0) {
            setAccounts(loadedAccounts);
            const master = loadedAccounts.find((a: SafeAccount) => a.isMaster);
            if (master) {
              setMasterAccountId(master.accountId);
            }
          }
        }

        // Load buckets
        const bucketsRes = await fetch('/api/buckets?userId=demo-user');
        if (bucketsRes.ok) {
          const { buckets: loadedBuckets } = await bucketsRes.json();
          if (loadedBuckets.length > 0) {
            setBuckets(loadedBuckets);
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, []);

  // Helper to get totalIncome from either demo result or proper AllocationResult
  const getTotalIncome = useCallback(() => {
    if (!allocationResult) return 0;
    // Demo mode returns totalIncome at root, proper API returns it in summary
    return (allocationResult as unknown as { totalIncome?: number }).totalIncome 
      || allocationResult.summary?.totalIncome 
      || 0;
  }, [allocationResult]);

  // Memoize tree branches to prevent Canvas remounting
  const treeBranches = useMemo(() => {
    const colors = ['var(--primary)', 'var(--chart-2)', 'var(--chart-5)', 'var(--chart-3)', 'var(--destructive)'];
    const totalIncome = getTotalIncome();
    return buckets.map((bucket, index) => {
      let percentage = 0;
      if (bucket.allocationType === 'percent_of_income') {
        percentage = bucket.value * 100;
      } else if (bucket.allocationType === 'fixed_dollar' && totalIncome > 0) {
        percentage = (bucket.value / totalIncome) * 100;
      } else if (bucket.allocationType === 'percent_of_discretionary') {
        percentage = bucket.value * 50;
      } else if (bucket.allocationType === 'percent_of_remainder') {
        percentage = bucket.value * 30;
      } else {
        percentage = 100 / Math.max(buckets.length, 1);
      }
      
      return {
        id: bucket.bucketId,
        name: `${bucket.emoji || ''} ${bucket.name}`.trim(),
        amount: bucket.virtualBalance || 0,
        percentage: Math.min(percentage, 100),
        color: colors[index % colors.length],
      };
    });
  }, [buckets, getTotalIncome]);

  // Memoize branch click handler
  const handleBranchClick = useCallback((branch: { id: string }) => {
    const bucket = buckets.find(b => b.bucketId === branch.id);
    if (bucket) {
      setEditingBucket(bucket);
      setShowBucketForm(true);
      playSound('click');
    }
  }, [buckets, playSound]);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Loading overlay for allocations */}
      {isLoading && (
        <LoadingOverlay text="Allocating your income..." />
      )}

      {/* Header */}
      <AppHeader
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOnboarding(true)}
              className="hidden sm:flex"
              aria-label="Connect bank account"
            >
              <Building2 className="h-4 w-4 mr-2" aria-hidden="true" />
              Connect Bank
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              className="min-w-[44px] min-h-[44px]"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowOnboarding(true)}
              aria-label="Settings and setup wizard"
              className="min-w-[44px] min-h-[44px]"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Button>
          </>
        }
      />

      {/* Main Content */}
      <main id="main-content" className="container mx-auto py-6 px-4 max-w-7xl" role="main">
        {/* Pull-to-refresh indicator */}
        {isPullRefreshing && (
          <div className="flex justify-center py-3 -mt-2 mb-2" aria-live="polite">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Refreshing...</span>
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {getGreeting().text}! {getGreeting().emoji}
          </h1>
          <p className="text-muted-foreground mt-1">
            Let&apos;s see how your money is flowing today.
          </p>
        </div>

        {/* Master Account Info */}
        {masterAccount && (
          <Card className="mb-6" role="region" aria-label="Master account overview">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Master Account</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {masterAccount.nickname || masterAccount.name}
                    {masterAccount.mask && ` (****${masterAccount.mask})`}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-xl sm:text-2xl font-bold money-amount">
                    ${masterAccount.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAccountSelector(true)}
                  aria-label="Change master account"
                  className="self-start sm:self-center min-h-[44px] min-w-[44px]"
                >
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Allocation Panel (hidden on mobile, shown in sheet) */}
          <div className="hidden lg:block lg:col-span-1">
            <AllocationPanel
              onAllocate={handleAllocate}
              isLoading={isLoading}
              lastResult={allocationResult}
              masterBalance={masterAccount?.balance}
            />
          </div>

          {/* Right Column - 3D Tree Visualization (full width on mobile) */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-0 shadow-2xl grove-card-glow" role="region" aria-label="Money tree visualization">
              <CardHeader className="bg-gradient-to-r from-[#0a1628] to-[#0d2137] text-white border-b border-white/10 py-3">
                <CardTitle className="text-[#e8f4f0] text-base">Your Money Tree</CardTitle>
                <CardDescription className="text-secondary-foreground text-xs">
                  Rotate to explore · Tap branches to edit
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden rounded-b-lg">
                <div className="h-[350px] sm:h-[500px] min-h-[350px]">
                  <MoneyTree3D
                    branches={treeBranches}
                    totalIncome={getTotalIncome() || masterAccount?.balance || 0}
                    healthScore={75}
                    autoRotate={!isFlowAnimating}
                    onBranchClick={handleBranchClick}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mobile: Quick Allocate button below tree */}
            <div className="mt-4 lg:hidden">
              <Button
                className="w-full min-h-[48px] text-base"
                onClick={() => setShowMobileAllocate(true)}
                aria-label="Open allocation panel"
              >
                <Droplets className="h-5 w-5 mr-2" aria-hidden="true" />
                Water Your Tree
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Allocation Sheet */}
        <Sheet open={showMobileAllocate} onOpenChange={setShowMobileAllocate}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Water Your Tree</SheetTitle>
              <SheetDescription>Allocate income across your branches</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <AllocationPanel
                onAllocate={async (amount) => {
                  const result = await handleAllocate(amount);
                  setShowMobileAllocate(false);
                  return result;
                }}
                isLoading={isLoading}
                lastResult={allocationResult}
                masterBalance={masterAccount?.balance}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Monthly Summary */}
        {allocationResult && allocationResult.summary && (
          <div className="grid gap-4 sm:grid-cols-3 mt-6" role="region" aria-label="Monthly allocation summary">
            <Card className="grove-card-glow">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Allocated This Month</p>
                <p className="text-2xl font-bold money-amount mt-1">
                  ${allocationResult.summary.totalAllocated?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                </p>
              </CardContent>
            </Card>
            <Card className="grove-card-glow">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Savings Rate</p>
                <p className="text-2xl font-bold mt-1" style={{ color: 'var(--primary)' }}>
                  {Math.round((allocationResult.summary.savingsRate || 0) * 100)}%
                </p>
              </CardContent>
            </Card>
            <Card className="grove-card-glow">
              <CardContent className="pt-6 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Biggest Category</p>
                <p className="text-2xl font-bold mt-1">
                  {(() => {
                    const result = allocationResult as AllocationResult & { bucketDetails?: Array<{ allocated: number; emoji?: string; name: string }> };
                    const details = result.summary?.bucketDetails || result.bucketDetails || [];
                    if (details.length === 0) return '—';
                    const biggest = details.reduce((max: { allocated: number; emoji?: string; name: string }, b: { allocated: number; emoji?: string; name: string }) =>
                      b.allocated > max.allocated ? b : max, details[0]);
                    return `${biggest.emoji || ''} ${biggest.name}`;
                  })()}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator className="my-8" />

        {/* Flow View Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tree')}
            className="min-h-[36px]"
          >
            <TreePine className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Branches
          </Button>
          <Button
            variant={viewMode === 'flow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('flow')}
            className="min-h-[36px]"
          >
            <Waves className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Flow View
          </Button>
        </div>

        {/* Sankey Flow Visualization */}
        {viewMode === 'flow' && (
          <section aria-label="Money flow visualization" className="mb-8">
            <Card className="grove-card-glow overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Money Flow</CardTitle>
                <CardDescription>
                  Watch how your income flows into each branch
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sankeyData.nodes.length > 0 ? (
                  <AnimatedSankey
                    data={sankeyData}
                    height={400}
                    animated={isFlowAnimating}
                    onAnimationComplete={() => setIsFlowAnimating(false)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Waves className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">Allocate income to see your money flow</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Buckets Section */}
        {viewMode === 'tree' && (
        <section aria-label="Your budget branches">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Your Branches</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Each branch grows your money toward a purpose
              </p>
            </div>
            <AnimatedButton
              onClick={() => { setShowBucketForm(true); playSound('click'); }}
              className="hidden sm:flex min-h-[44px]"
              aria-label="Create a new budget branch"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Grow Branch
            </AnimatedButton>
          </div>

          {buckets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {buckets.map((bucket) => (
                <motion.div
                  key={bucket.bucketId}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -100) {
                      handleDeleteBucket(bucket.bucketId);
                    }
                  }}
                  className="touch-pan-y"
                >
                  <BucketCard
                    bucket={bucket}
                    onEdit={(b) => {
                      setEditingBucket(b);
                      setShowBucketForm(true);
                    }}
                    onDelete={handleDeleteBucket}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <AnimatedCard>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <motion.div
                  className="text-6xl mb-4"
                  animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  💸
                </motion.div>
                <p className="text-lg font-medium mb-2">Your money is waiting!</p>
                <p className="text-muted-foreground mb-4 text-center max-w-sm">
                  Create your first bucket to tell your income where to go.
                </p>
                <AnimatedButton
                  onClick={() => { setShowBucketForm(true); playSound('click'); }}
                  aria-label="Create your first budget bucket"
                  className="min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Create Your First Bucket
                </AnimatedButton>
              </CardContent>
            </AnimatedCard>
          )}
        </section>
        )}

        {/* Budget Summary */}
        {allocationResult && allocationResult.summary && (
          <div className="mt-8">
            <BudgetSummaryCard summary={allocationResult.summary} />
          </div>
        )}

        {/* Goals Overview */}
        <GoalsOverview />

        {/* Upcoming Bills */}
        <UpcomingBills />
      </main>

      {/* Mobile Floating Action Button */}
      <motion.div
        className="fixed bottom-6 right-6 md:hidden z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
      >
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg shadow-primary/25"
          onClick={() => {
            setShowBucketForm(true);
            playSound('click');
          }}
          aria-label="Add new branch"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Button>
      </motion.div>

      {/* Bucket Form Dialog */}
      <BucketForm
        open={showBucketForm}
        onOpenChange={(open) => {
          setShowBucketForm(open);
          if (!open) setEditingBucket(null);
        }}
        onSubmit={handleCreateBucket}
        editBucket={editingBucket}
        externalAccounts={externalAccounts}
        bucketCount={buckets.length}
      />

      {/* Account Selector Dialog */}
      {showAccountSelector && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
          role="dialog"
          aria-label="Select master account"
          aria-modal="true"
        >
          <div className="w-full max-w-md p-4">
            <AccountSelector
              accounts={accounts}
              selectedAccountId={masterAccountId}
              onSelect={handleSelectMasterAccount}
            />
            <Button
              variant="outline"
              className="w-full mt-4 min-h-[44px]"
              onClick={() => setShowAccountSelector(false)}
              aria-label="Cancel account selection"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] bg-background">
          <OnboardingWizard
            onComplete={(data) => {
              // Update state with onboarding data
              if (data.accounts.length > 0) {
                setAccounts(data.accounts);
              }
              if (data.buckets.length > 0) {
                setBuckets(data.buckets.map(b => ({ ...b, virtualBalance: 0 })));
              }
              if (data.masterAccountId) {
                setMasterAccountId(data.masterAccountId);
              }
              setHasCompletedOnboarding(true);
              setShowOnboarding(false);
              localStorage.setItem('grove-onboarding-completed', 'true');
              toast.success('Your grove is ready! 🌳', {
                description: 'Time to plant your first branches.',
              });
            }}
            onSkip={() => {
              // Keep demo data
              setShowOnboarding(false);
              toast.info('Using demo data', {
                description: 'You can connect a real bank account anytime from Settings.',
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
