import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { createCookieServerClient } from '@/lib/auth/supabase-server';

/**
 * File: /app/api/auth/login/route.ts (DRIVER APP)
 * Purpose: Driver login - sends OTP to phone (like passenger app)
 * 
 * Flow:
 * 1. Validate phone number
 * 2. Send OTP via Supabase
 * 3. Return success
 * 4. Driver will verify OTP on next page
 */

const loginSchema = z.object({
  phoneNumber: z.string().regex(/^[6-8]\d{8}$/, {
    message: 'Le numéro doit être au format 6XXXXXXXX',
  }),
});

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Initialize Supabase Client
    const supabase = createCookieServerClient(cookieStore);
    
    if (!supabase) {
      return NextResponse.json(
        { error: 'Could not create Supabase client' },
        { status: 500 }
      );
    }

    // 2. Parse and Validate Body
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { phoneNumber } = validation.data;

    console.log('[LOGIN] Attempting to send OTP to:', phoneNumber);

    // 3. Send OTP via Supabase
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        // For test numbers, Supabase will use the Phone Autofill
        shouldCreateUser: false, // Don't create user, they should already exist
      },
    });

    if (otpError) {
      console.error('[LOGIN] Supabase OTP error:', otpError);
      return NextResponse.json(
        { error: `Failed to send OTP: ${otpError.message}` },
        { status: 400 }
      );
    }

    console.log('[LOGIN] OTP sent successfully to:', phoneNumber);

    // 4. Return Success
    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent to your phone. Please verify.',
        phoneNumber,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[LOGIN] API Error:', error);
    
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