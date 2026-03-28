import { NextResponse } from 'next/server';
import { plaidClient, plaidConfig } from '@/lib/plaid';
import { CountryCode, Products } from 'plaid';

export async function POST() {
  if (!plaidConfig.isConfigured) {
    return NextResponse.json(
      { error: 'Plaid is not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET.' },
      { status: 500 }
    );
  }

  try {
    // For now, use a static user ID. In production, this should come from auth
    const userId = 'flow_user_demo';

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: 'Flow',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    console.log(`[API /plaid/create-link-token] Link Token Created: ${response.data.link_token.slice(0, 10)}...`);

    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error('[API /plaid/create-link-token] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create link token', details: errorMessage },
      { status: 500 }
    );
  }
}
