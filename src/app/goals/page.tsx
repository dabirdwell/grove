'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TreeDeciduous, ArrowLeft, Plus, Target, Sprout } from 'lucide-react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO date string
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'grove-savings-goals';

const EMOJI_PRESETS = ['🏖️', '🛋️', '🚗', '🛡️', '🎓', '🏠'];

const DEMO_GOALS: SavingsGoal[] = [
  {
    id: 'goal-emergency',
    name: 'Emergency Fund',
    emoji: '🛡️',
    targetAmount: 5000,
    currentAmount: 2100,
    createdAt: '2025-11-01',
  },
  {
    id: 'goal-vacation',
    name: 'Vacation',
    emoji: '🏖️',
    targetAmount: 3000,
    currentAmount: 800,
    deadline: '2026-12-01',
    createdAt: '2026-01-15',
  },
  {
    id: 'goal-couch',
    name: 'New Couch',
    emoji: '🛋️',
    targetAmount: 1200,
    currentAmount: 450,
    deadline: '2026-08-01',
    createdAt: '2026-02-01',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getEncouragingMessage(name: string, percent: number): string {
  if (percent >= 100) return `${name} is fully grown! 🌳`;
  if (percent >= 75) return `${name} is almost there — keep watering!`;
  if (percent >= 50) return `${name} is blooming nicely!`;
  if (percent >= 25) return `${name} is sprouting strong 🌱`;
  return `${name} has been planted — watch it grow!`;
}

function getDeadlineLabel(deadline: string): { text: string; onTrack: boolean } {
  const now = new Date();
  const target = new Date(deadline);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Past deadline', onTrack: false };
  if (diffDays === 0) return { text: 'Due today', onTrack: false };
  if (diffDays < 30) return { text: `${diffDays} days to go`, onTrack: diffDays > 7 };
  const months = Math.round(diffDays / 30);
  return { text: `${months} month${months === 1 ? '' : 's'} to go`, onTrack: true };
}

function monthsBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
}

function estimateCompletion(goal: SavingsGoal): string | null {
  if (goal.currentAmount >= goal.targetAmount) return null;
  if (goal.currentAmount <= 0) return null;

  const created = new Date(goal.createdAt);
  const now = new Date();
  const monthsElapsed = monthsBetween(created, now);
  const ratePerMonth = goal.currentAmount / monthsElapsed;

  if (ratePerMonth <= 0) return null;

  const remaining = goal.targetAmount - goal.currentAmount;
  const monthsLeft = Math.ceil(remaining / ratePerMonth);

  const completionDate = new Date();
  completionDate.setMonth(completionDate.getMonth() + monthsLeft);

  return completionDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Circular Progress Ring
// ---------------------------------------------------------------------------

function ProgressRing({ percent, size = 80, stroke = 6 }: { percent: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(percent, 100);
  const offset = circumference - (clampedPercent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--secondary)"
        strokeWidth={stroke}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#64FFDA"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Goal Card
// ---------------------------------------------------------------------------

function GoalCard({
  goal,
  onAddFunds,
}: {
  goal: SavingsGoal;
  onAddFunds: (goalId: string) => void;
}) {
  const percent = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const deadline = goal.deadline ? getDeadlineLabel(goal.deadline) : null;
  const estimated = estimateCompletion(goal);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <Card className="grove-card-glow overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {/* Progress Ring */}
            <div className="relative flex-shrink-0">
              <ProgressRing percent={percent} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg">{goal.emoji}</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{goal.name}</h3>
              <p className="text-2xl font-bold money-amount mt-1" style={{ color: '#64FFDA' }}>
                {percent}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
              </p>

              {/* Remaining */}
              <p className="text-sm text-muted-foreground mt-2">
                {remaining > 0
                  ? <>{formatCurrency(remaining)} remaining</>
                  : <span style={{ color: '#64FFDA' }}>Goal reached!</span>
                }
              </p>

              {/* Deadline / Estimate */}
              {deadline && (
                <p className="text-xs mt-1" style={{ color: deadline.onTrack ? '#64FFDA' : '#FF6B6B' }}>
                  {deadline.onTrack ? 'On track!' : 'Behind schedule'} · {deadline.text}
                </p>
              )}
              {!deadline && estimated && (
                <p className="text-xs text-muted-foreground mt-1">
                  Est. completion: {estimated}
                </p>
              )}
            </div>
          </div>

          {/* Encouraging message */}
          <p className="text-xs text-muted-foreground mt-3 italic">
            {getEncouragingMessage(goal.name, percent)}
          </p>

          {/* Linear progress bar */}
          <div className="mt-3 h-2 rounded-full overflow-hidden bg-secondary">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: percent >= 100 ? '#FFD93D' : '#64FFDA' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(percent, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {/* Add Funds button */}
          {remaining > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 min-h-[44px]"
              onClick={() => onAddFunds(goal.id)}
            >
              <Sprout className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Funds
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Add Goal Modal
// ---------------------------------------------------------------------------

function AddGoalModal({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_PRESETS[0]);
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  const handleSubmit = () => {
    const target = parseFloat(targetAmount);
    if (!name.trim() || isNaN(target) || target <= 0) return;

    onSubmit({
      name: name.trim(),
      emoji,
      targetAmount: target,
      deadline: deadline || undefined,
    });

    // Reset
    setName('');
    setEmoji(EMOJI_PRESETS[0]);
    setTargetAmount('');
    setDeadline('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plant a New Goal</DialogTitle>
          <DialogDescription>What are you growing toward?</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div>
            <Label htmlFor="goal-name">Goal Name</Label>
            <Input
              id="goal-name"
              placeholder="e.g. Dream Vacation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <Label>Choose an Icon</Label>
            <div className="flex gap-2 mt-1">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all min-w-[44px] min-h-[44px] ${
                    emoji === e
                      ? 'ring-2 ring-primary bg-secondary scale-110'
                      : 'bg-muted hover:bg-secondary'
                  }`}
                  aria-label={`Select ${e} emoji`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Target Amount */}
          <div>
            <Label htmlFor="goal-target">Target Amount ($)</Label>
            <Input
              id="goal-target"
              type="number"
              placeholder="1000"
              min="1"
              step="any"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Deadline (optional) */}
          <div>
            <Label htmlFor="goal-deadline">Deadline (optional)</Label>
            <Input
              id="goal-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !targetAmount || parseFloat(targetAmount) <= 0}
            className="min-h-[44px]"
          >
            <Sprout className="h-4 w-4 mr-2" aria-hidden="true" />
            Plant Goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add Funds Modal
// ---------------------------------------------------------------------------

function AddFundsModal({
  open,
  onOpenChange,
  goal,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: SavingsGoal | null;
  onSubmit: (goalId: string, amount: number) => void;
}) {
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    if (!goal) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return;

    onSubmit(goal.id, value);
    setAmount('');
    onOpenChange(false);
  };

  if (!goal) return null;

  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Water Your Goal</DialogTitle>
          <DialogDescription>
            Add funds to {goal.emoji} {goal.name}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Remaining to grow</p>
            <p className="text-2xl font-bold money-amount" style={{ color: '#64FFDA' }}>
              {formatCurrency(remaining)}
            </p>
          </div>

          <div>
            <Label htmlFor="fund-amount">Amount ($)</Label>
            <Input
              id="fund-amount"
              type="number"
              placeholder="50"
              min="0.01"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>

          {/* Quick amounts */}
          <div className="flex gap-2 flex-wrap">
            {[25, 50, 100, 250].map((preset) => (
              <Button
                key={preset}
                variant="secondary"
                size="sm"
                className="min-h-[44px]"
                onClick={() => setAmount(String(preset))}
              >
                ${preset}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[44px]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) <= 0}
            className="min-h-[44px]"
          >
            <Sprout className="h-4 w-4 mr-2" aria-hidden="true" />
            Add Funds
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Goals Page
// ---------------------------------------------------------------------------

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [fundingGoalId, setFundingGoalId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage (seed demo goals on first visit)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setGoals(JSON.parse(stored));
      } else {
        setGoals(DEMO_GOALS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_GOALS));
      }
    } catch {
      setGoals(DEMO_GOALS);
    }
    setLoaded(true);
  }, []);

  // Persist changes
  const persist = useCallback((updated: SavingsGoal[]) => {
    setGoals(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage full — silently ignore
    }
  }, []);

  const handleAddGoal = useCallback((data: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>) => {
    const newGoal: SavingsGoal = {
      ...data,
      id: `goal-${Date.now()}`,
      currentAmount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    persist([...goals, newGoal]);
  }, [goals, persist]);

  const handleAddFunds = useCallback((goalId: string, amount: number) => {
    persist(
      goals.map((g) =>
        g.id === goalId
          ? { ...g, currentAmount: Math.min(g.currentAmount + amount, g.targetAmount) }
          : g
      )
    );
  }, [goals, persist]);

  const fundingGoal = fundingGoalId ? goals.find((g) => g.id === fundingGoalId) ?? null : null;

  // Summary stats
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallPercent = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <TreeDeciduous className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-xl font-bold">Grove</span>
            </Link>
            <Separator orientation="vertical" className="h-6 mx-2" />
            <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-muted-foreground font-medium">Goals</span>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="min-h-[44px]">
              <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main id="main-content" className="container mx-auto py-6 px-4 max-w-5xl" role="main">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Savings Goals
            </h1>
            <p className="text-muted-foreground mt-1">
              Tend your goals and watch them grow
            </p>
          </div>
          <Button
            onClick={() => setShowAddGoal(true)}
            className="min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">Add Goal</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>

        {/* Overall Summary */}
        {loaded && goals.length > 0 && (
          <Card className="grove-card-glow mb-8">
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3 text-center">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Saved</p>
                  <p className="text-2xl font-bold money-amount mt-1" style={{ color: '#64FFDA' }}>
                    {formatCurrency(totalSaved)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Overall Progress</p>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <div className="flex-1 max-w-[160px] h-3 rounded-full overflow-hidden bg-secondary">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: '#64FFDA' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(overallPercent, 100)}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-lg font-bold" style={{ color: '#64FFDA' }}>
                      {overallPercent}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Goals</p>
                  <p className="text-2xl font-bold mt-1">{goals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals Grid */}
        {loaded && (
          <AnimatePresence mode="popLayout">
            {goals.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onAddFunds={(id) => setFundingGoalId(id)}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <motion.div
                      className="text-6xl mb-4"
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      🌱
                    </motion.div>
                    <p className="text-lg font-medium mb-2">No goals planted yet</p>
                    <p className="text-muted-foreground text-center max-w-sm mb-4">
                      Plant your first savings goal and watch it grow over time.
                    </p>
                    <Button onClick={() => setShowAddGoal(true)} className="min-h-[44px]">
                      <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Plant Your First Goal
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* Modals */}
      <AddGoalModal
        open={showAddGoal}
        onOpenChange={setShowAddGoal}
        onSubmit={handleAddGoal}
      />
      <AddFundsModal
        open={!!fundingGoalId}
        onOpenChange={(open) => { if (!open) setFundingGoalId(null); }}
        goal={fundingGoal}
        onSubmit={handleAddFunds}
      />
    </div>
  );
}
