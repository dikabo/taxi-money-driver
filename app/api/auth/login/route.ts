import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
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

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Check if user is authenticated (should have session from OTP verification)
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vérifier votre OTP.' },
        { status: 401 }
      );
    }

    // 2. Connect to MongoDB
    await dbConnect();

    // 3. Get passenger data
    const driver = await Driver.findOne({ authId: session.user.id });

    if (!driver) {
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    console.log('[LOGIN] ✅ Login successful for:', driver.phoneNumber);

    // 4. Return success with user data
    return NextResponse.json(
      {
        success: true,
        message: 'Connexion réussie',
        user: {
          id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phoneNumber: driver.phoneNumber,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[LOGIN API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check login status
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    await dbConnect();
    const driver = await Driver.findOne({ authId: session.user.id });

    return NextResponse.json(
      {
        authenticated: true,
        user: driver ? {
          id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
        } : null,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[LOGIN CHECK] Error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}