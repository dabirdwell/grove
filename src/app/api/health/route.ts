import { NextResponse } from 'next/server';

export async function GET() {
  const plaidConfigured = Boolean(
    process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET
  );

  return NextResponse.json({
    status: 'ok',
    mode: plaidConfigured ? 'live' : 'demo',
    timestamp: new Date().toISOString(),
  });
}
