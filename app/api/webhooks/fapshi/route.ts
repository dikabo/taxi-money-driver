import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import Transaction from '@/lib/db/models/Transaction';

/**
 * File: /app/api/webhooks/fapshi/route.ts
 * Purpose: This is the REAL Webhook API that Fapshi calls.
 * This is what subtracts money from the driver's wallet.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // 1. Get data from Fapshi's webhook payload
    // TODO: You MUST check the Fapshi docs for the real payload structure
    const status = body.status; // e.g., "SUCCESS" or "FAILED"
    const fapshiTransactionId = body.transaction_id;
    const ourExternalId = body.external_id; // This is our Transaction._id

    if (!ourExternalId || !status) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // 2. Find our PENDING transaction
    await dbConnect();
    const transaction = await Transaction.findById(ourExternalId);

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    if (transaction.status !== 'Pending') {
      return NextResponse.json({ message: 'Webhook already processed' }, { status: 200 });
    }

    // 3. Handle the status
    if (status === 'SUCCESS') {
      // 4. PAYMENT IS GOOD! Subtract money from the wallet.
      // We use $inc with the negative amount (e.g., $inc: -150)
      const driver = await Driver.findOneAndUpdate(
        { _id: transaction.userId },
        { $inc: { availableBalance: transaction.amount } },
        { new: true }
      );
      
      if (!driver) {
        throw new Error('Driver not found during webhook processing');
      }
      
      // 5. Update our transaction
      transaction.status = 'Success';
      transaction.fapshiTransactionId = fapshiTransactionId;
      await transaction.save();
      
      console.log(`[WEBHOOK] SUCCESS: Withdrew ${transaction.amount} for ${driver.firstName}`);

    } else {
      // 6. PAYMENT FAILED (status === 'FAILED')
      transaction.status = 'Failed';
      await transaction.save();
      console.log(`[WEBHOOK] FAILED: Withdrawal for ${transaction.userId} failed.`);
    }

    // 7. Tell Fapshi "OK"
    return NextResponse.json({ message: 'Webhook received' }, { status: 200 });

  } catch (error) {
    console.error('Fapshi Webhook Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}