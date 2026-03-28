'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, TreePine, Droplets, ChevronDown, ChevronUp } from 'lucide-react';
import type { AllocationResult, AllocationSummary, BucketDetail } from '@/types';

// --- Money Story Generator ---

function generateMoneyStory(summary: AllocationSummary): string {
  const { totalIncome, totalToSavings, totalToBills, totalToDiscretionary, 
          remainingUnallocated, savingsRate, bucketDetails } = summary;

  const fmt = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const pct = (n: number) => Math.round(n * 100) + '%';

  const parts: string[] = [];

  // Opening — varies by allocation health
  if (remainingUnallocated === 0) {
    parts.push('Every dollar found a home. 🌿');
  } else if (remainingUnallocated > 0) {
    parts.push(`Your tree soaked up most of the water — ${fmt(remainingUnallocated)} is still pooling at the roots.`);
  }

  // Bills section — the roots
  if (totalToBills > 0) {
    const billBuckets = bucketDetails.filter(b => b.category === 'bills');
    if (billBuckets.length === 1) {
      parts.push(`${billBuckets[0].emoji} ${billBuckets[0].name} is covered at ${fmt(billBuckets[0].allocated)} — your roots are strong.`);
    } else if (billBuckets.length > 1) {
      const billList = billBuckets.map(b => `${b.emoji} ${b.name} (${fmt(b.allocated)})`).join(' and ');
      parts.push(`${billList} — ${fmt(totalToBills)} keeps your roots deep and steady.`);
    }
  }

  // Savings section — the growth rings
  if (totalToSavings > 0) {
    const savingsBuckets = bucketDetails.filter(b => b.category === 'savings');
    const savingsName = savingsBuckets.length > 0 ? savingsBuckets[0].name : 'Savings';
    const savingsEmoji = savingsBuckets.length > 0 ? savingsBuckets[0].emoji : '🌱';
    
    if (savingsRate >= 0.30) {
      parts.push(`${savingsEmoji} ${fmt(totalToSavings)} flows to ${savingsName} — that's ${pct(savingsRate)} of your income. Your tree is flourishing.`);
    } else if (savingsRate >= 0.20) {
      parts.push(`${savingsEmoji} ${fmt(totalToSavings)} climbs to ${savingsName} — ${pct(savingsRate)} is the golden rule, and you're right there.`);
    } else if (savingsRate >= 0.10) {
      parts.push(`${savingsEmoji} ${fmt(totalToSavings)} reaches ${savingsName} — ${pct(savingsRate)} and growing. Every ring makes the trunk stronger.`);
    } else if (savingsRate > 0) {
      parts.push(`${savingsEmoji} ${fmt(totalToSavings)} finds its way to ${savingsName}. Small roots grow into mighty trunks.`);
    }
  }

  // Discretionary section — the canopy
  if (totalToDiscretionary > 0) {
    const discBuckets = bucketDetails.filter(b => b.category === 'discretionary');
    if (discBuckets.length === 1) {
      parts.push(`The rest — ${fmt(totalToDiscretionary)} — fills your ${discBuckets[0].emoji} ${discBuckets[0].name} branch. Spend it without guilt.`);
    } else if (discBuckets.length > 0) {
      const discList = discBuckets.map(b => `${b.emoji} ${b.name} (${fmt(b.allocated)})`).join(' and ');
      parts.push(`Your canopy spreads: ${discList}. This is the part that makes the tree worth sitting under.`);
    }
  }

  return parts.join('\n\n');
}

function getSavingsVerdict(rate: number): { icon: string; label: string; color: string } {
  if (rate >= 0.30) return { icon: '🏆', label: 'Thriving', color: 'text-emerald-400' };
  if (rate >= 0.20) return { icon: '⭐', label: 'Healthy', color: 'text-green-400' };
  if (rate >= 0.10) return { icon: '💪', label: 'Growing', color: 'text-lime-400' };
  if (rate > 0) return { icon: '🌱', label: 'Sprouting', color: 'text-yellow-400' };
  return { icon: '📋', label: 'Planned', color: 'text-muted-foreground' };
}

// --- Component ---

interface AllocationPanelProps {
  onAllocate: (amount: number) => Promise<AllocationResult>;
  isLoading?: boolean;
  lastResult?: AllocationResult | null;
  masterBalance?: number;
}

export function AllocationPanel({
  onAllocate,
  isLoading = false,
  lastResult,
  masterBalance,
}: AllocationPanelProps) {
  const [incomeAmount, setIncomeAmount] = useState('');
  const [error, setError] = useState('');
  const [showNumbers, setShowNumbers] = useState(false);
  const [presetMode, setPresetMode] = useState<'paycheck' | 'custom'>('paycheck');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = presetMode === 'paycheck' && masterBalance
      ? masterBalance
      : parseFloat(incomeAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    try {
      await onAllocate(amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Allocation failed');
    }
  };

  const summary = lastResult?.summary as AllocationSummary | undefined;
  const fmt = (n: number) => '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      {/* Income Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-400" />
            Water Your Tree
          </CardTitle>
          <CardDescription>
            How much income are you working with? Watch it flow through your branches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Preset Amount Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPresetMode('paycheck');
                  if (masterBalance) setIncomeAmount(masterBalance.toString());
                }}
                className={`flex-1 text-sm py-2 px-3 rounded-lg border transition-all ${
                  presetMode === 'paycheck'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                This Paycheck
              </button>
              <button
                type="button"
                onClick={() => {
                  setPresetMode('custom');
                  setIncomeAmount('');
                }}
                className={`flex-1 text-sm py-2 px-3 rounded-lg border transition-all ${
                  presetMode === 'custom'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                Custom Amount
              </button>
            </div>

            {presetMode === 'paycheck' && masterBalance ? (
              <div className="text-center py-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground">Full checking balance</p>
                <p className="text-2xl font-bold money-amount mt-1">
                  ${masterBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="income">Income Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="income"
                      type="number"
                      step="0.01"
                      min="0"
                      value={incomeAmount}
                      onChange={(e) => setIncomeAmount(e.target.value)}
                      placeholder="2,800.00"
                      className="pl-7 text-lg"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Quick explore slider */}
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Quick explore</Label>
                  <Slider
                    min={500}
                    max={10000}
                    step={100}
                    value={[parseFloat(incomeAmount) || 2800]}
                    onValueChange={([val]) => setIncomeAmount(val.toString())}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Drag to see how different amounts flow
                  </p>
                </div>
              </>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || (!incomeAmount && !(presetMode === 'paycheck' && masterBalance))}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Flowing...
                </>
              ) : (
                <>
                  <Droplets className="h-4 w-4 mr-2" />
                  {presetMode === 'paycheck' && masterBalance ? 'Quick Allocate' : 'Let It Flow'}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Money Story */}
      {summary && (
        <Card className="border-green-900/30 bg-gradient-to-b from-card to-green-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-5 w-5 text-green-400" />
              Your Money Story
            </CardTitle>
            {summary.savingsRate > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{getSavingsVerdict(summary.savingsRate).icon}</span>
                <span className={`text-sm font-medium ${getSavingsVerdict(summary.savingsRate).color}`}>
                  Tree Health: {getSavingsVerdict(summary.savingsRate).label}
                </span>
                <span className="text-sm text-muted-foreground">
                  · {Math.round(summary.savingsRate * 100)}% savings rate
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* The Narrative */}
            <div className="text-sm leading-relaxed space-y-3">
              {generateMoneyStory(summary).split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-muted-foreground">{paragraph}</p>
              ))}
            </div>

            {/* Branch Breakdown — visual bars */}
            <div className="space-y-2 pt-2">
              {summary.bucketDetails.map((bucket) => {
                const pct = summary.totalIncome > 0 ? (bucket.allocated / summary.totalIncome) * 100 : 0;
                const barColor = bucket.category === 'savings' 
                  ? 'bg-emerald-500' 
                  : bucket.category === 'bills' 
                    ? 'bg-amber-600' 
                    : 'bg-blue-500';
                return (
                  <div key={bucket.bucketId} className="group">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">
                        {bucket.emoji} {bucket.name}
                      </span>
                      <span className="font-medium money-amount">
                        {fmt(bucket.allocated)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-700`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Collapsible number grid */}
            <button
              onClick={() => setShowNumbers(!showNumbers)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2 w-full justify-center"
            >
              {showNumbers ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showNumbers ? 'Hide numbers' : 'See the numbers'}
            </button>

            {showNumbers && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Income</p>
                  <p className="text-lg font-bold money-amount">{fmt(summary.totalIncome)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Allocated</p>
                  <p className="text-lg font-bold money-amount">{fmt(summary.totalAllocated)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">To Savings</p>
                  <p className="text-base font-semibold text-emerald-400 money-amount">{fmt(summary.totalToSavings)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">To Bills</p>
                  <p className="text-base font-semibold text-amber-400 money-amount">{fmt(summary.totalToBills)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Discretionary</p>
                  <p className="text-base font-semibold text-blue-400 money-amount">{fmt(summary.totalToDiscretionary)}</p>
                </div>
                {summary.remainingUnallocated > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Unallocated</p>
                    <p className="text-base font-semibold text-orange-400 money-amount">{fmt(summary.remainingUnallocated)}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
