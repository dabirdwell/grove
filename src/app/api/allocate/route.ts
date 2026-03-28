import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import prisma from '@/lib/db';
import { FinancialManager, createAccount, createBucket } from '@/lib/engine';
import type { Account, Bucket, AllocationTypeValue } from '@/types';

// POST /api/allocate - Run income allocation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { incomeAmount, userId = 'demo-user', saveHistory = true } = body;

    // Validate income amount
    if (!incomeAmount || isNaN(Number(incomeAmount)) || Number(incomeAmount) <= 0) {
      return NextResponse.json(
        { error: 'Invalid income amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    console.log(`\n--- [API /allocate] Received request for $${incomeAmount} ---`);

    // Get master account
    const masterAccountData = await prisma.account.findFirst({
      where: { userId, isMaster: true },
    });

    if (!masterAccountData) {
      return NextResponse.json(
        { error: 'No master account set. Please link an account and set it as master.' },
        { status: 400 }
      );
    }

    // Get all accounts
    const allAccountsData = await prisma.account.findMany({
      where: { userId },
    });

    // Get buckets
    const bucketsData = await prisma.bucket.findMany({
      where: { userId, isArchived: false },
      orderBy: { priority: 'asc' },
    });

    if (bucketsData.length === 0) {
      return NextResponse.json(
        { error: 'No buckets configured. Please create at least one bucket.' },
        { status: 400 }
      );
    }

    // Create Account objects
    const masterAccount: Account = createAccount({
      accountId: masterAccountData.id,
      accountType: 'master',
      plaidType: masterAccountData.type || undefined,
      plaidSubtype: masterAccountData.subtype || undefined,
      name: masterAccountData.nickname || masterAccountData.name,
      mask: masterAccountData.mask || undefined,
      balance: masterAccountData.currentBalance || 0,
    });

    const externalAccounts: Account[] = allAccountsData
      .filter(a => a.id !== masterAccountData.id)
      .map(a => createAccount({
        accountId: a.id,
        accountType: 'external',
        plaidType: a.type || undefined,
        plaidSubtype: a.subtype || undefined,
        name: a.nickname || a.name,
        mask: a.mask || undefined,
        balance: a.currentBalance || 0,
      }));

    // Create Bucket objects
    const buckets: Bucket[] = bucketsData.map(b => createBucket({
      bucketId: b.id,
      name: b.name,
      allocationType: b.allocationType as AllocationTypeValue,
      masterAccountId: masterAccount.accountId,
      value: b.allocationValue,
      priority: b.priority,
      targetExternalAccountId: b.targetAccountId || undefined,
      emoji: b.emoji || undefined,
      description: b.description || undefined,
      color: b.color || undefined,
    }));

    // Create FinancialManager and run allocation
    const manager = new FinancialManager(masterAccount);

    // Add external accounts
    for (const extAccount of externalAccounts) {
      manager.addExternalAccount(extAccount);
    }

    // Add buckets
    for (const bucket of buckets) {
      manager.addBucket(bucket);
    }

    // Process allocation
    const income = new Decimal(String(incomeAmount));
    const result = manager.processIncomeAllocation(income);

    // Save allocation history if requested
    if (saveHistory) {
      await prisma.allocation.create({
        data: {
          userId,
          incomeAmount: Number(incomeAmount),
          allocationResults: JSON.stringify(result),
          executed: false,
        },
      });
    }

    console.log('--- [API /allocate] Allocation complete ---');

    // Add bucket details to result for frontend
    const bucketDetails = manager.getBucketStates().map(b => {
      const bucketData = bucketsData.find(bd => bd.id === b.bucketId);
      const targetAccount = externalAccounts.find(a => a.accountId === b.targetExternalAccountId);
      return {
        ...b,
        emoji: bucketData?.emoji,
        color: bucketData?.color,
        targetAccountName: targetAccount?.name,
      };
    });

    return NextResponse.json({
      ...result,
      bucketDetails,
      masterAccountName: masterAccount.name,
    });
  } catch (error) {
    console.error('[API /allocate] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Allocation failed', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/allocate/history - Get allocation history
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'demo-user';
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const allocations = await prisma.allocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      allocations: allocations.map(a => ({
        id: a.id,
        incomeAmount: a.incomeAmount,
        results: JSON.parse(a.allocationResults),
        executed: a.executed,
        executedAt: a.executedAt,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error('[API GET /allocate/history] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allocation history' },
      { status: 500 }
    );
  }
}
