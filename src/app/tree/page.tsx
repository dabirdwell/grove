'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AppHeader } from '@/components/navigation';
import { Plus, Minus, RotateCcw, Droplets } from 'lucide-react';

// Dynamic import to avoid SSR issues with Three.js
const MoneyTree3D = dynamic(
  () => import('@/components/money-tree-3d').then(mod => mod.MoneyTree3D),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0a1628]">
        <div className="text-[#64ffda] animate-pulse">Growing your tree...</div>
      </div>
    )
  }
);

const COLORS = [
  '#64ffda', // Cyan
  '#4fd1c5', // Teal
  '#ffd93d', // Gold
  '#81e6d9', // Light teal
  '#ff6b6b', // Coral
  '#a78bfa', // Purple
  '#34d399', // Emerald
  '#f472b6', // Pink
];

const BRANCH_NAMES = [
  'Savings', 'Rent', 'Utilities', 'Groceries', 'Fun Money',
  'Emergency', 'Investments', 'Travel', 'Health', 'Education',
  'Gifts', 'Subscriptions', 'Transportation', 'Insurance'
];

export default function TreeDemoPage() {
  const [healthScore, setHealthScore] = useState(70);
  const [totalIncome, setTotalIncome] = useState(5000);
  const [autoRotate, setAutoRotate] = useState(true);
  const [sapFlowActive, setSapFlowActive] = useState(false);
  const [branches, setBranches] = useState([
    { id: '1', name: 'Savings', amount: 1000, percentage: 20, color: '#64ffda' },
    { id: '2', name: 'Rent', amount: 1500, percentage: 30, color: '#ff6b6b' },
    { id: '3', name: 'Groceries', amount: 600, percentage: 12, color: '#ffd93d' },
    { id: '4', name: 'Utilities', amount: 200, percentage: 4, color: '#4fd1c5' },
    { id: '5', name: 'Fun Money', amount: 400, percentage: 8, color: '#a78bfa' },
  ]);

  // Trigger sap flow animation
  const triggerSapFlow = useCallback(() => {
    if (!sapFlowActive) {
      setSapFlowActive(true);
    }
  }, [sapFlowActive]);

  // Keyboard shortcut: Press 'S' to trigger sap flow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        triggerSapFlow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSapFlow]);

  const addBranch = () => {
    const usedNames = new Set(branches.map(b => b.name));
    const availableNames = BRANCH_NAMES.filter(n => !usedNames.has(n));
    if (availableNames.length === 0) return;

    const name = availableNames[Math.floor(Math.random() * availableNames.length)];
    const amount = Math.floor(Math.random() * 800) + 200;
    const percentage = Math.round((amount / totalIncome) * 100);
    const color = COLORS[branches.length % COLORS.length];

    setBranches([...branches, {
      id: Date.now().toString(),
      name,
      amount,
      percentage,
      color
    }]);
  };

  const removeBranch = () => {
    if (branches.length > 1) {
      setBranches(branches.slice(0, -1));
    }
  };

  const handleBranchClick = (branch: typeof branches[0]) => {
    console.log('Clicked branch:', branch);
    // Could open edit modal here
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <AppHeader />

      {/* Sub-header */}
      <div className="p-4 border-b border-[#64ffda]/20">
        <h1 className="text-2xl font-bold text-[#64ffda]">
          🌳 3D Money Tree
        </h1>
        <p className="text-[#81e6d9]/70 text-sm">
          Drag to rotate • Scroll to zoom • Click branches to select
        </p>
      </div>

      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)]">
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <MoneyTree3D
            branches={branches}
            totalIncome={totalIncome}
            healthScore={healthScore}
            onBranchClick={handleBranchClick}
            autoRotate={autoRotate}
            sapFlowActive={sapFlowActive}
            onSapFlowComplete={() => setSapFlowActive(false)}
          />
        </div>

        {/* Controls Panel */}
        <div className="w-full lg:w-80 p-4 bg-[#0d2137] border-l border-[#64ffda]/20 overflow-y-auto">
          <div className="space-y-6">
            {/* Health Score */}
            <div>
              <label className="text-sm text-[#81e6d9] mb-2 block">
                Financial Health: {healthScore}%
              </label>
              <p className="text-xs text-[#64ffda]/50 mb-2">
                Tree grows taller with better health
              </p>
              <Slider
                value={[healthScore]}
                onValueChange={([v]) => setHealthScore(v)}
                min={10}
                max={100}
                step={5}
                className="[&_[role=slider]]:bg-[#64ffda]"
              />
            </div>

            {/* Auto Rotate */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#81e6d9]">Auto Rotate</span>
              <Button
                variant={autoRotate ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRotate(!autoRotate)}
                className={autoRotate
                  ? "bg-[#64ffda] text-[#0a1628] hover:bg-[#4fd1c5]"
                  : "border-[#64ffda]/50 text-[#64ffda]"
                }
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                {autoRotate ? 'On' : 'Off'}
              </Button>
            </div>

            {/* Sap Flow Animation Trigger */}
            <div>
              <label className="text-sm text-[#81e6d9] mb-2 block">
                Sap Flow Animation
              </label>
              <Button
                onClick={triggerSapFlow}
                disabled={sapFlowActive}
                className="w-full bg-gradient-to-r from-[#64ffda]/30 to-[#4fd1c5]/30 hover:from-[#64ffda]/50 hover:to-[#4fd1c5]/50 text-[#64ffda] border border-[#64ffda]/50"
              >
                <Droplets className="h-4 w-4 mr-2" />
                {sapFlowActive ? 'Flowing...' : 'Trigger Sap Flow'}
              </Button>
              <p className="text-xs text-[#64ffda]/50 mt-1">
                Press &apos;S&apos; key for shortcut
              </p>
            </div>

            {/* Branch Controls */}
            <div>
              <label className="text-sm text-[#81e6d9] mb-2 block">
                Branches: {branches.length}
              </label>
              <div className="flex gap-2">
                <Button
                  onClick={addBranch}
                  className="flex-1 bg-[#64ffda]/20 hover:bg-[#64ffda]/30 text-[#64ffda] border border-[#64ffda]/50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Grow Branch
                </Button>
                <Button
                  onClick={removeBranch}
                  variant="outline"
                  className="border-[#ff6b6b]/50 text-[#ff6b6b] hover:bg-[#ff6b6b]/20"
                  disabled={branches.length <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Branch List */}
            <div>
              <label className="text-sm text-[#81e6d9] mb-2 block">
                Your Branches
              </label>
              <div className="space-y-2">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center gap-3 p-2 rounded bg-[#0a1628]/50 border border-[#64ffda]/10"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: branch.color, boxShadow: `0 0 8px ${branch.color}` }}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{branch.name}</div>
                      <div className="text-xs text-[#64ffda]/50">
                        ${branch.amount.toLocaleString()} • {branch.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            <div className="p-3 rounded bg-[#64ffda]/10 border border-[#64ffda]/20">
              <h3 className="text-sm font-semibold text-[#64ffda] mb-2">
                ✨ What you&apos;re seeing
              </h3>
              <ul className="text-xs text-[#81e6d9]/70 space-y-1">
                <li>• Tree height = financial health</li>
                <li>• Branch length = allocation percentage</li>
                <li>• Glowing orbs = your money at work</li>
                <li>• Sap flow = income being allocated</li>
                <li>• Fireflies = positive momentum</li>
                <li>• Water reflects your progress</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
