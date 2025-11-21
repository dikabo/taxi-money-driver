import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import Transaction from '@/lib/db/models/Transaction';

/**
 * File: /app/api/webhooks/fapshi/route.ts (Driver App)
 * Purpose: Webhook API that Fapshi calls to notify transaction status for withdrawals (cashouts).
 * This is what subtracts money from the driver's wallet upon SUCCESS.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('='.repeat(80));
    console.log('[DRIVER WEBHOOK] 📥 FAPSHI CASH-OUT WEBHOOK RECEIVED');
    console.log('[DRIVER WEBHOOK] Full payload:', JSON.stringify(body, null, 2));
    console.log('='.repeat(80));

    // 1. Get data from Fapshi's webhook payload - Use flexible extraction like the Passenger app
    const fapshiTransactionId = body.transId || body.transactionId || body.trans_id || body.id || body.transaction_id;
    const ourExternalId = body.externalId || body.external_id || body.reference; // This is our Transaction._id
    const rawStatus = body.status || body.transaction_status || body.state;
    const normalizedStatus = rawStatus ? String(rawStatus).toLowerCase() : '';

    console.log('[DRIVER WEBHOOK] 🔍 Extracted fields:');
    console.log('[DRIVER WEBHOOK]  - fapshiTransactionId:', fapshiTransactionId);
    console.log('[DRIVER WEBHOOK]  - ourExternalId:', ourExternalId);
    console.log('[DRIVER WEBHOOK]  - normalizedStatus:', normalizedStatus);

    if (!ourExternalId || !normalizedStatus) {
      console.error('[DRIVER WEBHOOK] ❌ ERROR: Missing externalId or status in payload.');
      return NextResponse.json({ error: 'Invalid webhook payload: Missing ID or Status' }, { status: 400 });
    }

    // 2. Find our PENDING transaction
    await dbConnect();
    // We use findOne since externalId is indexed and unique
    const transaction = await Transaction.findOne({ externalId: ourExternalId });

    if (!transaction) {
      console.error(`[DRIVER WEBHOOK] ❌ Transaction not found with externalId: ${ourExternalId}`);
      // Return 200 to stop retries for an unknown transaction
      return NextResponse.json({ error: 'Transaction not found' }, { status: 200 });
    }
    
    if (transaction.status !== 'Pending') {
      console.log('[DRIVER WEBHOOK] ⚠️ DUPLICATE: Webhook already processed');
      return NextResponse.json({ message: 'Webhook already processed' }, { status: 200 });
    }

    const isSuccess = ['successful', 'success', 'completed', 'approved', 'paid'].includes(normalizedStatus);
    const isFailed = ['failed', 'failure', 'declined', 'rejected', 'cancelled', 'canceled'].includes(normalizedStatus);


    // 3. Handle the status
    if (isSuccess) {
      // 4. CASH-OUT IS SUCCESSFUL! Subtract money from the wallet.
      // 
      // CRITICAL LOGIC: Fapshi has confirmed the driver received the payment externally (Mobile Money). 
      // We must now DEBIT (subtract) the equivalent amount from the driver's internal app wallet (availableBalance)
      // to finalize the transaction and keep the ledger balanced.
      const driver = await Driver.findOneAndUpdate(
        { _id: transaction.userId },
        { $inc: { availableBalance: -transaction.amount } }, // <<-- THE CRITICAL FIX: NEGATE THE AMOUNT (DEBIT)
        { new: true }
      );
      
      if (!driver) {
        console.error('[DRIVER WEBHOOK] ❌ Driver not found during wallet update');
        throw new Error('Driver not found during webhook processing');
      }
      
      // 5. Update our transaction
      transaction.status = 'Success';
      transaction.fapshiTransactionId = fapshiTransactionId;
      await transaction.save();
      
      console.log(`[DRIVER WEBHOOK] ✅ SUCCESS: Withdrew ${transaction.amount} for ${driver.firstName}. New Balance: ${driver.availableBalance}`);

    } else if (isFailed) {
      // 6. CASH-OUT FAILED (status is failure-related)
      // Since we assume the wallet was only debited on success (in step 4), 
      // we only need to update the transaction status here. No refund is necessary.
      
      transaction.status = 'Failed';
      transaction.fapshiTransactionId = fapshiTransactionId;
      await transaction.save();
      console.log(`[DRIVER WEBHOOK] ❌ FAILED: Withdrawal for ${transaction.userId} failed. Transaction marked as Failed.`);
    } else {
        // Unknown or Pending status - do nothing but log
        console.warn(`[DRIVER WEBHOOK] ⚠️ UNKNOWN STATUS received: ${rawStatus}. Transaction remains Pending.`);
    }

    // 7. Tell Fapshi "OK"
    return NextResponse.json({ message: 'Webhook received and processed' }, { status: 200 });

  } catch (error) {
    console.error('='.repeat(80));
    console.error('[DRIVER WEBHOOK] ❌ CRITICAL ERROR:', error);
    console.error('='.repeat(80));
    return NextResponse.json(
      { error: 'An unexpected error occurred.', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}