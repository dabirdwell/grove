'use client';

import * as React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
  showValue?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'default' | 'success' | 'warning' | 'danger' | 'savings' | 'bills' | 'discretionary';
  animated?: boolean;
  duration?: number;
  onComplete?: () => void;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const colorClasses = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  savings: 'bg-[#22C55E]',
  bills: 'bg-[#EF4444]',
  discretionary: 'bg-[#3B82F6]',
};

export function AnimatedProgress({
  value,
  max = 100,
  className,
  barClassName,
  showValue = false,
  showPercentage = false,
  size = 'md',
  color = 'default',
  animated = true,
  duration = 0.8,
  onComplete,
}: AnimatedProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  // Animated value using spring
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.01,
  });

  // Transform spring value to percentage for display
  const displayPercentage = useTransform(springValue, (v) => Math.round(v));
  const displayValue = useTransform(springValue, (v) => Math.round((v / 100) * max));

  React.useEffect(() => {
    if (animated) {
      springValue.set(percentage);
    } else {
      springValue.jump(percentage);
    }
  }, [percentage, animated, springValue]);

  // Call onComplete when animation finishes at 100%
  React.useEffect(() => {
    if (percentage >= 100 && onComplete) {
      const timeout = setTimeout(onComplete, duration * 1000);
      return () => clearTimeout(timeout);
    }
  }, [percentage, onComplete, duration]);

  // Dynamic color based on percentage
  const getAutoColor = () => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'default';
    if (percentage >= 50) return 'warning';
    return 'danger';
  };

  const effectiveColor = color === 'default' && percentage > 0 ? getAutoColor() : color;

  return (
    <div className={cn('space-y-1', className)}>
      {(showValue || showPercentage) && (
        <div className="flex justify-between text-sm">
          {showValue && (
            <motion.span className="text-muted-foreground">
              <motion.span>{displayValue}</motion.span>
              <span> / {max}</span>
            </motion.span>
          )}
          {showPercentage && (
            <motion.span className="font-medium">
              <motion.span>{displayPercentage}</motion.span>%
            </motion.span>
          )}
        </div>
      )}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-primary/20',
          sizeClasses[size]
        )}
      >
        <motion.div
          className={cn(
            'h-full rounded-full',
            colorClasses[effectiveColor],
            barClassName
          )}
          initial={{ width: animated ? 0 : `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animated ? duration : 0,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />

        {/* Shimmer effect for in-progress bars */}
        {percentage > 0 && percentage < 100 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: 'linear',
            }}
          />
        )}

        {/* Pulse effect at 100% */}
        {percentage >= 100 && (
          <motion.div
            className="absolute inset-0 bg-white/30 rounded-full"
            animate={{
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 1,
              repeat: 2,
            }}
          />
        )}
      </div>
    </div>
  );
}

// Goal progress component with milestone markers
interface GoalProgressProps extends AnimatedProgressProps {
  milestones?: number[];
  currentMilestone?: number;
  goalName?: string;
  targetAmount?: number;
  currentAmount?: number;
}

export function GoalProgress({
  milestones = [25, 50, 75, 100],
  currentMilestone,
  goalName,
  targetAmount,
  currentAmount,
  ...props
}: GoalProgressProps) {
  const percentage = props.value;

  return (
    <div className="space-y-2">
      {goalName && (
        <div className="flex justify-between items-baseline">
          <span className="font-medium">{goalName}</span>
          {targetAmount !== undefined && currentAmount !== undefined && (
            <span className="text-sm text-muted-foreground">
              ${currentAmount.toLocaleString()} / ${targetAmount.toLocaleString()}
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <AnimatedProgress {...props} color="savings" />

        {/* Milestone markers */}
        <div className="absolute inset-0 flex">
          {milestones.map((milestone) => (
            <div
              key={milestone}
              className="absolute h-full"
              style={{ left: `${milestone}%` }}
            >
              <motion.div
                className={cn(
                  'w-1 h-full rounded-full',
                  percentage >= milestone
                    ? 'bg-green-600'
                    : 'bg-gray-300'
                )}
                initial={{ scale: 0 }}
                animate={{ scale: percentage >= milestone ? 1.2 : 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Milestone labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        {milestones.map((milestone) => (
          <span
            key={milestone}
            className={cn(
              percentage >= milestone && 'text-green-600 font-medium'
            )}
          >
            {milestone}%
          </span>
        ))}
      </div>
    </div>
  );
}

// Circular progress variant
interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  color?: string;
  className?: string;
}

export function CircularProgress({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  showValue = true,
  color = '#3B82F6',
  className,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
  });

  const displayValue = useTransform(springValue, (v) => Math.round(v));

  React.useEffect(() => {
    springValue.set(percentage);
  }, [percentage, springValue]);

  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span className="text-lg font-bold">
            {displayValue}
          </motion.span>
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      )}
    </div>
  );
}
