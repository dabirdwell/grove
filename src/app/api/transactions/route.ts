import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'demo-user';
    const type = searchParams.get('type');
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    console.log('\n--- [API /transactions] Fetching transaction history ---');

    // Build where clause
    const whereClause: {
      userId: string;
      type?: string;
      accountId?: string;
    } = { userId };

    if (type) {
      whereClause.type = type;
    }

    if (accountId) {
      whereClause.accountId = accountId;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    console.log(`  Found ${transactions.length} transactions (total: ${total})`);
    console.log('--- [API /transactions] Complete ---');

    return NextResponse.json({
      transactions: transactions.map(t => ({
        ...t,
        metadata: JSON.parse(t.metadata),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + transactions.length < total,
      },
    });
  } catch (error) {
    console.error('[API /transactions] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch transactions', details: errorMessage },
      { status: 500 }
    );
  }
}
