'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BucketConfig, SafeAccount, AllocationTypeValue } from '@/types';

interface BucketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (bucket: Omit<BucketConfig, 'id' | 'bucketId' | 'priority'>) => void;
  editBucket?: BucketConfig | null;
  externalAccounts?: SafeAccount[];
  bucketCount?: number;
}

const BUCKET_SUGGESTIONS = [
  { emoji: '💰', name: 'Savings', allocationType: 'percent_of_income' as AllocationTypeValue, value: '20' },
  { emoji: '🏠', name: 'Rent', allocationType: 'fixed_dollar' as AllocationTypeValue, value: '1500' },
  { emoji: '🛒', name: 'Groceries', allocationType: 'fixed_dollar' as AllocationTypeValue, value: '400' },
  { emoji: '🚗', name: 'Car Payment', allocationType: 'fixed_dollar' as AllocationTypeValue, value: '350' },
  { emoji: '🎮', name: 'Fun Money', allocationType: 'percent_of_discretionary' as AllocationTypeValue, value: '30' },
];

const ALLOCATION_TYPES: { value: AllocationTypeValue; label: string; description: string }[] = [
  {
    value: 'fixed_dollar',
    label: 'Fixed Amount',
    description: 'A specific dollar amount (e.g., $1,500 for rent)',
  },
  {
    value: 'percent_of_income',
    label: 'Percentage of Income',
    description: 'A percentage of total income (e.g., 20% for savings)',
  },
  {
    value: 'percent_of_remainder',
    label: 'Percentage of Remainder',
    description: 'A percentage of what\'s left after fixed expenses',
  },
  {
    value: 'percent_of_discretionary',
    label: 'Percentage of Discretionary',
    description: 'A percentage of your discretionary pool',
  },
];

const EMOJI_OPTIONS = ['💰', '🏠', '🚗', '🛒', '🎮', '✈️', '🎓', '💊', '📱', '🎁', '🏦', '💳'];

export function BucketForm({
  open,
  onOpenChange,
  onSubmit,
  editBucket,
  externalAccounts = [],
  bucketCount = 0,
}: BucketFormProps) {
  const [name, setName] = useState(editBucket?.name || '');
  const [emoji, setEmoji] = useState(editBucket?.emoji || '');
  const [description, setDescription] = useState(editBucket?.description || '');
  const [allocationType, setAllocationType] = useState<AllocationTypeValue>(
    editBucket?.allocationType || 'fixed_dollar'
  );
  const [value, setValue] = useState(
    editBucket?.value?.toString() || ''
  );
  const [targetAccountId, setTargetAccountId] = useState(
    editBucket?.targetExternalAccountId || '__none__'
  );
  const [error, setError] = useState('');

  const isEditing = !!editBucket;
  const isPercentage = allocationType.startsWith('percent');

  // Calculate live preview for percentage inputs
  const percentagePreview = useMemo(() => {
    if (!value || !isPercentage) return '';

    const percent = parseFloat(value);
    if (isNaN(percent)) return '';

    // Assume average paycheck for preview
    const sampleIncome = 2800;
    const normalizedPercent = percent > 1 ? percent / 100 : percent;
    const amount = normalizedPercent * sampleIncome;

    return `≈ $${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} of a $${sampleIncome.toLocaleString()} paycheck`;
  }, [value, isPercentage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }

    // Convert percentage input (e.g., "20" -> 0.20)
    let finalValue = numValue;
    if (isPercentage) {
      // If user entered value > 1, assume they meant percentage (e.g., 20 -> 0.20)
      if (numValue > 1) {
        finalValue = numValue / 100;
      }
      if (finalValue < 0 || finalValue > 1) {
        setError('Percentage must be between 0 and 100');
        return;
      }
    } else if (numValue < 0) {
      setError('Amount cannot be negative');
      return;
    }

    onSubmit({
      name: name.trim(),
      emoji: emoji || undefined,
      description: description.trim() || undefined,
      allocationType,
      value: finalValue,
      targetExternalAccountId: targetAccountId === '__none__' ? undefined : targetAccountId,
    });

    // Reset form
    setName('');
    setEmoji('');
    setDescription('');
    setAllocationType('fixed_dollar');
    setValue('');
    setTargetAccountId('__none__');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Populate form when opening
      setName(editBucket?.name || '');
      setEmoji(editBucket?.emoji || '');
      setDescription(editBucket?.description || '');
      setAllocationType(editBucket?.allocationType || 'fixed_dollar');
      // For editing, show percentage as whole number (0.20 -> 20)
      const displayValue = editBucket?.value
        ? (editBucket.allocationType?.startsWith('percent') && editBucket.value <= 1
            ? (editBucket.value * 100).toString()
            : editBucket.value.toString())
        : '';
      setValue(displayValue);
      setTargetAccountId(editBucket?.targetExternalAccountId || '__none__');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Shape Your Branch' : 'Grow New Branch'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Adjust how this branch grows.'
              : 'Tell your money where to grow.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Suggestions for new users */}
          {bucketCount === 0 && !isEditing && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Popular first buckets:</p>
              <div className="flex flex-wrap gap-2">
                {BUCKET_SUGGESTIONS.slice(0, 3).map((suggestion) => (
                  <Button
                    key={suggestion.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setName(suggestion.name);
                      setEmoji(suggestion.emoji);
                      setAllocationType(suggestion.allocationType);
                      setValue(suggestion.value);
                    }}
                  >
                    {suggestion.emoji} {suggestion.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Name and Emoji */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Rent, Savings, Fun Money"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji</Label>
              <Select value={emoji} onValueChange={setEmoji}>
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder="🏷️" />
                </SelectTrigger>
                <SelectContent>
                  {EMOJI_OPTIONS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allocation Type */}
          <div className="space-y-2">
            <Label htmlFor="allocationType">Allocation Type</Label>
            <Select
              value={allocationType}
              onValueChange={(v) => setAllocationType(v as AllocationTypeValue)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOCATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {type.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">
              {isPercentage ? 'Percentage' : 'Amount'}
            </Label>
            <div className="relative">
              {!isPercentage && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
              )}
              <Input
                id="value"
                type="number"
                step={isPercentage ? '1' : '0.01'}
                min="0"
                max={isPercentage ? '100' : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={isPercentage ? 'e.g., 20' : 'e.g., 1500'}
                className={!isPercentage ? 'pl-7' : ''}
              />
              {isPercentage && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPercentage
                ? 'Enter a value between 0 and 100'
                : 'Enter the fixed dollar amount'}
            </p>
            {percentagePreview && (
              <p className="text-xs text-primary mt-1 animate-in fade-in duration-200">
                {percentagePreview}
              </p>
            )}
          </div>

          {/* Target Account */}
          {externalAccounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="targetAccount">Transfer To (Optional)</Label>
              <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Keep as virtual balance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Keep as virtual balance</SelectItem>
                  {externalAccounts.map((account) => (
                    <SelectItem key={account.accountId} value={account.accountId}>
                      {account.nickname || account.name}
                      {account.mask && ` (****${account.mask})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose an account to automatically transfer funds to
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly rent payment"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? 'Save Changes' : 'Plant Branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
