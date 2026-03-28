'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { AllocationSummary } from '@/types';

interface BudgetSummaryCardProps {
  summary: AllocationSummary;
}

function getSavingsMessage(rate: number): string {
  if (rate >= 0.30) return 'Thriving! Your tree is flourishing.';
  if (rate >= 0.20) return 'Healthy growth. Keep it up!';
  if (rate >= 0.10) return 'Growing steadily. Nice work!';
  if (rate > 0) return 'Sprouting! Every bit counts.';
  return 'Plant a savings seed to start growing.';
}

export function BudgetSummaryCard({ summary }: BudgetSummaryCardProps) {
  const savingsRate = summary.savingsRate ?? 0;
  const savingsPercent = Math.round(savingsRate * 100);

  const needsAmount = summary.totalToBills ?? 0;
  const wantsAmount = summary.totalToDiscretionary ?? 0;
  const total = needsAmount + wantsAmount;
  const needsPercent = total > 0 ? Math.round((needsAmount / total) * 100) : 0;
  const wantsPercent = total > 0 ? 100 - needsPercent : 0;

  return (
    <Card className="grove-card-glow" role="region" aria-label="Budget summary">
      <CardContent className="pt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Savings Rate */}
          <div className="text-center sm:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Savings Rate</p>
            <p className="text-3xl font-bold" style={{ color: '#64FFDA' }}>
              {savingsPercent}%
            </p>
            <p className="text-sm text-muted-foreground mt-1">{getSavingsMessage(savingsRate)}</p>
          </div>

          {/* Needs vs Wants */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Needs vs Wants</p>
            <div className="flex items-center gap-1 h-4 rounded-full overflow-hidden bg-secondary">
              {needsPercent > 0 && (
                <div
                  className="h-full rounded-l-full transition-all"
                  style={{ width: `${needsPercent}%`, backgroundColor: '#FF6B6B' }}
                />
              )}
              {wantsPercent > 0 && (
                <div
                  className="h-full rounded-r-full transition-all"
                  style={{ width: `${wantsPercent}%`, backgroundColor: '#4FD1C5' }}
                />
              )}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span style={{ color: '#FF6B6B' }}>Needs {needsPercent}%</span>
              <span style={{ color: '#4FD1C5' }}>Wants {wantsPercent}%</span>
            </div>
          </div>

          {/* Trend */}
          <div className="text-center sm:text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Trend</p>
            <div className="flex items-center justify-center sm:justify-end gap-1">
              <TrendingUp className="h-5 w-5" style={{ color: '#64FFDA' }} aria-hidden="true" />
              <span className="text-lg font-semibold" style={{ color: '#64FFDA' }}>Improving</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Keep tending your garden</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
