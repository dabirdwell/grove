import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, plaidConfig } from '@/lib/plaid';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!plaidConfig.isConfigured) {
    return NextResponse.json(
      { error: 'Plaid is not configured' },
      { status: 500 }
    );
  }

  try {
    const { userId, accountId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    console.log('\n--- [API /plaid/balance/refresh] Refreshing balances ---');

    // Get all active PlaidItems for user (or specific account)
    const whereClause = accountId
      ? {
          userId,
          accounts: { some: { id: accountId } },
          status: 'active',
        }
      : { userId, status: 'active' };

    const plaidItems = await prisma.plaidItem.findMany({
      where: whereClause,
      include: { accounts: true },
    });

    if (plaidItems.length === 0) {
      return NextResponse.json(
        { error: 'No linked accounts found' },
        { status: 404 }
      );
    }

    const updatedAccounts: {
      id: string;
      name: string;
      currentBalance: number;
      availableBalance: number | null;
    }[] = [];

    for (const item of plaidItems) {
      console.log(`  Refreshing: ${item.institutionName || item.id}`);

      // Fetch latest balances from Plaid
      const balanceResponse = await plaidClient.accountsBalanceGet({
        access_token: item.accessToken,
      });

      for (const plaidAccount of balanceResponse.data.accounts) {
        // Find matching account in our DB
        const account = item.accounts.find(
          a => a.plaidAccountId === plaidAccount.account_id
        );

        if (!account) continue;

        // Skip if we're only updating a specific account
        if (accountId && account.id !== accountId) continue;

        const currentBalance = plaidAccount.balances.current ?? 0;
        const availableBalance = plaidAccount.balances.available ?? null;

        // Update account balance
        await prisma.account.update({
          where: { id: account.id },
          data: {
            currentBalance,
            availableBalance,
            lastSyncedAt: new Date(),
          },
        });

        // Log the balance sync
        await prisma.transaction.create({
          data: {
            userId,
            accountId: account.id,
            type: 'BALANCE_SYNC',
            amount: currentBalance,
            description: `Balance refreshed for ${account.name}`,
            metadata: JSON.stringify({
              previousBalance: account.currentBalance,
              newBalance: currentBalance,
              availableBalance,
            }),
          },
        });

        updatedAccounts.push({
          id: account.id,
          name: account.name,
          currentBalance,
          availableBalance,
        });

        console.log(`    ${account.name}: $${currentBalance}`);
      }
    }

    console.log(`--- [API /plaid/balance/refresh] Updated ${updatedAccounts.length} accounts ---`);

    return NextResponse.json({
      success: true,
      accounts: updatedAccounts,
      message: `Updated balances for ${updatedAccounts.length} account(s)`,
    });
  } catch (error) {
    console.error('[API /plaid/balance/refresh] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to refresh balances', details: errorMessage },
      { status: 500 }
    );
  }
}
