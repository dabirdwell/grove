'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Zap,
  Check,
} from 'lucide-react';
import { AppHeader } from '@/components/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Bill {
  id: string;
  name: string;
  emoji: string;
  amount: number;
  dueDay: number; // day of month (1-31)
  recurring: boolean;
  autoPay: boolean;
  paidDates: string[]; // ISO date strings for months marked paid
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'grove-bills';

const EMOJI_PRESETS = ['🏠', '🚗', '⚡', '📶', '📱', '🐾', '📺', '💳', '🏥', '🎵'];

const DEMO_BILLS: Bill[] = [
  {
    id: 'bill-rent',
    name: 'Rent',
    emoji: '🏠',
    amount: 1200,
    dueDay: 1,
    recurring: true,
    autoPay: false,
    paidDates: [],
  },
  {
    id: 'bill-car',
    name: 'Car Payment',
    emoji: '🚗',
    amount: 350,
    dueDay: 15,
    recurring: true,
    autoPay: true,
    paidDates: [],
  },
  {
    id: 'bill-electric',
    name: 'Electric',
    emoji: '⚡',
    amount: 120,
    dueDay: 20,
    recurring: true,
    autoPay: false,
    paidDates: [],
  },
  {
    id: 'bill-internet',
    name: 'Internet',
    emoji: '📶',
    amount: 65,
    dueDay: 22,
    recurring: true,
    autoPay: true,
    paidDates: [],
  },
  {
    id: 'bill-phone',
    name: 'Phone',
    emoji: '📱',
    amount: 85,
    dueDay: 25,
    recurring: true,
    autoPay: false,
    paidDates: [],
  },
  {
    id: 'bill-pet-insurance',
    name: 'Pet Insurance',
    emoji: '🐾',
    amount: 35,
    dueDay: 1,
    recurring: true,
    autoPay: true,
    paidDates: [],
  },
  {
    id: 'bill-streaming',
    name: 'Streaming',
    emoji: '📺',
    amount: 15.99,
    dueDay: 10,
    recurring: true,
    autoPay: true,
    paidDates: [],
  },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPaidKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getBillStatus(
  bill: Bill,
  day: number,
  today: Date,
  viewYear: number,
  viewMonth: number,
): 'paid' | 'auto-pay' | 'due-soon' | 'overdue' | 'upcoming' {
  const paidKey = getPaidKey(viewYear, viewMonth);
  if (bill.paidDates.includes(paidKey)) return 'paid';
  if (bill.autoPay) return 'auto-pay';

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  if (!isCurrentMonth) return 'upcoming';

  const todayDay = today.getDate();
  const diff = day - todayDay;

  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'due-soon';
  return 'upcoming';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'paid':
    case 'auto-pay':
      return '#64FFDA';
    case 'due-soon':
      return 'var(--chart-3)';
    case 'overdue':
      return 'var(--destructive)';
    default:
      return 'var(--secondary-foreground)';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'paid': return 'Paid';
    case 'auto-pay': return 'Auto-pay';
    case 'due-soon': return 'Due soon';
    case 'overdue': return 'Overdue';
    default: return 'Upcoming';
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ---------------------------------------------------------------------------
// Bill Form Component
// ---------------------------------------------------------------------------

function BillForm({
  open,
  onOpenChange,
  onSubmit,
  editBill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (bill: Omit<Bill, 'id' | 'paidDates'> & { id?: string }) => void;
  editBill: Bill | null;
}) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💳');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [recurring, setRecurring] = useState(true);
  const [autoPay, setAutoPay] = useState(false);

  useEffect(() => {
    if (editBill) {
      setName(editBill.name);
      setEmoji(editBill.emoji);
      setAmount(String(editBill.amount));
      setDueDay(String(editBill.dueDay));
      setRecurring(editBill.recurring);
      setAutoPay(editBill.autoPay);
    } else {
      setName('');
      setEmoji('💳');
      setAmount('');
      setDueDay('1');
      setRecurring(true);
      setAutoPay(false);
    }
  }, [editBill, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    const parsedDay = parseInt(dueDay, 10);
    if (!name.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) return;

    onSubmit({
      id: editBill?.id,
      name: name.trim(),
      emoji,
      amount: parsedAmount,
      dueDay: parsedDay,
      recurring,
      autoPay,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editBill ? 'Edit Bill' : 'Add New Bill'}</DialogTitle>
          <DialogDescription>
            {editBill ? 'Update the details for this bill.' : 'Track a recurring bill or payment.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Emoji picker */}
          <div>
            <Label className="text-sm mb-2 block">Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all min-h-[44px] min-w-[44px]"
                  style={{
                    background: emoji === e ? 'rgba(100, 255, 218, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: emoji === e ? '2px solid #64FFDA' : '2px solid transparent',
                  }}
                  aria-label={`Select ${e} icon`}
                  aria-pressed={emoji === e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="bill-name">Name</Label>
            <Input
              id="bill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electric Bill"
              required
              className="min-h-[44px]"
            />
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="bill-amount">Amount ($)</Label>
            <Input
              id="bill-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              className="min-h-[44px] money-amount"
            />
          </div>

          {/* Due day */}
          <div>
            <Label htmlFor="bill-due-day">Due Day of Month</Label>
            <Input
              id="bill-due-day"
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              required
              className="min-h-[44px]"
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setRecurring(!recurring)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all min-h-[44px]"
              style={{
                background: recurring ? 'rgba(100, 255, 218, 0.15)' : 'rgba(255,255,255,0.05)',
                border: recurring ? '1px solid rgba(100, 255, 218, 0.4)' : '1px solid rgba(255,255,255,0.1)',
              }}
              aria-pressed={recurring}
            >
              <span className="text-xs" style={{ color: recurring ? '#64FFDA' : 'var(--secondary-foreground)' }}>↻</span>
              Recurring
            </button>
            <button
              type="button"
              onClick={() => setAutoPay(!autoPay)}
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all min-h-[44px]"
              style={{
                background: autoPay ? 'rgba(100, 255, 218, 0.15)' : 'rgba(255,255,255,0.05)',
                border: autoPay ? '1px solid rgba(100, 255, 218, 0.4)' : '1px solid rgba(255,255,255,0.1)',
              }}
              aria-pressed={autoPay}
            >
              <Zap className="h-3 w-3" style={{ color: autoPay ? '#64FFDA' : 'var(--secondary-foreground)' }} aria-hidden="true" />
              Auto-pay
            </button>
          </div>

          <DialogFooter>
            <Button type="submit" className="min-h-[44px]">
              {editBill ? 'Save Changes' : 'Add Bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Bills Page
// ---------------------------------------------------------------------------

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Load bills from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBills(JSON.parse(stored));
      } else {
        setBills(DEMO_BILLS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_BILLS));
      }
    } catch {
      setBills(DEMO_BILLS);
    }
  }, []);

  const persist = useCallback((updated: Bill[]) => {
    setBills(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage full
    }
  }, []);

  // Calendar data
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  // Bills mapped by due day
  const billsByDay = useMemo(() => {
    const map: Record<number, Bill[]> = {};
    for (const bill of bills) {
      const day = Math.min(bill.dueDay, daysInMonth);
      if (!map[day]) map[day] = [];
      map[day].push(bill);
    }
    return map;
  }, [bills, daysInMonth]);

  // Monthly total
  const monthlyTotal = useMemo(() => {
    return bills.reduce((sum, b) => sum + b.amount, 0);
  }, [bills]);

  // Summary counts
  const statusCounts = useMemo(() => {
    const counts = { paid: 0, autoPay: 0, dueSoon: 0, overdue: 0, upcoming: 0 };
    for (const bill of bills) {
      const day = Math.min(bill.dueDay, daysInMonth);
      const status = getBillStatus(bill, day, today, viewYear, viewMonth);
      if (status === 'paid') counts.paid++;
      else if (status === 'auto-pay') counts.autoPay++;
      else if (status === 'due-soon') counts.dueSoon++;
      else if (status === 'overdue') counts.overdue++;
      else counts.upcoming++;
    }
    return counts;
  }, [bills, daysInMonth, today, viewYear, viewMonth]);

  // Handlers
  const handleAddOrEdit = useCallback(
    (data: Omit<Bill, 'id' | 'paidDates'> & { id?: string }) => {
      if (data.id) {
        const updated = bills.map((b) =>
          b.id === data.id ? { ...b, ...data, id: b.id, paidDates: b.paidDates } : b,
        );
        persist(updated);
      } else {
        const newBill: Bill = {
          ...data,
          id: `bill-${Date.now()}`,
          paidDates: [],
        };
        persist([...bills, newBill]);
      }
    },
    [bills, persist],
  );

  const handleDelete = useCallback(
    (id: string) => {
      persist(bills.filter((b) => b.id !== id));
    },
    [bills, persist],
  );

  const handleTogglePaid = useCallback(
    (id: string) => {
      const paidKey = getPaidKey(viewYear, viewMonth);
      const updated = bills.map((b) => {
        if (b.id !== id) return b;
        const isPaid = b.paidDates.includes(paidKey);
        return {
          ...b,
          paidDates: isPaid
            ? b.paidDates.filter((d) => d !== paidKey)
            : [...b.paidDates, paidKey],
        };
      });
      persist(updated);
    },
    [bills, viewYear, viewMonth, persist],
  );

  const navigateMonth = useCallback(
    (delta: number) => {
      let newMonth = viewMonth + delta;
      let newYear = viewYear;
      if (newMonth < 0) {
        newMonth = 11;
        newYear--;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear++;
      }
      setViewMonth(newMonth);
      setViewYear(newYear);
    },
    [viewMonth, viewYear],
  );

  // Build calendar grid
  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDayOfWeek, daysInMonth]);

  const isToday = (day: number) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  // Sort bills by due day for the list view
  const sortedBills = useMemo(() => {
    return [...bills].sort((a, b) => a.dueDay - b.dueDay);
  }, [bills]);

  return (
    <div className="min-h-screen bg-background relative">
      {/* Header */}
      <AppHeader
        actions={
          <Button
            onClick={() => {
              setEditingBill(null);
              setShowForm(true);
            }}
            size="sm"
            className="min-h-[44px]"
            aria-label="Add new bill"
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
            <span className="hidden sm:inline">Add Bill</span>
          </Button>
        }
      />

      {/* Main Content */}
      <main id="main-content" className="container mx-auto py-6 px-4 max-w-5xl" role="main">
        {/* Summary Card */}
        <Card className="grove-card-glow mb-6">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Due This Month</p>
                <p className="text-2xl font-bold money-amount" style={{ color: 'var(--primary)' }}>
                  {formatCurrency(monthlyTotal)}
                </p>
              </div>
              <div className="text-right text-sm space-y-0.5">
                {statusCounts.overdue > 0 && (
                  <p style={{ color: 'var(--destructive)' }}>
                    {statusCounts.overdue} overdue
                  </p>
                )}
                {statusCounts.dueSoon > 0 && (
                  <p style={{ color: 'var(--chart-3)' }}>
                    {statusCounts.dueSoon} due soon
                  </p>
                )}
                <p style={{ color: 'var(--primary)' }}>
                  {statusCounts.paid + statusCounts.autoPay} paid/auto
                </p>
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'var(--primary)' }} />
                Paid / Auto-pay
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'var(--chart-3)' }} />
                Due within 3 days
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: 'var(--destructive)' }} />
                Overdue
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth(-1)}
            className="min-w-[44px] min-h-[44px]"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h2 className="text-lg font-semibold">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigateMonth(1)}
            className="min-w-[44px] min-h-[44px]"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card className="grove-card-glow mb-8">
          <CardContent className="pt-4 pb-3">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px mb-1">
              {DAY_LABELS.map((label) => (
                <div
                  key={label}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {label}
                </div>
              ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7 gap-px">
              {calendarCells.map((day, idx) => {
                const dayBills = day ? billsByDay[day] || [] : [];
                const todayHighlight = day ? isToday(day) : false;
                return (
                  <div
                    key={idx}
                    className="min-h-[60px] sm:min-h-[80px] p-1 rounded-md relative"
                    style={{
                      background: todayHighlight
                        ? 'rgba(100, 255, 218, 0.08)'
                        : day
                        ? 'rgba(255,255,255,0.02)'
                        : 'transparent',
                    }}
                  >
                    {day && (
                      <>
                        <span
                          className="text-xs font-medium block mb-0.5"
                          style={{
                            color: todayHighlight ? '#64FFDA' : 'var(--secondary-foreground)',
                          }}
                        >
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {dayBills.map((bill) => {
                            const status = getBillStatus(bill, day, today, viewYear, viewMonth);
                            const color = getStatusColor(status);
                            return (
                              <button
                                key={bill.id}
                                onClick={() => {
                                  setEditingBill(bill);
                                  setShowForm(true);
                                }}
                                className="w-full text-left rounded px-1 py-0.5 text-[10px] sm:text-xs truncate transition-all hover:opacity-80"
                                style={{
                                  backgroundColor: `${color}15`,
                                  borderLeft: `2px solid ${color}`,
                                  color,
                                }}
                                aria-label={`${bill.name} ${formatCurrency(bill.amount)} - ${getStatusLabel(status)}`}
                              >
                                <span className="hidden sm:inline">{bill.emoji} </span>
                                {bill.name}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bills List */}
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
          All Bills
        </h2>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {sortedBills.map((bill) => {
              const day = Math.min(bill.dueDay, daysInMonth);
              const status = getBillStatus(bill, day, today, viewYear, viewMonth);
              const color = getStatusColor(status);
              const paidKey = getPaidKey(viewYear, viewMonth);
              const isPaid = bill.paidDates.includes(paidKey);
              return (
                <motion.div
                  key={bill.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="grove-card-glow">
                    <CardContent className="py-3 px-4 flex items-center gap-3">
                      {/* Emoji */}
                      <span className="text-xl flex-shrink-0">{bill.emoji}</span>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{bill.name}</span>
                          {bill.autoPay && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: 'rgba(100, 255, 218, 0.12)',
                                color: 'var(--primary)',
                              }}
                            >
                              <Zap className="h-2.5 w-2.5 inline -mt-0.5" aria-hidden="true" /> Auto
                            </span>
                          )}
                          {bill.recurring && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              ↻ Monthly
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            Due {getOrdinal(bill.dueDay)} of each month
                          </span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${color}15`,
                              color,
                            }}
                          >
                            {getStatusLabel(status)}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <span
                        className="money-amount text-sm font-semibold flex-shrink-0"
                        style={{ color }}
                      >
                        {formatCurrency(bill.amount)}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePaid(bill.id)}
                          className="min-w-[44px] min-h-[44px]"
                          aria-label={isPaid ? `Mark ${bill.name} as unpaid` : `Mark ${bill.name} as paid`}
                        >
                          <Check
                            className="h-4 w-4"
                            style={{ color: isPaid ? '#64FFDA' : '#c0ddd050' }}
                            aria-hidden="true"
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingBill(bill);
                            setShowForm(true);
                          }}
                          className="min-w-[44px] min-h-[44px]"
                          aria-label={`Edit ${bill.name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(bill.id)}
                          className="min-w-[44px] min-h-[44px]"
                          aria-label={`Delete ${bill.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {bills.length === 0 && (
            <Card className="grove-card-glow">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ReceiptText className="h-12 w-12 text-muted-foreground mb-3" aria-hidden="true" />
                <p className="text-lg font-medium mb-2">No bills yet</p>
                <p className="text-muted-foreground mb-4 text-center max-w-sm">
                  Add your recurring bills to stay on top of due dates.
                </p>
                <Button
                  onClick={() => {
                    setEditingBill(null);
                    setShowForm(true);
                  }}
                  className="min-h-[44px]"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Your First Bill
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Bill Form Dialog */}
      <BillForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingBill(null);
        }}
        onSubmit={handleAddOrEdit}
        editBill={editingBill}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
