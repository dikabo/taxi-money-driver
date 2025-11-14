import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { requestPaymentSchema } from '@/lib/validations/auth-cameroon';
import { createCookieServerClient } from '@/lib/auth/supabase-server';

/**
 * File: /app/api/payments/request/route.ts
 * Purpose: API endpoint to request a payment from a passenger.
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
    const validation = requestPaymentSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    // THIS IS THE FIX
    const { amount, passengerId } = validation.data;
    const amountAsNumber = Number(amount); // Convert string to number
    const driverId = session.user.id;

    // 3. MOCK PAYMENT REQUEST LOGIC
    console.log(`[MOCK API] Payment Request from Driver: ${driverId}`);
    console.log(`[MOCK API] To Passenger: ${passengerId}`);
    console.log(`[MOCK API] Amount: ${amountAsNumber} XAF`);

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Return Success
    return NextResponse.json(
      {
        success: true,
        message: 'Payment request sent successfully.',
        requestId: `MOCK_REQ_${Date.now()}`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Request Payment API Error:', error);
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