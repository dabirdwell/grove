'use client';

import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewBucket?: () => void;
  onAllocate?: () => void;
  onHelp?: () => void;
  onRefresh?: () => void;
}

export function useKeyboardShortcuts({
  onNewBucket,
  onAllocate,
  onHelp,
  onRefresh,
}: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      // Don't trigger if modifier keys are pressed (except for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          onNewBucket?.();
          break;
        case 'a':
          e.preventDefault();
          onAllocate?.();
          break;
        case '?':
          e.preventDefault();
          onHelp?.();
          break;
        case 'r':
          e.preventDefault();
          onRefresh?.();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewBucket, onAllocate, onHelp, onRefresh]);
}
