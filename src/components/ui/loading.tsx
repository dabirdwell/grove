'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Skeleton component with shimmer effect
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'wave',
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        variantClasses[variant],
        animation === 'pulse' && 'animate-pulse',
        className
      )}
      style={{ width, height }}
      {...props}
    >
      {animation === 'wave' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'linear',
          }}
        />
      )}
    </div>
  );
}

// Loading spinner with text
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export function Spinner({ size = 'md', text, className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <span className="text-muted-foreground">{text}</span>}
    </div>
  );
}

// Full page loading overlay
interface LoadingOverlayProps {
  text?: string;
  className?: string;
}

export function LoadingOverlay({ text = 'Loading...', className }: LoadingOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeInOut',
        }}
      >
        <div className="relative">
          {/* Animated rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              animate={{
                scale: [1, 1.5 + i * 0.2],
                opacity: [0.6, 0],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                delay: i * 0.3,
                ease: 'easeOut',
              }}
              style={{
                width: 60,
                height: 60,
              }}
            />
          ))}
          {/* Center spinner */}
          <div className="w-[60px] h-[60px] rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-lg font-medium text-muted-foreground"
      >
        {text}
      </motion.p>
    </motion.div>
  );
}

// Card skeleton for bucket cards
export function BucketCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton width={120} height={20} />
        </div>
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width={80} height={24} className="rounded-full" />
        <Skeleton width={60} height={16} />
      </div>
      <Skeleton width="100%" height={32} className="rounded-lg" />
      <Skeleton width="70%" height={16} />
    </div>
  );
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton width={200} height={36} />
        <Skeleton width={300} height={20} />
      </div>

      {/* Master account card skeleton */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton width={100} height={16} />
            <Skeleton width={180} height={24} />
          </div>
          <div className="text-right space-y-2">
            <Skeleton width={100} height={16} />
            <Skeleton width={140} height={32} />
          </div>
          <Skeleton width={80} height={36} className="rounded-lg" />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Allocation panel skeleton */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton width={120} height={24} />
              <Skeleton width="100%" height={16} />
            </div>
            <Skeleton width="100%" height={48} className="rounded-lg" />
            <Skeleton width="100%" height={40} className="rounded-lg" />
          </div>
        </div>

        {/* Flow visualization skeleton */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-card p-6">
            <div className="space-y-2 mb-4">
              <Skeleton width={120} height={24} />
              <Skeleton width={200} height={16} />
            </div>
            <Skeleton width="100%" height={400} className="rounded-lg" />
          </div>
        </div>
      </div>

      {/* Buckets section skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton width={140} height={28} />
            <Skeleton width={240} height={16} />
          </div>
          <Skeleton width={120} height={40} className="rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <BucketCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Money counting animation
interface MoneyCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function MoneyCounter({
  value,
  duration = 1000,
  prefix = '$',
  suffix = '',
  className,
}: MoneyCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(Math.round(startValue + diff * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={cn('money-amount tabular-nums', className)}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

// Pulse dot for status indicators
interface PulseDotProps {
  status?: 'active' | 'warning' | 'error' | 'success';
  className?: string;
}

export function PulseDot({ status = 'active', className }: PulseDotProps) {
  const colors = {
    active: 'bg-primary',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    success: 'bg-green-500',
  };

  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      <motion.span
        className={cn(
          'absolute inline-flex h-full w-full rounded-full opacity-75',
          colors[status]
        )}
        animate={{
          scale: [1, 1.5],
          opacity: [0.75, 0],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: 'easeOut',
        }}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full h-3 w-3',
          colors[status]
        )}
      />
    </span>
  );
}
