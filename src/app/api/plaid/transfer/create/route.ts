import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, plaidConfig } from '@/lib/plaid';
import prisma from '@/lib/db';
import { TransferType, TransferNetwork, ACHClass } from 'plaid';

export async function POST(request: NextRequest) {
  if (!plaidConfig.isConfigured) {
    return NextResponse.json(
      { error: 'Plaid is not configured' },
      { status: 500 }
    );
  }

  try {
    const {
      userId,
      sourceAccountId,
      destinationAccountId,
      amount,
      description,
      bucketId,
    } = await request.json();

    if (!userId || !sourceAccountId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, sourceAccountId, amount' },
        { status: 400 }
      );
    }

    console.log('\n--- [API /plaid/transfer/create] Initiating transfer ---');

    // Get source account with Plaid details
    const sourceAccount = await prisma.account.findUnique({
      where: { id: sourceAccountId },
      include: { plaidItem: true },
    });

    if (!sourceAccount || !sourceAccount.plaidItem || !sourceAccount.plaidAccountId) {
      return NextResponse.json(
        { error: 'Source account not found or not linked to Plaid' },
        { status: 404 }
      );
    }

    // Get destination account if provided (for internal transfers)
    let destinationAccount = null;
    if (destinationAccountId) {
      destinationAccount = await prisma.account.findUnique({
        where: { id: destinationAccountId },
        include: { plaidItem: true },
      });
    }

    // Log the transfer initiation
    const transactionLog = await prisma.transaction.create({
      data: {
        userId,
        accountId: sourceAccountId,
        bucketId,
        type: 'TRANSFER_INITIATED',
        amount: parseFloat(amount),
        status: 'pending',
        sourceAccountId,
        destinationAccountId,
        description: description || `Transfer of $${amount}`,
        metadata: JSON.stringify({
          initiatedAt: new Date().toISOString(),
        }),
      },
    });

    try {
      // Create transfer authorization first
      const authResponse = await plaidClient.transferAuthorizationCreate({
        access_token: sourceAccount.plaidItem.accessToken,
        account_id: sourceAccount.plaidAccountId,
        type: TransferType.Debit,
        network: TransferNetwork.Ach,
        amount: amount.toString(),
        ach_class: ACHClass.Ppd,
        user: {
          legal_name: 'Flow User', // In production, get from user profile
        },
      });

      const { authorization } = authResponse.data;

      if (authorization.decision !== 'approved') {
        // Update transaction as failed
        await prisma.transaction.update({
          where: { id: transactionLog.id },
          data: {
            status: 'failed',
            errorMessage: authorization.decision_rationale?.description || 'Authorization declined',
          },
        });

        return NextResponse.json(
          {
            error: 'Transfer not authorized',
            reason: authorization.decision_rationale?.description,
          },
          { status: 400 }
        );
      }

      // Create the transfer
      const transferResponse = await plaidClient.transferCreate({
        access_token: sourceAccount.plaidItem.accessToken,
        account_id: sourceAccount.plaidAccountId,
        authorization_id: authorization.id,
        description: description || 'Flow allocation transfer',
      });

      const { transfer } = transferResponse.data;

      // Update transaction with Plaid transfer ID
      await prisma.transaction.update({
        where: { id: transactionLog.id },
        data: {
          plaidTransferId: transfer.id,
          status: 'pending', // Will be updated via webhook or polling
          metadata: JSON.stringify({
            initiatedAt: new Date().toISOString(),
            plaidStatus: transfer.status,
            authorizationId: authorization.id,
          }),
        },
      });

      console.log(`  Transfer created: ${transfer.id}`);
      console.log(`  Status: ${transfer.status}`);
      console.log('--- [API /plaid/transfer/create] Transfer initiated ---');

      return NextResponse.json({
        success: true,
        transferId: transfer.id,
        transactionId: transactionLog.id,
        status: transfer.status,
        message: `Transfer of $${amount} initiated successfully`,
      });
    } catch (plaidError) {
      // Update transaction as failed
      const errorMsg = plaidError instanceof Error ? plaidError.message : 'Plaid API error';

      await prisma.transaction.update({
        where: { id: transactionLog.id },
        data: {
          status: 'failed',
          errorMessage: errorMsg,
        },
      });

      throw plaidError;
    }
  } catch (error) {
    console.error('[API /plaid/transfer/create] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create transfer', details: errorMessage },
      { status: 500 }
    );
  }
}
