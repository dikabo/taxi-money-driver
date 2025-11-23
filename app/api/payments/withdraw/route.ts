import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/auth/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import Transaction, { ITransaction } from '@/lib/db/models/Transaction';

/**
 * File: /app/api/payments/withdraw/route.ts (Driver App)
 * Purpose: Driver withdrawal via Fapshi LIVE payout API
 * 
 * CORRECTED FOR YOUR USE CASE:
 * - Using LIVE Fapshi (not sandbox)
 * - /payout endpoint for disbursement
 * - Balance deducted ONLY after webhook confirms success
 * - No +237 prefix (Cameroon numbers are 9 digits: 6XXXXXXXX)
 * 
 * Flow:
 * 1. Create PENDING transaction
 * 2. Call Fapshi /payout (live)
 * 3. Wait for webhook
 * 4. Webhook confirms → deduct balance
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Authenticate
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 2. Validate body
    const body = await req.json();
    const { amount, method, withdrawalPhoneNumber } = body;

    if (!amount || !method || !withdrawalPhoneNumber) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    const withdrawAmount = Number(amount);

    if (isNaN(withdrawAmount) || withdrawAmount < 100) {
      return NextResponse.json(
        { error: 'Montant invalide. Minimum: 100 Units' },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await dbConnect();

    // 4. Get driver
    const driver = await Driver.findOne({ authId: session.user.id });

    if (!driver) {
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // 5. Check balance
    if (driver.availableBalance < withdrawAmount) {
      return NextResponse.json(
        { error: `Solde insuffisant. Disponible: ${driver.availableBalance} Units` },
        { status: 400 }
      );
    }

    const driverId = driver._id?.toString();
    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID invalid' }, { status: 400 });
    }

    // 6. Create PENDING transaction (don't deduct balance yet!)
    const externalId = `withdraw-${Date.now()}-${driverId}`;

    const transaction = (await Transaction.create({
      userId: driver._id,
      userType: 'Driver',
      type: 'Withdrawal',
      status: 'Pending', // Will be updated by webhook
      amount: withdrawAmount,
      method: method,
      phoneNumber: withdrawalPhoneNumber,
      externalId: externalId,
      notes: `Retrait vers ${method} - ${withdrawalPhoneNumber}`,
    })) as ITransaction;

    const transactionId = transaction._id?.toString() || '';

    console.log('='.repeat(80));
    console.log('[WITHDRAWAL] 💰 Driver withdrawal initiated');
    console.log(`[WITHDRAWAL] Driver: ${driver.firstName} ${driver.lastName}`);
    console.log(`[WITHDRAWAL] Amount: ${withdrawAmount} XAF`);
    console.log(`[WITHDRAWAL] Method: ${method}`);
    console.log(`[WITHDRAWAL] Phone: ${withdrawalPhoneNumber}`);
    console.log(`[WITHDRAWAL] Current balance: ${driver.availableBalance} XAF`);
    console.log(`[WITHDRAWAL] Transaction ID: ${transactionId}`);
    console.log(`[WITHDRAWAL] External ID: ${externalId}`);
    console.log('='.repeat(80));

    // 7. Get Fapshi credentials
    const fapshiApiKey = process.env.FAPSHI_API_KEY;
    const fapshiApiUser = process.env.FAPSHI_API_USER;

    if (!fapshiApiKey || !fapshiApiUser) {
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      return NextResponse.json(
        { error: 'Configuration Fapshi manquante' },
        { status: 500 }
      );
    }

    // 8. CRITICAL: Use LIVE endpoint (you said you're not using sandbox)
    const fapshiBaseUrl = 'https://live.fapshi.com';
    const fapshiEndpoint = `${fapshiBaseUrl}/payout`;

    // 9. Prepare phone number (Cameroon format: 6XXXXXXXX, no +237)
    const cleanPhone = withdrawalPhoneNumber.replace(/^\+237/, '').trim();

    // 10. Map method to Fapshi medium
    const mediumMap: { [key: string]: string } = {
      'MTN': 'mobile money',
      'Orange': 'orange money',
    };
    const paymentMedium = mediumMap[method];

    if (!paymentMedium) {
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      return NextResponse.json(
        { error: 'Méthode de paiement invalide' },
        { status: 400 }
      );
    }

    // 11. Build payout request payload
    const requestBody = {
      amount: withdrawAmount,
      phone: cleanPhone,
      medium: paymentMedium,
      name: `${driver.firstName} ${driver.lastName}`, // Required for payout
      email: driver.email || undefined, // Optional
      userId: driverId,
      externalId: externalId, // Critical for webhook mapping
      message: `Retrait de ${withdrawAmount} XAF`,
    };

    console.log('[WITHDRAWAL] 📤 Calling Fapshi LIVE payout API');
    console.log('[WITHDRAWAL] Endpoint:', fapshiEndpoint);
    console.log('[WITHDRAWAL] Request:', JSON.stringify(requestBody, null, 2));

    // 12. Call Fapshi payout API
    const fapshiResponse = await fetch(fapshiEndpoint, {
      method: 'POST',
      headers: {
        'apikey': fapshiApiKey,
        'apiuser': fapshiApiUser,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await fapshiResponse.text();
    console.log('[WITHDRAWAL] 📥 Fapshi response status:', fapshiResponse.status);
    console.log('[WITHDRAWAL] 📥 Fapshi raw response:', responseText);

    // 13. Parse response
    let fapshiResult;
    try {
      fapshiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[WITHDRAWAL] ❌ Failed to parse response');
      console.error('[WITHDRAWAL] Response was:', responseText.substring(0, 500));
      
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      
      return NextResponse.json(
        { 
          error: 'Réponse invalide de Fapshi',
          details: 'La réponse n\'est pas au format JSON',
          raw: responseText.substring(0, 200),
        },
        { status: 500 }
      );
    }

    // 14. Handle errors
    if (!fapshiResponse.ok) {
      console.error('[WITHDRAWAL] ❌ Fapshi error');
      console.error('[WITHDRAWAL] Error details:', JSON.stringify(fapshiResult, null, 2));
      
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      
      return NextResponse.json(
        { 
          error: fapshiResult.message || 'Échec du retrait',
          details: fapshiResult,
          httpStatus: fapshiResponse.status,
        },
        { status: 400 }
      );
    }

    // 15. Success - extract transaction ID
    const fapshiTransactionId = fapshiResult.transId || fapshiResult.transactionId || fapshiResult.id;

    if (!fapshiTransactionId) {
      console.warn('[WITHDRAWAL] ⚠️ No transId in response:', fapshiResult);
    }

    // Update transaction with Fapshi ID
    await Transaction.findByIdAndUpdate(transactionId, {
      fapshiTransactionId: fapshiTransactionId,
    });

    console.log('[WITHDRAWAL] ✅ Payout initiated successfully');
    console.log('[WITHDRAWAL] Fapshi Transaction ID:', fapshiTransactionId);
    console.log('[WITHDRAWAL] Status: Pending (waiting for webhook confirmation)');
    console.log('[WITHDRAWAL] NOTE: Balance will be deducted ONLY after webhook confirms success');
    console.log('='.repeat(80));

    // 16. Return success
    // IMPORTANT: Balance is NOT deducted yet - webhook will do that
    return NextResponse.json(
      {
        success: true,
        message: 'Retrait en cours de traitement. Vous recevrez une confirmation sous peu.',
        transId: fapshiTransactionId,
        transactionId: transactionId,
        currentBalance: driver.availableBalance, // Unchanged until webhook
        status: 'pending',
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('='.repeat(80));
    console.error('[WITHDRAWAL] ❌ CRITICAL ERROR');
    console.error('[WITHDRAWAL] Error:', error);
    console.error('[WITHDRAWAL] Stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('='.repeat(80));
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Une erreur est survenue lors du retrait',
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}