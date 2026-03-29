'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppHeader } from '@/components/navigation';
import { PlaidLinkButton } from '@/components/plaid';
import { useTheme } from '@/hooks/use-theme';
import { useSoundEffects } from '@/hooks/use-sound-effects';
import { toast } from 'sonner';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Calendar,
  DollarSign,
  Download,
  RotateCcw,
  Settings,
  Building2,
} from 'lucide-react';

// localStorage keys used across the app
const STORAGE_KEYS = {
  theme: 'grove-theme',
  tooltips: 'grove-tooltips-seen',
  bills: 'grove-bills',
  goals: 'grove-savings-goals',
  payday: 'grove-payday',
  income: 'grove-income',
  sound: 'grove-sound-enabled',
} as const;

type PayFrequency = 'weekly' | 'biweekly' | 'monthly';

interface PaydaySettings {
  frequency: PayFrequency;
  nextDate: string; // ISO date string
}

function getDefaultNextPayday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  let daysToFri = (5 - dayOfWeek + 7) % 7;
  if (daysToFri === 0) daysToFri = 7;
  const next = new Date(today);
  next.setDate(today.getDate() + daysToFri);
  return next.toISOString().split('T')[0];
}

function exportGroveData() {
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };

  // Gather all grove localStorage data
  for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        try {
          data[key] = JSON.parse(raw);
        } catch {
          data[key] = raw;
        }
      }
    } catch {
      // skip inaccessible keys
    }
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `grove-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast.success('Data exported successfully');
}

function resetDemoData() {
  for (const storageKey of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(storageKey);
  }
  toast.success('Demo data cleared — refreshing...');
  setTimeout(() => window.location.replace('/'), 600);
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { enabled: soundEnabled, toggle: toggleSound } = useSoundEffects();
  const [soundOn, setSoundOn] = useState(false);
  const [payday, setPayday] = useState<PaydaySettings>({
    frequency: 'biweekly',
    nextDate: getDefaultNextPayday(),
  });
  const [income, setIncome] = useState('');
  const [mounted, setMounted] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    setMounted(true);

    try {
      const storedSound = localStorage.getItem(STORAGE_KEYS.sound);
      if (storedSound === 'true') setSoundOn(true);
    } catch { /* ignore */ }

    try {
      const storedPayday = localStorage.getItem(STORAGE_KEYS.payday);
      if (storedPayday) {
        setPayday(JSON.parse(storedPayday));
      }
    } catch { /* ignore */ }

    try {
      const storedIncome = localStorage.getItem(STORAGE_KEYS.income);
      if (storedIncome) setIncome(storedIncome);
    } catch { /* ignore */ }
  }, []);

  // Persist sound preference
  const handleSoundToggle = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    toggleSound();
    localStorage.setItem(STORAGE_KEYS.sound, String(next));
  }, [soundOn, toggleSound]);

  // Persist payday settings
  const handlePaydayChange = useCallback((update: Partial<PaydaySettings>) => {
    setPayday(prev => {
      const next = { ...prev, ...update };
      localStorage.setItem(STORAGE_KEYS.payday, JSON.stringify(next));
      return next;
    });
  }, []);

  // Persist income
  const handleIncomeChange = useCallback((value: string) => {
    // Allow only digits and a single decimal point
    const cleaned = value.replace(/[^\d.]/g, '');
    setIncome(cleaned);
    localStorage.setItem(STORAGE_KEYS.income, cleaned);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <AppHeader />

      <main id="main-content" className="container mx-auto py-6 px-4 max-w-2xl pb-24 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" aria-hidden="true" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Customize your Grove experience.
            </p>
          </div>

          <div className="space-y-4">
            {/* ── Appearance ── */}
            <Card className="grove-card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Theme */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Moon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Sun className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Theme</p>
                      <p className="text-xs text-muted-foreground">
                        {theme === 'dark' ? 'Midnight Lagoon' : 'Morning Dew'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'light'}
                    onCheckedChange={(checked) => setTheme(checked ? 'light' : 'dark')}
                    aria-label="Toggle light theme"
                  />
                </div>

                {/* Sound */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {soundOn ? (
                      <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                    <div>
                      <p className="text-sm font-medium">Sound Effects</p>
                      <p className="text-xs text-muted-foreground">
                        UI sounds and notifications
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={soundOn}
                    onCheckedChange={handleSoundToggle}
                    aria-label="Toggle sound effects"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Income & Payday ── */}
            <Card className="grove-card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Income & Payday</CardTitle>
                <CardDescription>Set your pay schedule for better planning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Income amount */}
                <div className="space-y-1.5">
                  <label htmlFor="income-amount" className="flex items-center gap-2 text-sm font-medium">
                    <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Typical Paycheck
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      id="income-amount"
                      type="text"
                      inputMode="decimal"
                      value={income}
                      onChange={(e) => handleIncomeChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-md border border-input bg-transparent pl-7 pr-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow]"
                    />
                  </div>
                </div>

                {/* Pay frequency */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    Pay Frequency
                  </label>
                  <Select
                    value={payday.frequency}
                    onValueChange={(val) => handlePaydayChange({ frequency: val as PayFrequency })}
                  >
                    <SelectTrigger className="w-full" aria-label="Pay frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every Two Weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Next payday date */}
                <div className="space-y-1.5">
                  <label htmlFor="next-payday" className="text-sm font-medium">
                    Next Payday
                  </label>
                  <input
                    id="next-payday"
                    type="date"
                    value={payday.nextDate}
                    onChange={(e) => handlePaydayChange({ nextDate: e.target.value })}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Connected Accounts ── */}
            <Card className="grove-card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Connected Accounts</CardTitle>
                <CardDescription>Link your bank for real-time balance updates</CardDescription>
              </CardHeader>
              <CardContent>
                <PlaidLinkButton
                  onSuccess={(accounts) => {
                    toast.success(`Connected ${accounts.length} account${accounts.length !== 1 ? 's' : ''}!`);
                  }}
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  Connect Bank Account
                </PlaidLinkButton>
                <p className="text-xs text-muted-foreground mt-2">
                  Uses Plaid to securely link your bank. Your credentials are never stored.
                </p>
              </CardContent>
            </Card>

            {/* ── Data ── */}
            <Card className="grove-card-glow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Data</CardTitle>
                <CardDescription>Export or reset your Grove data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={exportGroveData}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export My Data
                </Button>

                {!confirmReset ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={() => setConfirmReset(true)}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Reset Demo Data
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2"
                      onClick={resetDemoData}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Confirm Reset
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setConfirmReset(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground pt-1">
                  Export downloads a JSON backup of all your buckets, goals, bills, and preferences.
                  Reset clears all local data and returns to defaults.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </main>
    </>
  );
}
