import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies HERE
import { z } from 'zod';
import { driverOtpSchema as otpSchema } from '@/lib/validations/auth-cameroon';
import { createCookieServerClient } from '@/lib/auth/supabase-server'; 

/**
 * File: /app/api/auth/verify-otp/route.ts
 * Purpose: API endpoint to verify a driver's phone OTP.
 */

export async function POST(req: NextRequest) {
  const cookieStore = cookies(); // Call cookies() ONCE at the top

  try {
    // 1. Initialize Supabase Client (for user sessions)
    // Pass cookieStore in
    const supabase = createCookieServerClient(await cookieStore); 
    if (!supabase) {
      return NextResponse.json(
        { error: 'Could not create Supabase client' },
        { status: 500 }
      );
    }

    // 2. Parse and Validate Body
    const body = await req.json();
    const validation = otpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { phoneNumber, token } = validation.data;

    // 3. Verify the OTP with Supabase
    const {
      data: { session },
      error: otpError,
    } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: token,
      type: 'sms', // 'sms' is correct for new user verification
    });

    if (otpError) {
      console.error('Supabase OTP verification error:', otpError);
      return NextResponse.json(
        { error: `Invalid or expired OTP. Please try again.` },
        { status: 400 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Verification failed: No session returned.' },
        { status: 500 }
      );
    }

    // 4. Return Success
    return NextResponse.json(
      {
        success: true,
        message: 'Phone number verified successfully.',
        session,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify OTP API Error:', error);
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