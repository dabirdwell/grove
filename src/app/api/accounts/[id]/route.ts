import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// PUT /api/accounts/[id] - Update an account (nickname, color, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nickname, color } = body;

    // Verify account exists
    const existingAccount = await prisma.account.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Update account
    const account = await prisma.account.update({
      where: { id },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(color !== undefined && { color }),
      },
    });

    console.log(`[API PUT /accounts/[id]] Updated account: ${account.name} (${account.id})`);

    return NextResponse.json({
      message: 'Account updated successfully',
      account: {
        accountId: account.id,
        name: account.name,
        nickname: account.nickname,
        mask: account.mask,
        plaidType: account.type,
        plaidSubtype: account.subtype,
        balance: account.currentBalance,
        color: account.color,
        isMaster: account.isMaster,
      },
    });
  } catch (error) {
    console.error('[API PUT /accounts/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}
