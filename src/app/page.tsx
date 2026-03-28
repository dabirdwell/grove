'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AnimatedSankey, generateFlowData } from '@/components/flow';
import dynamic from 'next/dynamic';

// Dynamic import for 3D tree (needs to avoid SSR)
const MoneyTree3D = dynamic(
  () => import('@/components/money-tree-3d').then(mod => mod.MoneyTree3D),
  { ssr: false, loading: () => <TreeLoadingState /> }
);

// Loading state for 3D tree
function TreeLoadingState() {
  return (
    <div 
      className="flex items-center justify-center h-[400px] rounded-lg"
      style={{ background: 'linear-gradient(to bottom, #0a1628, #134e5e)' }}
    >
      <div className="text-center">
        <div 
          className="w-3 h-3 rounded-full mx-auto mb-3 animate-pulse"
          style={{ backgroundColor: '#64ffda' }}
        />
        <p style={{ color: '#64ffda', opacity: 0.7 }}>
          Growing...
        </p>
      </div>
    </div>
  );
}
import { BucketCard, BucketForm } from '@/components/buckets';
import { AllocationPanel, AccountSelector } from '@/components/dashboard';
import { AnimatedButton } from '@/components/ui/animated-button';
import { AnimatedCard } from '@/components/ui/animated-card';
import { celebrations } from '@/components/ui/confetti';
import { Skeleton, LoadingOverlay } from '@/components/ui/loading';
import { OnboardingWizard } from '@/components/onboarding';
import { PlaidLinkButton } from '@/components/plaid';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { friendlyError } from '@/lib/friendly-errors';
import { toast } from 'sonner';
import {
  Plus,
  Wallet,
  Settings,
  HelpCircle,
  RefreshCw,
  Volume2,
  VolumeX,
  Building2,
  TreeDeciduous,
} from 'lucide-react';
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

export default function Dashboard() {
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

  // Get master account
  const masterAccount = accounts.find(a => a.accountId === masterAccountId);
  const externalAccounts = accounts.filter(a => a.accountId !== masterAccountId);

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
    const colors = ['#64FFDA', '#4FD1C5', '#81E6D9', '#FFD93D', '#FF6B6B'];
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
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Grove</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOnboarding(true)}
              className="hidden sm:flex"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Connect Bank
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowOnboarding(true)} title="Setup Wizard">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            {getGreeting().text}! {getGreeting().emoji}
          </h1>
          <p className="text-muted-foreground mt-1">
            Let&apos;s see how your money is flowing today.
          </p>
        </div>

        {/* Master Account Info */}
        {masterAccount && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Master Account</p>
                  <p className="text-lg font-semibold">
                    {masterAccount.nickname || masterAccount.name}
                    {masterAccount.mask && ` (****${masterAccount.mask})`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold money-amount">
                    ${masterAccount.balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAccountSelector(true)}
                >
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Allocation Panel */}
          <div className="lg:col-span-1">
            <AllocationPanel
              onAllocate={handleAllocate}
              isLoading={isLoading}
              lastResult={allocationResult}
              masterBalance={masterAccount?.balance}
            />
          </div>

          {/* Right Column - 3D Tree Visualization */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-0 shadow-2xl grove-card-glow">
              <CardHeader className="bg-gradient-to-r from-[#0a1628] to-[#0d2137] text-white border-b border-white/10 py-3">
                <CardTitle className="text-[#e8f4f0] text-base">Your Money Tree</CardTitle>
                <CardDescription className="text-[#a8c5ba] text-xs">
                  Rotate to explore · Click branches to edit
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-hidden rounded-b-lg">
                <div className="h-[350px] sm:h-[500px]">
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
          </div>
        </div>

        {/* Monthly Summary */}
        {allocationResult && allocationResult.summary && (
          <div className="grid gap-4 sm:grid-cols-3 mt-6">
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
                <p className="text-2xl font-bold mt-1" style={{ color: '#64ffda' }}>
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

        {/* Buckets Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Your Branches</h2>
              <p className="text-muted-foreground">
                Each branch grows your money toward a purpose
              </p>
            </div>
            <AnimatedButton onClick={() => { setShowBucketForm(true); playSound('click'); }}>
              <Plus className="h-4 w-4 mr-2" />
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
                <AnimatedButton onClick={() => { setShowBucketForm(true); playSound('click'); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Bucket
                </AnimatedButton>
              </CardContent>
            </AnimatedCard>
          )}
        </div>
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
          className="rounded-full w-14 h-14 shadow-lg"
          onClick={() => {
            setShowBucketForm(true);
            playSound('click');
          }}
        >
          <Plus className="h-6 w-6" />
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
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-md p-4">
            <AccountSelector
              accounts={accounts}
              selectedAccountId={masterAccountId}
              onSelect={handleSelectMasterAccount}
            />
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowAccountSelector(false)}
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
