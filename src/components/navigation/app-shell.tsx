'use client';

import React, { useSyncExternalStore } from 'react';
import { MobileNav } from './mobile-nav';
import { OnboardingTooltips } from './onboarding-tooltips';

// Track mount state outside React to avoid setState-in-effect lint errors
let isMounted = false;
const mountListeners = new Set<() => void>();

function subscribeMounted(cb: () => void) {
  mountListeners.add(cb);
  return () => mountListeners.delete(cb);
}

function getMounted() {
  return isMounted;
}

function getServerMounted() {
  return false;
}

// Trigger mount on client
if (typeof window !== 'undefined' && !isMounted) {
  // Apply theme immediately
  const stored = localStorage.getItem('grove-theme');
  const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  const theme = stored ?? (systemLight ? 'light' : 'dark');
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(theme);
  isMounted = true;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(subscribeMounted, getMounted, getServerMounted);

  return (
    <>
      {children}
      {mounted && (
        <>
          <MobileNav />
          <OnboardingTooltips />
          {/* Spacer for mobile bottom nav */}
          <div className="h-16 md:hidden" aria-hidden="true" />
        </>
      )}
    </>
  );
}
