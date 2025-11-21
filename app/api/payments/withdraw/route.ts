import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { withdrawSchema } from '@/lib/validations/auth-cameroon';
import { createCookieServerClient } from '@/lib/auth/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import Transaction, { ITransaction } from '@/lib/db/models/Transaction';

/**
 * File: /app/api/payments/withdraw/route.ts
 * Purpose: Driver cashout - withdrawal via Fapshi disbursement API
 * 
 * Flow:
 * 1. Authenticate driver via Supabase
 * 2. Validate withdrawal request data
 * 3. Check driver exists and has sufficient balance
 * 4. Create PENDING transaction in MongoDB
 * 5. Call Fapshi disbursement API (not direct-pay)
 * 6. Update transaction with Fapshi ID on success
 * 7. Deduct from available balance
 * 8. Return response to client
 * 
 * FIXES MADE:
 * - Correct file paths (@/lib/auth vs @/lib/db)
 * - Fixed phone prefix stripping for Fapshi
 * - Use disbursement API (not direct-pay)
 * - Proper error handling with balance validation
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Authentication
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 2. Validate Body
    const body = await req.json();
    const validation = withdrawSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { amount, method, withdrawalPhoneNumber } = validation.data;
    const amountAsNumber = Number(amount);

    // Strip +237 prefix for Fapshi API
    const phoneWithoutPrefix = withdrawalPhoneNumber!.replace(/^\+237/, '');

    // Map method to Fapshi format
    const mediumMap: { [key: string]: string } = {
      'MTN': 'mobile money',
      'Orange': 'orange money',
    };
    const paymentMedium = mediumMap[method];

    // 3. Get Driver from DB
    await dbConnect();
    const driver = await Driver.findOne({ authId: session.user.id });

    if (!driver) {
      return NextResponse.json({ error: 'Chauffeur non trouvé' }, { status: 404 });
    }

    // Check sufficient balance
    if (driver.availableBalance < amountAsNumber) {
      return NextResponse.json(
        { 
          error: 'Solde insuffisant',
          currentBalance: driver.availableBalance,
          required: amountAsNumber,
        },
        { status: 400 }
      );
    }

    // Explicitly cast driver._id to string
    const driverId = driver._id?.toString();
    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID invalid' }, { status: 400 });
    }

    // 4. Create PENDING Transaction
    const externalId = `withdraw-${Date.now()}-${driverId}`;

    const transaction = (await Transaction.create({
      userId: driver._id,
      userType: 'Driver',
      type: 'Withdrawal',
      status: 'Pending',
      amount: -amountAsNumber, // Store as negative
      method: method,
      phoneNumber: withdrawalPhoneNumber,
      externalId: externalId,
    })) as ITransaction;

    const transactionId = transaction._id?.toString() || '';

    console.log(`[WITHDRAW API] Created PENDING transaction: ${transactionId}`);
    console.log(`[WITHDRAW API] ExternalId: ${externalId}`);
    console.log(`[WITHDRAW API] Amount: ${amountAsNumber} Units`);
    console.log(`[WITHDRAW API] Phone: ${phoneWithoutPrefix}`);
    console.log(`[WITHDRAW API] Medium: ${paymentMedium}`);

    // 5. Call Fapshi Disbursement API
    console.log('[WITHDRAW API] Calling Fapshi disbursement API...');

    const fapshiApiKey = process.env.FAPSHI_API_KEY;
    const fapshiApiUser = process.env.FAPSHI_API_USER;

    if (!fapshiApiKey || !fapshiApiUser) {
      throw new Error('FAPSHI_API_KEY and FAPSHI_API_USER must be configured');
    }

    // Auto-detect environment
    const isSandbox = fapshiApiKey.includes('test') || fapshiApiKey.includes('TEST');
    const fapshiBaseUrl = isSandbox 
      ? 'https://sandbox.fapshi.com'
      : 'https://live.fapshi.com';

    const fapshiEndpoint = `${fapshiBaseUrl}/transfer`; // Disbursement endpoint

    try {
      const fapshiResponse = await fetch(fapshiEndpoint, {
        method: 'POST',
        headers: {
          'apikey': fapshiApiKey,
          'apiuser': fapshiApiUser,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountAsNumber,
          phone: phoneWithoutPrefix,
          medium: paymentMedium,
          externalId: externalId,
          userId: driverId,
          message: 'Driver withdrawal/cashout',
        }),
      });

      const responseText = await fapshiResponse.text();
      console.log('[WITHDRAW API] Fapshi response status:', fapshiResponse.status);

      let fapshiResult;
      try {
        fapshiResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[WITHDRAW API] Failed to parse Fapshi response');
        await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
        throw new Error(`Invalid response from Fapshi: ${responseText.substring(0, 100)}`);
      }

      if (!fapshiResponse.ok) {
        console.error('[WITHDRAW API] Fapshi error:', fapshiResult);
        await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
        throw new Error(fapshiResult.message || `Fapshi API error: ${fapshiResponse.status}`);
      }

      // 6. Update transaction with Fapshi ID
      const fapshiTransactionId = fapshiResult.transId;

      await Transaction.findByIdAndUpdate(transactionId, {
        fapshiTransactionId: fapshiTransactionId,
      });

      console.log(`[WITHDRAW API] ✅ Fapshi accepted transfer: ${fapshiTransactionId}`);

      // 7. Deduct from available balance (will be finalized when webhook succeeds)
      const updatedDriver = await Driver.findByIdAndUpdate(
        driver._id,
        { $inc: { availableBalance: -amountAsNumber } },
        { new: true }
      );

      console.log(`[WITHDRAW API] Driver balance updated. New balance: ${updatedDriver?.availableBalance}`);

      // 8. Return Success Response
      return NextResponse.json(
        {
          success: true,
          message: 'Demande de retrait initiée. Traitement en cours...',
          transId: fapshiTransactionId,
          transactionId: transactionId,
          newBalance: updatedDriver?.availableBalance,
        },
        { status: 200 }
      );

    } catch (fapshiError) {
      console.error('[WITHDRAW API] Fapshi error:', fapshiError);
      
      // Restore balance if Fapshi call failed
      await Driver.findByIdAndUpdate(driver._id, {
        $inc: { availableBalance: amountAsNumber },
      });
      
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      throw fapshiError;
    }

  } catch (error) {
    console.error('[WITHDRAW API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation invalide', details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}