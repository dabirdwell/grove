'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  CalendarDays,
  TreePine,
  Target,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/budget', label: 'Budget', icon: CalendarDays },
  { href: '/tree', label: 'Tree', icon: TreePine },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-2 py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} aria-hidden="true" />
              <span className={`text-[10px] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
