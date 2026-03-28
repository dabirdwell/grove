'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const STORAGE_KEY = 'grove-tooltips-seen';

const TIPS = [
  {
    id: 'tree',
    title: 'Your Money Tree',
    description: 'This is your money tree — it grows as you allocate your income across branches.',
    position: 'top' as const,
  },
  {
    id: 'allocate',
    title: 'Quick Allocate',
    description: 'Tap Quick Allocate to distribute your income across your buckets instantly.',
    position: 'top' as const,
  },
  {
    id: 'swipe',
    title: 'Manage Buckets',
    description: 'Swipe buckets to edit or delete them. Long-press to reorder.',
    position: 'top' as const,
  },
];

export function OnboardingTooltips() {
  const [currentTip, setCurrentTip] = useState(-1);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      // Small delay so the page loads first
      const timer = setTimeout(() => {
        setCurrentTip(0);
        setDismissed(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentTip < TIPS.length - 1) {
      setCurrentTip((prev) => prev + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
      setDismissed(true);
    }
  }, [currentTip]);

  const handleDismissAll = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }, []);

  if (dismissed || currentTip < 0) return null;

  const tip = TIPS[currentTip];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-none" aria-live="polite">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30 pointer-events-auto"
          onClick={handleDismissAll}
        />

        {/* Tooltip */}
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
        >
          <div className="bg-card border border-border rounded-xl p-5 shadow-xl max-w-[300px] w-[90vw]">
            {/* Close button */}
            <button
              onClick={handleDismissAll}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              aria-label="Dismiss tips"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-sm font-bold mb-1.5">{tip.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {tip.description}
            </p>

            <div className="flex items-center justify-between">
              {/* Dots */}
              <div className="flex gap-1.5">
                {TIPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === currentTip ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors px-3 py-1 rounded-md"
              >
                {currentTip < TIPS.length - 1 ? 'Next' : 'Got it!'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
