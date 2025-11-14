import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { withdrawSchema } from '@/lib/validations/auth-cameroon';
import { createCookieServerClient } from '@/lib/auth/supabase-server';

/**
 * File: /app/api/payments/withdraw/route.ts
 * Purpose: API endpoint to process a withdrawal request.
 *
 * FIX: The schema now passes a string for 'amount'.
 * We will parse it to a number here.
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies(); 

  try {
    // 1. Authentication
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session }, } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // 2. Validate Body
    const body = await req.json();
    const validation = withdrawSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    // THIS IS THE FIX
    const { amount, method, withdrawalPhoneNumber } = validation.data;
    const amountAsNumber = Number(amount); // Convert string to number

    // 3. MOCK FAPSHI API CALL
    console.log(`[MOCK API] Processing withdrawal for ${session.user.id}`);
    console.log(`[MOCK API] Amount: ${amountAsNumber} XAF`);
    console.log(`[MOCK API] Method: ${method}`);
    console.log(`[MOCK API] Phone to send to: ${withdrawalPhoneNumber}`);

    await new Promise(resolve => setTimeout(resolve, 1500));

    // 4. Return Success
    return NextResponse.json(
      {
        success: true,
        message: 'Withdrawal request processed successfully.',
        transactionId: `MOCK_TX_${Date.now()}`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Withdrawal API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid validation', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}