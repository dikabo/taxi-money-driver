import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import { createCookieServerClient } from '@/lib/auth/supabase-server';

/**
 * File: /app/api/auth/login/route.ts (DRIVER APP)
 * Purpose: Complete login after OTP verification
 * 
 * ✅ CRITICAL FIX: Proper phone number handling
 * - Supabase (OTP) needs: +237XXXXXXXXX (international format)
 * - MongoDB/Fapshi needs: 6XXXXXXXX (local format, no +237)
 * 
 * Flow:
 * 1. User verifies OTP on /verify-otp page
 * 2. OTP verification creates Supabase session
 * 3. This route is called to finalize login
 * 4. Returns success and user data
 */

/**
 * Format phone for Supabase (needs +237 prefix)
 */
function formatPhoneForSupabase(phone: string): string {
  // Remove all spaces and special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If already has +237, return as is
  if (cleaned.startsWith('+237')) {
    return cleaned;
  }
  
  // If starts with 237, add +
  if (cleaned.startsWith('237')) {
    return `+${cleaned}`;
  }
  
  // If starts with 6-8 (valid Cameroon mobile), add +237
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return `+237${cleaned}`;
  }
  
  // Otherwise add +237
  return `+237${cleaned}`;
}

/**
 * Clean phone for MongoDB/Fapshi (just 9 digits, no prefix)
 */
function cleanPhoneForStorage(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If has 237 prefix, remove it
  if (cleaned.startsWith('237')) {
    cleaned = cleaned.substring(3);
  }
  
  // Should be 9 digits starting with 6/7/8
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  
  throw new Error('Invalid Cameroon phone number format');
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    console.log('[DRIVER LOGIN] Starting login process...');
    
    // 1. Check if user is authenticated (should have session from OTP verification)
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('[DRIVER LOGIN] ❌ No session found');
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vérifier votre OTP.' },
        { status: 401 }
      );
    }

    console.log('[DRIVER LOGIN] Session found for user:', session.user.id);

    // 2. Connect to MongoDB
    await dbConnect();
    console.log('[DRIVER LOGIN] ✅ Database connected');

    // 3. Get driver data
    const driver = await Driver.findOne({ authId: session.user.id });

    if (!driver) {
      console.log('[DRIVER LOGIN] ❌ Driver not found for authId:', session.user.id);
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    console.log('[DRIVER LOGIN] ✅ Driver found:', driver.phoneNumber);
    console.log('[DRIVER LOGIN] Phone format in MongoDB:', driver.phoneNumber);
    console.log('[DRIVER LOGIN] ✅ Login successful for:', driver.phoneNumber);
    console.log('='.repeat(80));

    // 4. Return success with user data
    return NextResponse.json(
      {
        success: true,
        message: 'Connexion réussie',
        user: {
          id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phoneNumber: driver.phoneNumber, // Returns storage format (6XXXXXXXX)
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[DRIVER LOGIN] ❌ Critical Error:', error);

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
    console.log('[DRIVER LOGIN CHECK] Checking authentication status...');
    
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('[DRIVER LOGIN CHECK] No active session');
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    console.log('[DRIVER LOGIN CHECK] Session found for user:', session.user.id);

    await dbConnect();
    const driver = await Driver.findOne({ authId: session.user.id });

    if (!driver) {
      console.log('[DRIVER LOGIN CHECK] ⚠️ Session exists but no driver record found');
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    console.log('[DRIVER LOGIN CHECK] ✅ Authenticated driver:', driver.phoneNumber);

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phoneNumber: driver.phoneNumber, // Returns storage format (6XXXXXXXX)
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[DRIVER LOGIN CHECK] ❌ Error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}