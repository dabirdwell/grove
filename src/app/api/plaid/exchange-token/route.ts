import { NextRequest, NextResponse } from 'next/server';
import { CountryCode } from 'plaid';
import { plaidClient, plaidConfig } from '@/lib/plaid';
import prisma from '@/lib/db';
import type { SafeAccount } from '@/types';

export async function POST(request: NextRequest) {
  if (!plaidConfig.isConfigured) {
    return NextResponse.json(
      { error: 'Plaid is not configured. Please set PLAID_CLIENT_ID and PLAID_SECRET.' },
      { status: 500 }
    );
  }

  try {
    const { publicToken, userId } = await request.json();

    if (!publicToken) {
      return NextResponse.json(
        { error: 'Missing public_token' },
        { status: 400 }
      );
    }

    // For demo purposes, use a default user ID if none provided
    const effectiveUserId = userId || 'demo-user';

    console.log('\n--- [API /plaid/exchange-token] Exchanging Public Token ---');

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    console.log(`  Item ID: ${itemId}`);
    console.log(`  Access Token: ${accessToken.slice(0, 15)}...`);

    // Get institution info
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });

    let institutionName = '';
    let institutionLogo = '';

    if (itemResponse.data.item.institution_id) {
      try {
        const instResponse = await plaidClient.institutionsGetById({
          institution_id: itemResponse.data.item.institution_id,
          country_codes: [CountryCode.Us],
        });
        institutionName = instResponse.data.institution.name;
        institutionLogo = instResponse.data.institution.logo || '';
      } catch {
        console.log('  Could not fetch institution details');
      }
    }

    // Fetch auth and balance data
    console.log('\n--- [API /plaid/exchange-token] Fetching Auth & Balance ---');

    const [authResponse, balanceResponse] = await Promise.all([
      plaidClient.authGet({ access_token: accessToken }),
      plaidClient.accountsBalanceGet({ access_token: accessToken }),
    ]);

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { id: effectiveUserId } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: effectiveUserId,
          email: `${effectiveUserId}@demo.flow`,
          name: 'Demo User',
        },
      });
    }

    // Save or update PlaidItem
    const existingItem = await prisma.plaidItem.findUnique({
      where: {
        userId_plaidItemId: {
          userId: effectiveUserId,
          plaidItemId: itemId,
        },
      },
    });

    let plaidItem;
    if (existingItem) {
      plaidItem = await prisma.plaidItem.update({
        where: { id: existingItem.id },
        data: {
          accessToken,
          institutionName,
          institutionLogoUrl: institutionLogo,
          status: 'active',
        },
      });
      console.log(`  Updated existing PlaidItem: ${plaidItem.id}`);
    } else {
      plaidItem = await prisma.plaidItem.create({
        data: {
          userId: effectiveUserId,
          plaidItemId: itemId,
          accessToken,
          institutionName,
          institutionLogoUrl: institutionLogo,
          status: 'active',
        },
      });
      console.log(`  Created new PlaidItem: ${plaidItem.id}`);
    }

    // Process and save accounts
    console.log('\n--- [API /plaid/exchange-token] Processing Accounts ---');

    const processedAccounts: SafeAccount[] = [];

    for (const plaidAccount of balanceResponse.data.accounts) {
      // Get auth data for this account
      const authNumbers = authResponse.data.numbers.ach.find(
        n => n.account_id === plaidAccount.account_id
      );

      const currentBalance = plaidAccount.balances.current ?? plaidAccount.balances.available ?? 0;

      // Upsert account
      const account = await prisma.account.upsert({
        where: {
          userId_plaidAccountId: {
            userId: effectiveUserId,
            plaidAccountId: plaidAccount.account_id,
          },
        },
        update: {
          name: plaidAccount.name,
          mask: plaidAccount.mask || undefined,
          type: plaidAccount.type,
          subtype: plaidAccount.subtype || undefined,
          currentBalance,
          availableBalance: plaidAccount.balances.available ?? undefined,
          lastSyncedAt: new Date(),
        },
        create: {
          userId: effectiveUserId,
          plaidItemId: plaidItem.id,
          plaidAccountId: plaidAccount.account_id,
          name: plaidAccount.name,
          mask: plaidAccount.mask || undefined,
          type: plaidAccount.type,
          subtype: plaidAccount.subtype || undefined,
          currentBalance,
          availableBalance: plaidAccount.balances.available ?? undefined,
          lastSyncedAt: new Date(),
        },
      });

      processedAccounts.push({
        accountId: account.id,
        name: account.name,
        mask: account.mask || undefined,
        plaidType: account.type || undefined,
        plaidSubtype: account.subtype || undefined,
        balance: currentBalance,
        institutionName: institutionName,
        isMaster: account.isMaster,
      });

      console.log(
        `  Processed: '${account.name}' (${plaidAccount.account_id.slice(-4)}), ` +
        `Type: ${account.subtype}, Balance: ${currentBalance}, ACH: ${Boolean(authNumbers)}`
      );
    }

    console.log(`--- [API /plaid/exchange-token] Saved ${processedAccounts.length} accounts ---`);

    return NextResponse.json({
      message: 'Accounts retrieved. Please select master account.',
      itemId: plaidItem.id,
      accounts: processedAccounts,
    });
  } catch (error) {
    console.error('[API /plaid/exchange-token] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to exchange token', details: errorMessage },
      { status: 500 }
    );
  }
}
