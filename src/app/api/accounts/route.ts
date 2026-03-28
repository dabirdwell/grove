import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import type { SafeAccount } from '@/types';

// GET /api/accounts - List all accounts for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'demo-user';

    const accounts = await prisma.account.findMany({
      where: { userId },
      include: {
        plaidItem: {
          select: {
            institutionName: true,
            institutionLogoUrl: true,
          },
        },
      },
      orderBy: [
        { isMaster: 'desc' },
        { name: 'asc' },
      ],
    });

    const safeAccounts: SafeAccount[] = accounts.map(a => ({
      accountId: a.id,
      name: a.name,
      nickname: a.nickname || undefined,
      mask: a.mask || undefined,
      plaidType: a.type || undefined,
      plaidSubtype: a.subtype || undefined,
      balance: a.currentBalance || undefined,
      color: a.color || undefined,
      institutionName: a.plaidItem?.institutionName || undefined,
      isMaster: a.isMaster,
    }));

    return NextResponse.json({ accounts: safeAccounts });
  } catch (error) {
    console.error('[API GET /accounts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/accounts/set-master - Set the master account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, userId = 'demo-user' } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      );
    }

    // Verify account exists and belongs to user
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Clear existing master designation
    await prisma.account.updateMany({
      where: { userId, isMaster: true },
      data: { isMaster: false },
    });

    // Set new master account
    await prisma.account.update({
      where: { id: accountId },
      data: { isMaster: true },
    });

    console.log(`[API POST /accounts/set-master] Set master account: ${account.name} (${accountId})`);

    // Get external accounts for response
    const externalAccounts = await prisma.account.findMany({
      where: { userId, id: { not: accountId } },
    });

    return NextResponse.json({
      message: 'Master account set successfully',
      masterAccountId: accountId,
      externalAccounts: externalAccounts.map(a => ({
        accountId: a.id,
        name: a.name,
        nickname: a.nickname,
        mask: a.mask,
        plaidType: a.type,
        plaidSubtype: a.subtype,
        balance: a.currentBalance,
      })),
    });
  } catch (error) {
    console.error('[API POST /accounts/set-master] Error:', error);
    return NextResponse.json(
      { error: 'Failed to set master account' },
      { status: 500 }
    );
  }
}
