'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Archive } from 'lucide-react';
import type { BucketConfig } from '@/types';

interface BucketCardProps {
  bucket: BucketConfig & {
    virtualBalance?: number;
    targetAccountName?: string;
  };
  onEdit?: (bucket: BucketConfig) => void;
  onDelete?: (bucketId: string) => void;
  onArchive?: (bucketId: string) => void;
}

const ALLOCATION_TYPE_LABELS: Record<string, string> = {
  fixed_dollar: 'Fixed Amount',
  percent_of_income: '% of Income',
  percent_of_remainder: '% of Remainder',
  percent_of_discretionary: '% of Discretionary',
};

const ALLOCATION_TYPE_COLORS: Record<string, string> = {
  fixed_dollar: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  percent_of_income: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  percent_of_remainder: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  percent_of_discretionary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

function formatValue(type: string, value: number): string {
  if (type === 'fixed_dollar') {
    return `$${value.toLocaleString()}`;
  }
  return `${(value * 100).toFixed(0)}%`;
}

export function BucketCard({ bucket, onEdit, onDelete, onArchive }: BucketCardProps) {
  const hasVirtualBalance = bucket.virtualBalance !== undefined;
  const progressPercent = hasVirtualBalance && bucket.value > 0
    ? Math.min((bucket.virtualBalance! / bucket.value) * 100, 100)
    : 0;

  return (
    <Card className="relative overflow-hidden group">
      {bucket.color && (
        <div
          className="absolute top-0 left-0 w-1 h-full"
          style={{ backgroundColor: bucket.color }}
        />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {bucket.emoji && <span className="text-xl">{bucket.emoji}</span>}
            {bucket.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(bucket)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={() => onArchive(bucket.bucketId)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(bucket.bucketId)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="secondary"
            className={ALLOCATION_TYPE_COLORS[bucket.allocationType]}
          >
            {ALLOCATION_TYPE_LABELS[bucket.allocationType]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Priority {bucket.priority}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Allocation value */}
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold money-amount">
              {formatValue(bucket.allocationType, bucket.value)}
            </span>
            {hasVirtualBalance && (
              <span className="text-sm text-muted-foreground">
                ${bucket.virtualBalance!.toLocaleString()} allocated
              </span>
            )}
          </div>

          {/* Progress bar for fixed dollar buckets */}
          {bucket.allocationType === 'fixed_dollar' && hasVirtualBalance && (
            <Progress value={progressPercent} className="h-2" />
          )}

          {/* Target account */}
          {bucket.targetAccountName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs">→</span>
              <span>Transfers to {bucket.targetAccountName}</span>
            </div>
          )}

          {/* Description */}
          {bucket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {bucket.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
