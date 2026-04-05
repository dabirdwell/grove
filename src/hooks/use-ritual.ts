'use client';

import { useState, useEffect, useCallback } from 'react';

interface RitualState {
  lastCompletedDate: string | null;
  lastDismissedDate: string | null;
  streak: number;
}

const STORAGE_KEY = 'grove-ritual';

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function loadState(): RitualState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { lastCompletedDate: null, lastDismissedDate: null, streak: 0 };
}

function saveState(state: RitualState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function useRitual() {
  const [state, setState] = useState<RitualState>({
    lastCompletedDate: null,
    lastDismissedDate: null,
    streak: 0,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(loadState());
    setLoaded(true);
  }, []);

  const today = getToday();
  const needsRitual = loaded && state.lastCompletedDate !== today && state.lastDismissedDate !== today;

  const completeRitual = useCallback(() => {
    const today = getToday();
    const yesterday = getYesterday();
    const current = loadState();

    let newStreak: number;
    if (current.lastCompletedDate === yesterday) {
      newStreak = current.streak + 1;
    } else if (current.lastCompletedDate === today) {
      newStreak = current.streak;
    } else {
      newStreak = 1;
    }

    const newState: RitualState = {
      lastCompletedDate: today,
      lastDismissedDate: null,
      streak: newStreak,
    };
    saveState(newState);
    setState(newState);
  }, []);

  const skipRitual = useCallback(() => {
    const today = getToday();
    const current = loadState();
    const newState: RitualState = { ...current, lastDismissedDate: today };
    saveState(newState);
    setState(newState);
  }, []);

  return { needsRitual, streak: state.streak, completeRitual, skipRitual };
}
