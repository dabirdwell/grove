'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import {
  TreeDeciduous,
  Sun,
  Moon,
  Home,
  CalendarDays,
  TreePine,
  Target,
  ReceiptText,
  BarChart3,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/budget', label: 'Budget', icon: CalendarDays },
  { href: '/tree', label: 'Tree', icon: TreePine },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/bills', label: 'Bills', icon: ReceiptText },
  { href: '/insights', label: 'Insights', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface AppHeaderProps {
  actions?: React.ReactNode;
}

export function AppHeader({ actions }: AppHeaderProps) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="banner"
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo + Desktop Nav */}
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity mr-2"
          >
            <TreeDeciduous className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold hidden sm:inline">Grove</span>
          </Link>

          {/* Desktop navigation links */}
          <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md transition-colors min-h-[36px] ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side: actions + theme toggle */}
        <div className="flex items-center gap-1">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-w-[44px] min-h-[44px]"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
