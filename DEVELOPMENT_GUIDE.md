# Flow: Development Guide for Claude Code
## Creative Enhancements & Bug Fixes

**Context:** This is a financial orchestrator app for Ashley. The core structure is built but needs polish, bug fixes, and creative enhancements to feel delightful rather than functional.

**Philosophy:** This app should feel like a brilliant friend who's great with money, not like a spreadsheet. Every interaction should reduce financial anxiety, not create it.

---

## PRIORITY 1: Bug Fixes (Do First)

### 1.1 Demo Mode Detection

**Problem:** The app has demo mode (using fake accounts) and real mode (Plaid-connected accounts). Currently, some functions try to call APIs even in demo mode, causing errors.

**Files to check:**
- `src/app/page.tsx` - Main dashboard
- All API calls should check if we're in demo mode first

**Pattern to follow:**
```typescript
const isDemoMode = masterAccountId?.startsWith('demo-') || !plaidConnected;

if (isDemoMode) {
  // Handle locally without API
  return;
}

// Real mode: call API
```

**Apply this pattern to:**
- ✅ `handleCreateBucket` (already fixed)
- ✅ `handleDeleteBucket` (already fixed)
- `handleSelectMasterAccount`
- Any other API-calling functions

### 1.2 Bucket Form Not Resetting

**Problem:** After creating a bucket, the form should reset but might retain old values.

**Fix:** In `BucketForm`, ensure `useEffect` resets form when `editBucket` changes and when dialog closes.

### 1.3 Flow Visualization Empty State

**Problem:** Sometimes shows "Processing flow data..." indefinitely.

**Debug:** Add console.log in `AnimatedSankey` to trace data flow. The Sankey library needs at least one link to work.

---

## PRIORITY 2: Quick Polish (High Impact, Low Effort)

### 2.1 Smart Percentage Input with Live Preview

**Location:** `src/components/buckets/bucket-form.tsx`

**Current:** User types "20" and it converts to 0.20 on submit.

**Enhancement:** Show live preview as they type.

```tsx
// Add state for preview
const [preview, setPreview] = useState<string>('');

// Add effect to calculate preview
useEffect(() => {
  if (!value || !isPercentage) {
    setPreview('');
    return;
  }
  
  const percent = parseFloat(value);
  if (isNaN(percent)) return;
  
  // Assume average paycheck of $2,800 for preview
  // Later: use actual last income amount from context
  const sampleIncome = 2800;
  const amount = (percent > 1 ? percent / 100 : percent) * sampleIncome;
  setPreview(`≈ $${amount.toLocaleString()} of a $${sampleIncome.toLocaleString()} paycheck`);
}, [value, isPercentage]);

// Show preview below input
{preview && (
  <p className="text-xs text-muted-foreground mt-1 animate-in fade-in">
    {preview}
  </p>
)}
```

**Why:** Percentages are abstract. Dollars are real. This makes the allocation tangible.

### 2.2 Keyboard Shortcuts

**Location:** Create `src/hooks/use-keyboard-shortcuts.ts`

```typescript
import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewBucket?: () => void;
  onAllocate?: () => void;
  onHelp?: () => void;
}

export function useKeyboardShortcuts({ onNewBucket, onAllocate, onHelp }: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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
      }
    };
    
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNewBucket, onAllocate, onHelp]);
}
```

**Use in page.tsx:**
```typescript
useKeyboardShortcuts({
  onNewBucket: () => setShowBucketForm(true),
  onAllocate: () => { /* focus allocation input */ },
  onHelp: () => { /* show help modal */ },
});
```

### 2.3 Animated Empty State for Buckets

**Location:** `src/app/page.tsx`, in the buckets section empty state

**Current:** Static text saying "Your money is waiting for direction!"

**Enhancement:**
```tsx
{buckets.length === 0 && (
  <AnimatedCard>
    <CardContent className="flex flex-col items-center justify-center py-12">
      <motion.div
        className="text-6xl mb-4"
        animate={{ 
          y: [0, -10, 0],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        💸
      </motion.div>
      <p className="text-lg font-medium mb-2">Your money is waiting!</p>
      <p className="text-muted-foreground mb-4 text-center max-w-sm">
        Create your first bucket to tell your income where to go.
      </p>
      <AnimatedButton onClick={() => setShowBucketForm(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Create Your First Bucket
      </AnimatedButton>
    </CardContent>
  </AnimatedCard>
)}
```

### 2.4 Better Time-of-Day Greeting

**Location:** `src/app/page.tsx`

**Current:** Always says "Good morning! 👋"

**Enhancement:**
```typescript
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', emoji: '☀️' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '👋' };
  if (hour < 21) return { text: 'Good evening', emoji: '🌆' };
  return { text: 'Burning the midnight oil', emoji: '🌙' };
};

const greeting = getGreeting();

// In JSX:
<h1 className="text-3xl font-bold tracking-tight">
  {greeting.text}! {greeting.emoji}
</h1>
```

### 2.5 Confetti on First Allocation

**Location:** `src/app/page.tsx`, in `handleAllocate`

**Current:** Shows confetti on every allocation.

**Enhancement:** Extra special celebration on FIRST allocation.

```typescript
const [hasAllocatedBefore, setHasAllocatedBefore] = useState(false);

// In handleAllocate success:
if (!hasAllocatedBefore) {
  celebrations.firstAllocation(); // Big celebration
  setHasAllocatedBefore(true);
  toast.success('Your first allocation! 🎉', {
    description: 'You just took control of your money. This is huge.',
  });
} else {
  celebrations.allocationComplete(); // Normal celebration
}
```

Add to `confetti.tsx`:
```typescript
firstAllocation: () => {
  // Three bursts from different angles
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6, x: 0.3 } });
  setTimeout(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6, x: 0.7 } });
  }, 200);
  setTimeout(() => {
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5, x: 0.5 } });
  }, 400);
},
```

---

## PRIORITY 3: Flow Visualization Improvements

### 3.1 Smoother Animation Easing

**Location:** `src/components/flow/animated-sankey.tsx`

**Current:** Animation might feel mechanical.

**Fix:** Ensure easing is "easeInOutCubic" not linear. Water flows, it doesn't march.

```typescript
// In motion.path for links:
transition={{ 
  duration: 0.8, 
  delay: i * 0.1, 
  ease: [0.4, 0, 0.2, 1] // Cubic bezier for natural feel
}}
```

### 3.2 Hover Tooltips with Context

**Current:** Shows "Source → Target: $amount"

**Enhancement:** Show percentage and context:
```typescript
tooltipRef.current.innerHTML = `
  <div class="font-medium">${link.source.name} → ${link.target.name}</div>
  <div class="text-lg money-amount">$${link.value.toLocaleString()}</div>
  <div class="text-xs text-muted-foreground">
    ${((link.value / totalIncome) * 100).toFixed(1)}% of your income
  </div>
`;
```

### 3.3 Click Node to Edit Bucket

**Current:** Clicking a node does nothing useful.

**Enhancement:** 
```typescript
onNodeClick={(node) => {
  if (node.type === 'bucket') {
    const bucket = buckets.find(b => b.name === node.name);
    if (bucket) {
      setEditingBucket(bucket);
      setShowBucketForm(true);
    }
  }
}}
```

---

## PRIORITY 4: User Delight Features

### 4.1 Bucket Suggestions for New Users

**Location:** `src/components/buckets/bucket-form.tsx`

When the form opens and there are 0 buckets, show suggestions:

```tsx
{buckets.length === 0 && (
  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
    <p className="text-sm font-medium mb-2">Popular first buckets:</p>
    <div className="flex flex-wrap gap-2">
      {[
        { emoji: '💰', name: 'Savings', type: 'percent_of_income', value: 20 },
        { emoji: '🏠', name: 'Rent', type: 'fixed_dollar', value: 1500 },
        { emoji: '🛒', name: 'Groceries', type: 'fixed_dollar', value: 400 },
      ].map((suggestion) => (
        <Button
          key={suggestion.name}
          variant="outline"
          size="sm"
          onClick={() => {
            setName(suggestion.name);
            setEmoji(suggestion.emoji);
            setAllocationType(suggestion.type);
            setValue(suggestion.value.toString());
          }}
        >
          {suggestion.emoji} {suggestion.name}
        </Button>
      ))}
    </div>
  </div>
)}
```

### 4.2 Allocation Summary with Encouragement

**Location:** `src/components/dashboard/allocation-panel.tsx`

After allocation, show encouraging summary:

```typescript
const getEncouragement = (savingsRate: number) => {
  if (savingsRate >= 0.3) return "Incredible! You're saving like a pro.";
  if (savingsRate >= 0.2) return "Solid! 20%+ savings is the golden rule.";
  if (savingsRate >= 0.1) return "Great start! Every dollar saved counts.";
  return "You've got a plan. That's what matters.";
};

// In the result display:
<p className="text-sm text-muted-foreground mt-2">
  {getEncouragement(savingsAmount / totalIncome)}
</p>
```

### 4.3 "What If" Quick Slider

**Location:** `src/components/dashboard/allocation-panel.tsx`

Add a slider to quickly explore different income amounts:

```tsx
<div className="mt-4 space-y-2">
  <Label className="text-sm text-muted-foreground">Quick explore</Label>
  <Slider
    min={1000}
    max={10000}
    step={100}
    value={[incomeAmount]}
    onValueChange={([val]) => {
      setIncomeAmount(val);
      // Trigger preview without executing
    }}
  />
  <p className="text-xs text-muted-foreground text-center">
    Drag to see how allocations change
  </p>
</div>
```

---

## PRIORITY 5: Error Message Improvements

### 5.1 Friendly Error Messages

Create `src/lib/friendly-errors.ts`:

```typescript
export function friendlyError(error: string): string {
  const errorMap: Record<string, string> = {
    'No master account set': 'Pick which account receives your income first!',
    'Failed to fetch': 'Having trouble connecting. Check your internet?',
    'Allocation exceeds': 'Your buckets add up to more than your income. Let\'s adjust.',
    'Invalid input': 'Hmm, that doesn\'t look quite right. Try a number like 1500 or 20%',
    'Network error': 'Connection hiccup. Your data is safe-try again in a moment.',
  };
  
  for (const [key, friendly] of Object.entries(errorMap)) {
    if (error.includes(key)) return friendly;
  }
  
  return error; // Fallback to original
}
```

Use throughout the app:
```typescript
toast.error('Oops!', {
  description: friendlyError(error.message),
});
```

---

## PRIORITY 6: Mobile Polish

### 6.1 Thumb-Zone Navigation

The main actions (Add Bucket, Allocate) should be reachable with one thumb on mobile.

Add a floating action button for mobile:
```tsx
{/* Mobile FAB */}
<div className="fixed bottom-6 right-6 md:hidden z-40">
  <Button
    size="lg"
    className="rounded-full w-14 h-14 shadow-lg"
    onClick={() => setShowBucketForm(true)}
  >
    <Plus className="h-6 w-6" />
  </Button>
</div>
```

### 6.2 Swipe to Delete Bucket

Consider adding swipe gestures on bucket cards for mobile. Use `framer-motion` drag:

```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(_, info) => {
    if (info.offset.x < -100) {
      handleDeleteBucket(bucket.bucketId);
    }
  }}
>
  <BucketCard ... />
</motion.div>
```

---

## Code Quality Notes

1. **TypeScript:** Fix any `any` types. The codebase should be fully typed.

2. **Console.logs:** Remove debug console.logs before finishing.

3. **Error Boundaries:** Add a React error boundary around the main content.

4. **Loading States:** Every async action should have a loading state.

5. **Accessibility:** 
   - All buttons need aria-labels
   - Focus management for dialogs
   - Screen reader announcements for allocation results

---

## Testing Checklist

Before considering done:

- [ ] Create bucket in demo mode works
- [ ] Delete bucket in demo mode works
- [ ] Allocation runs and shows flow animation
- [ ] Flow diagram renders with proper labels
- [ ] Confetti fires on first allocation
- [ ] Error messages are friendly, not technical
- [ ] Works on mobile (responsive)
- [ ] Keyboard shortcuts work (N, A, ?)
- [ ] Page refreshes don't lose demo state (localStorage?)

---

## Questions for Human

If unclear on any of these, ask David:
1. Should demo data persist in localStorage between sessions?
2. What's Ashley's typical income range for the preview calculations?
3. Do we want sound effects on by default or off?

---

*Remember: This app should feel like a friend helping with money, not like software processing transactions.*


## Related
- [[Products and Services Canon]]
- [[GARDEN_INTERACTION_SPEC]]
- [[GROVE_3D_SPECIFICATION]]
- [[Foundation Canon]]
