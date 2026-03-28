import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, plaidConfig } from '@/lib/plaid';
import prisma from '@/lib/db';
import type { Transaction as PlaidTransaction, RemovedTransaction } from 'plaid';

// Income categories to detect deposits
const INCOME_CATEGORIES = [
  'INCOME',
  'TRANSFER_IN_ACCOUNT_TRANSFER',
  'TRANSFER_IN_DEPOSIT',
  'TRANSFER_IN_PAYROLL',
];

// Minimum amount to consider as income
const MIN_INCOME_AMOUNT = 100;

interface SyncResult {
  added: number;
  modified: number;
  removed: number;
  incomeDetected: { amount: number; description: string; date: string }[];
}

export async function POST(request: NextRequest) {
  if (!plaidConfig.isConfigured) {
    return NextResponse.json(
      { error: 'Plaid is not configured' },
      { status: 500 }
    );
  }

  try {
    const { userId, plaidItemId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    console.log('\n--- [API /plaid/transactions/sync] Starting transaction sync ---');

    // Find the PlaidItem(s) to sync
    const whereClause = plaidItemId
      ? { id: plaidItemId, userId }
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

    const results: Record<string, SyncResult> = {};

    for (const item of plaidItems) {
      console.log(`  Syncing item: ${item.institutionName || item.id}`);

      const itemResult: SyncResult = {
        added: 0,
        modified: 0,
        removed: 0,
        incomeDetected: [],
      };

      let cursor = item.transactionsCursor || undefined;
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.accessToken,
          cursor,
          count: 500,
        });

        const { added, modified, removed, next_cursor, has_more } = response.data;

        // Process added transactions
        for (const txn of added) {
          await processTransaction(txn, item.id, userId, 'added');
          itemResult.added++;

          // Check for income
          if (isIncomeTransaction(txn)) {
            itemResult.incomeDetected.push({
              amount: Math.abs(txn.amount),
              description: txn.name,
              date: txn.date,
            });

            // Log income detection
            await prisma.transaction.create({
              data: {
                userId,
                accountId: getAccountIdForPlaidAccount(item.accounts, txn.account_id),
                type: 'INCOME_DETECTED',
                amount: Math.abs(txn.amount),
                plaidTransactionId: txn.transaction_id,
                description: txn.name,
                merchantName: txn.merchant_name || undefined,
                category: txn.personal_finance_category?.primary || undefined,
                transactionDate: new Date(txn.date),
                metadata: JSON.stringify({
                  plaidCategory: txn.personal_finance_category,
                  paymentChannel: txn.payment_channel,
                }),
              },
            });
          }
        }

        // Process modified transactions
        for (const txn of modified) {
          await processTransaction(txn, item.id, userId, 'modified');
          itemResult.modified++;
        }

        // Process removed transactions
        for (const removed_txn of removed) {
          await processRemovedTransaction(removed_txn, userId);
          itemResult.removed++;
        }

        cursor = next_cursor;
        hasMore = has_more;
      }

      // Update cursor for next sync
      await prisma.plaidItem.update({
        where: { id: item.id },
        data: {
          transactionsCursor: cursor,
          lastTransactionSync: new Date(),
        },
      });

      results[item.id] = itemResult;
      console.log(`  Completed: +${itemResult.added} ~${itemResult.modified} -${itemResult.removed}`);
    }

    // Calculate total income detected
    const totalIncomeDetected = Object.values(results).flatMap(r => r.incomeDetected);

    console.log('--- [API /plaid/transactions/sync] Sync complete ---');

    return NextResponse.json({
      success: true,
      results,
      incomeDetected: totalIncomeDetected,
      message: totalIncomeDetected.length > 0
        ? `Detected ${totalIncomeDetected.length} income transaction(s) totaling $${totalIncomeDetected.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}`
        : 'Transaction sync complete. No new income detected.',
    });
  } catch (error) {
    console.error('[API /plaid/transactions/sync] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to sync transactions', details: errorMessage },
      { status: 500 }
    );
  }
}

function isIncomeTransaction(txn: PlaidTransaction): boolean {
  // Plaid amounts are negative for credits (money coming in)
  if (txn.amount >= 0) return false;

  const amount = Math.abs(txn.amount);
  if (amount < MIN_INCOME_AMOUNT) return false;

  // Check category
  const category = txn.personal_finance_category?.primary;
  if (category && INCOME_CATEGORIES.includes(category)) {
    return true;
  }

  // Check detailed category
  const detailed = txn.personal_finance_category?.detailed;
  if (detailed && INCOME_CATEGORIES.some(c => detailed.startsWith(c))) {
    return true;
  }

  return false;
}

function getAccountIdForPlaidAccount(
  accounts: { id: string; plaidAccountId: string | null }[],
  plaidAccountId: string
): string | undefined {
  return accounts.find(a => a.plaidAccountId === plaidAccountId)?.id;
}

async function processTransaction(
  txn: PlaidTransaction,
  plaidItemId: string,
  userId: string,
  action: 'added' | 'modified'
) {
  // Store in transaction log for audit purposes
  // In a full implementation, you might also update account balances here
  console.log(`    ${action}: ${txn.name} - $${txn.amount} (${txn.date})`);
}

async function processRemovedTransaction(
  txn: RemovedTransaction,
  userId: string
) {
  // Mark any related transactions as removed
  if (txn.transaction_id) {
    await prisma.transaction.updateMany({
      where: {
        userId,
        plaidTransactionId: txn.transaction_id,
      },
      data: {
        status: 'removed',
        metadata: JSON.stringify({ removedAt: new Date().toISOString() }),
      },
    });
  }
}
