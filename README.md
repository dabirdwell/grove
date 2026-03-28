# Grove

A financial wellness app that visualizes money allocation as a living 3D tree. Grove turns budgeting into something that feels like tending a garden — not filing taxes.

<!-- TODO: Add screenshot -->
![Grove Screenshot](docs/screenshot-placeholder.png)

## Features

- **3D Money Tree** — Watch your finances grow as an interactive Three.js tree. Healthy allocations glow bright; areas that need attention dim.
- **Waterfall Allocation** — Assign income to buckets using fixed amounts, percentages, or discretionary splits, processed in priority order.
- **Sankey Flow Diagram** — See exactly where every dollar goes with an animated D3 Sankey visualization.
- **Bank Linking** — Connect real accounts via Plaid for live balances and transaction sync.
- **Demo Mode** — Explore everything with sample data, no bank account required.

## Tech Stack

Next.js 16 · React 19 · Three.js · D3.js · Prisma (SQLite) · Plaid · Tailwind CSS v4 · Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repo
git clone <repo-url> && cd flow

# Install dependencies
npm install

# Create your env file (app works in demo mode with defaults)
cp .env.example .env

# Set up the database
npx prisma db push
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see Grove.

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Reset DB and reseed |
| `npx prisma studio` | Open database GUI |

## Demo Mode

Grove runs fully offline when Plaid credentials are not set. Demo accounts (IDs prefixed with `demo-`) provide realistic sample data so you can explore every feature without connecting a bank.

The `/api/health` endpoint reports the current mode:

```json
{ "status": "ok", "mode": "demo", "timestamp": "..." }
```

## Plaid Integration

To connect real bank accounts, add your Plaid credentials to `.env`:

```env
PLAID_CLIENT_ID="your-client-id"
PLAID_SECRET="your-secret"
PLAID_ENV="sandbox"   # or "development" / "production"
```

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F<owner>%2F<repo>&env=DATABASE_URL,PLAID_CLIENT_ID,PLAID_SECRET,PLAID_ENV,NEXT_PUBLIC_APP_URL&envDescription=See%20.env.example%20for%20defaults&project-name=grove&framework=nextjs)

> **Note:** SQLite works for demo/preview deploys. For production, switch `DATABASE_URL` to a hosted database (e.g. Turso, PlanetScale).

## License

Private — all rights reserved.
