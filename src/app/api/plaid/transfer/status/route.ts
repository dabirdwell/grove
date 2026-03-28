import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, plaidConfig } from '@/lib/plaid';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  if (!plaidConfig.isConfigured) {
    return NextResponse.json(
      { error: 'Plaid is not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const transferId = searchParams.get('transferId');
  const transactionId = searchParams.get('transactionId');

  if (!transferId && !transactionId) {
    return NextResponse.json(
      { error: 'Missing transferId or transactionId' },
      { status: 400 }
    );
  }

  try {
    console.log('\n--- [API /plaid/transfer/status] Checking transfer status ---');

    // If we have a transactionId, look up the Plaid transfer ID
    let plaidTransferId = transferId;
    let transaction = null;

    if (transactionId) {
      transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        return NextResponse.json(
          { error: 'Transaction not found' },
          { status: 404 }
        );
      }

      plaidTransferId = transaction.plaidTransferId;
    }

    if (!plaidTransferId) {
      return NextResponse.json(
        { error: 'No Plaid transfer ID associated with this transaction' },
        { status: 400 }
      );
    }

    // Get transfer status from Plaid
    const response = await plaidClient.transferGet({
      transfer_id: plaidTransferId,
    });

    const { transfer } = response.data;

    // Update our transaction record if status changed
    if (transaction) {
      let newStatus = transaction.status;

      switch (transfer.status) {
        case 'posted':
        case 'settled':
          newStatus = 'completed';
          break;
        case 'failed':
        case 'returned':
          newStatus = 'failed';
          break;
        case 'cancelled':
          newStatus = 'failed';
          break;
        default:
          newStatus = 'pending';
      }

      if (newStatus !== transaction.status) {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: newStatus,
            type: newStatus === 'completed' ? 'TRANSFER_COMPLETED' :
                  newStatus === 'failed' ? 'TRANSFER_FAILED' : transaction.type,
            errorMessage: transfer.failure_reason?.description || undefined,
            metadata: JSON.stringify({
              ...JSON.parse(transaction.metadata),
              plaidStatus: transfer.status,
              updatedAt: new Date().toISOString(),
            }),
          },
        });

        console.log(`  Updated transaction status: ${transaction.status} -> ${newStatus}`);
      }
    }

    console.log(`  Transfer ${plaidTransferId}: ${transfer.status}`);
    console.log('--- [API /plaid/transfer/status] Status check complete ---');

    return NextResponse.json({
      transferId: transfer.id,
      status: transfer.status,
      amount: transfer.amount,
      created: transfer.created,
      failureReason: transfer.failure_reason?.description,
    });
  } catch (error) {
    console.error('[API /plaid/transfer/status] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to check transfer status', details: errorMessage },
      { status: 500 }
    );
  }
}
