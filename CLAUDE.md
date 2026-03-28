# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grove (internally "Flow") is a financial wellness app that visualizes money allocation as a living 3D tree. The core philosophy: make money management feel like tending a garden, not filing taxes. The app should reduce financial anxiety through calm, organic design.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint

# Database
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database and reseed
npx prisma studio    # Open Prisma database GUI
npx prisma db push   # Push schema changes to database
```

## Architecture

### Tech Stack
- **Framework:** Next.js 16 (App Router)
- **3D:** Three.js via @react-three/fiber and @react-three/drei
- **Database:** SQLite via Prisma
- **Banking:** Plaid API for account linking
- **UI:** Radix UI primitives + Tailwind CSS v4 + Framer Motion
- **Financial Math:** Decimal.js for precision

### Core Financial Engine

The allocation engine in `src/lib/engine/financial-manager.ts` implements a waterfall allocation system:

1. **fixed_dollar** - Fixed amounts allocated first
2. **percent_of_income** - Percentage of total income
3. **percent_of_remainder** - Creates discretionary pool from what's left
4. **percent_of_discretionary** - Allocates from the discretionary pool

All money calculations use Decimal.js to avoid floating-point errors.

### Key Data Flow

```
User Income → FinancialManager.processIncomeAllocation()
           → Waterfall through buckets by priority
           → Generate FlowData for visualization
           → Render as 3D tree (MoneyTree) or Sankey diagram
```

### Important Directories

- `src/lib/engine/` - Financial allocation logic (the core)
- `src/components/tree/` - 3D money tree visualization (Three.js)
- `src/components/flow/` - 2D Sankey diagram fallback
- `src/components/buckets/` - Bucket CRUD components
- `src/app/api/` - Next.js API routes (Plaid integration, CRUD)
- `prisma/` - Database schema and seed data

### Demo Mode

The app supports demo mode (no Plaid connection). Demo account IDs start with `demo-`. Always check for demo mode before making API calls:

```typescript
const isDemoMode = masterAccountId?.startsWith('demo-') || !plaidConnected;
if (isDemoMode) {
  // Handle locally without API
  return;
}
```

## Design System: Midnight Lagoon

The visual identity uses a dark, bioluminescent palette. Key colors:

```css
--lagoon-deep:    #0A1628   /* Background */
--lagoon-surface: #134E5E   /* Water horizon */
--glow-cyan:      #64FFDA   /* Primary accent, success */
--glow-gold:      #FFD93D   /* Achievements only */
--glow-coral:     #FF6B6B   /* Warnings (soft) */
--bark-mid:       #3D6B5A   /* Tree trunk */
--mist-bright:    #E8F4F0   /* Primary text */
```

Rules:
- Never pure white or pure black
- Gold is earned (achievements only)
- Glow indicates status (bright = healthy, dim = needs attention)

## Type System

Core types in `src/types/index.ts`:

- **Account** - Bank account (master or external)
- **Bucket** - Allocation category with type, value, priority
- **AllocationResult** - Output of processIncomeAllocation()
- **FlowData** - Nodes and links for visualization

Bucket values for percentage types must be between 0-1 (not 0-100).

## Plaid Integration

API routes in `src/app/api/plaid/`:
- `create-link-token/` - Initialize Plaid Link
- `exchange-token/` - Exchange public token for access token
- `transactions/sync/` - Sync transactions from Plaid
- `transfer/create/` - Initiate ACH transfer
- `balance/refresh/` - Refresh account balances

The Plaid client is initialized in `src/lib/plaid/client.ts`.

## Development Notes

- Path alias: `@/*` maps to `./src/*`
- Components use Radix UI with custom styling, not shadcn/ui CLI
- Sound effects are off by default (see `src/hooks/use-sound-effects.ts`)
- The 3D tree uses dynamic imports with `ssr: false` to avoid WebGL SSR issues
- Respect `prefers-reduced-motion` - disable animations when requested


## Related
- [[Products and Services Canon]]
- [[GARDEN_INTERACTION_SPEC]]
- [[GROVE_3D_SPECIFICATION]]
- [[Foundation Canon]]
