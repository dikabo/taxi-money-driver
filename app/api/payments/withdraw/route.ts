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
 * * FIXES APPLIED:
 * 1. CRITICAL AUTH FIX: Use dedicated Payout/Disbursement API keys if available. 
 * Using the wrong keys (e.g., Direct-Pay keys for Payout) is the most common 
 * cause of the DOCTYPE HTML error.
 * 2. FLOW CONSISTENCY: externalId is now generated upfront, similar to the 
 * successful passenger flow.
 * 3. LEDGER SAFETY: Confirmed immediate balance debit is REMOVED (only happens on webhook success).
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

    // 4. Create PENDING Transaction (Generate externalId first for consistency)
    const externalId = `withdrawal-${Date.now()}-${driverId}`;

    const transaction = (await Transaction.create({
      userId: driver._id,
      userType: 'Driver',
      type: 'Withdrawal',
      status: 'Pending',
      amount: amountAsNumber, // Store as POSITIVE. Direction is determined by 'type'.
      method: method,
      phoneNumber: withdrawalPhoneNumber,
      externalId: externalId, // Now set on creation
    })) as ITransaction;

    const transactionId = transaction._id?.toString() || '';

    console.log(`[WITHDRAW API] Created PENDING transaction: ${transactionId}`);
    console.log(`[WITHDRAW API] ExternalId: ${externalId}`);
    console.log(`[WITHDRAW API] Amount: ${amountAsNumber} Units`);
    console.log(`[WITHDRAW API] Phone: ${phoneWithoutPrefix}`);
    console.log(`[WITHDRAW API] Medium: ${paymentMedium}`);

    // 5. Call Fapshi Disbursement API
    console.log('[WITHDRAW API] Calling Fapshi disbursement API...');
    
    // CRITICAL FIX: Use dedicated Payout keys if they exist
    const fapshiPayoutApiKey = process.env.FAPSHI_PAYOUT_API_KEY || process.env.FAPSHI_API_KEY;
    const fapshiPayoutApiUser = process.env.FAPSHI_PAYOUT_API_USER || process.env.FAPSHI_API_USER;
    
    // Check for credentials
    if (!fapshiPayoutApiKey || !fapshiPayoutApiUser) {
      return NextResponse.json(
        { error: 'Fapshi Payout credentials not configured. Please set FAPSHI_PAYOUT_API_KEY and FAPSHI_PAYOUT_API_USER.' },
        { status: 500 }
      );
    }

    // Auto-detect environment based on the key being used
    const isSandbox = fapshiPayoutApiKey.includes('test') || fapshiPayoutApiKey.includes('TEST');
    const fapshiBaseUrl = isSandbox 
      ? 'https://sandbox.fapshi.com'
      : 'https://live.fapshi.com';

    const fapshiEndpoint = `${fapshiBaseUrl}/payout`; // Confirmed Disbursement endpoint

    try {
      const fapshiResponse = await fetch(fapshiEndpoint, {
        method: 'POST',
        headers: {
          'apikey': fapshiPayoutApiKey, // Using Payout Key
          'apiuser': fapshiPayoutApiUser, // Using Payout User
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountAsNumber,
          phone: phoneWithoutPrefix,
          medium: paymentMedium,
          externalId: externalId, // Our unique ID for Fapshi
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
        console.error('[WITHDRAW API] ❌ Failed to parse Fapshi response. Received HTML/Text:', responseText.substring(0, 100));
        await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
        
        throw new Error(`Invalid response from Fapshi: ${responseText.substring(0, 100)}`);
      }

      if (!fapshiResponse.ok) {
        console.error('[WITHDRAW API] ❌ Fapshi rejected transfer:', fapshiResult);
        await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
        
        throw new Error(fapshiResult.message || `Fapshi API error: ${fapshiResponse.status}`);
      }

      // 6. Update transaction with Fapshi ID (Transaction status remains 'Pending')
      const fapshiTransactionId = fapshiResult.transId;

      await Transaction.findByIdAndUpdate(transactionId, {
        fapshiTransactionId: fapshiTransactionId,
      });

      console.log(`[WITHDRAW API] ✅ Fapshi accepted transfer: ${fapshiTransactionId}. Awaiting webhook confirmation.`);

      // 7. Balance deduction is handled by the webhook (app/api/webhooks/fapshi/route.ts) on Success.
      
      // 8. Return Success Response
      return NextResponse.json(
        {
          success: true,
          message: 'Demande de retrait initiée. Traitement en cours et en attente de la confirmation de Fapshi.',
          transId: fapshiTransactionId,
          transactionId: transactionId,
          currentBalance: driver.availableBalance, // Show the balance before withdrawal starts processing
        },
        { status: 200 }
      );

    } catch (fapshiError) {
      console.error('[WITHDRAW API] Fapshi transfer attempt failed:', fapshiError);
      
      // Mark transaction as failed
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      
      // Re-throw to be caught by the outer catch block
      throw fapshiError;
    }

  } catch (error) {
    console.error('[WITHDRAW API] Global Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation invalide', details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
    const isHtmlError = errorMessage.includes('Invalid response from Fapshi');
    
    return NextResponse.json(
      { 
        error: isHtmlError ? "Erreur de connexion Fapshi. Veuillez vérifier les clés API et l'URL de Payout." : errorMessage 
      },
      { status: 500 }
    );
  }
}