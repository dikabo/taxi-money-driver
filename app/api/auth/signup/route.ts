import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import { signupSchema } from '@/lib/validations/auth-cameroon';
import { 
  createAdminServerClient, 
  createCookieServerClient 
} from '@/lib/auth/supabase-server';
import { z } from 'zod';

/**
 * File: /app/api/auth/signup/route.ts (DRIVER APP)
 * Purpose: API endpoint for new driver registration.
 * 
 * ✅ CRITICAL FIX: Proper phone number handling
 * - Supabase (OTP) needs: +237XXXXXXXXX (international format)
 * - MongoDB/Fapshi needs: 6XXXXXXXX (local format, no +237)
 * 
 * ✅ NEW FIX: Prevents duplicate Supabase users
 * - Checks if user exists in Supabase FIRST
 * - If exists but not in MongoDB, deletes from Supabase and recreates
 */

interface MongoError {
  code: number;
}

/**
 * Format phone for Supabase (needs +237 prefix)
 */
function formatPhoneForSupabase(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+237')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('237')) {
    return `+${cleaned}`;
  }
  
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return `+237${cleaned}`;
  }
  
  return `+237${cleaned}`;
}

/**
 * Clean phone for MongoDB/Fapshi (just 9 digits, no prefix)
 */
function cleanPhoneForStorage(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('237')) {
    cleaned = cleaned.substring(3);
  }
  
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  
  throw new Error('Invalid Cameroon phone number format');
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Initialize Supabase Admin Client
    const supabaseAdmin = createAdminServerClient(cookieStore);
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Could not create Supabase Admin client' },
        { status: 500 }
      );
    }

    // 2. Parse and Validate Body
    const body = await req.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input.', details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      phoneNumber,
      password,
      email,
      ...driverData
    } = validation.data;

    console.log('[DRIVER SIGNUP] Original phone from form:', phoneNumber);

    // ✅ CRITICAL: Format phone differently for different purposes
    const supabasePhone = formatPhoneForSupabase(phoneNumber); // +237XXXXXXXXX for Supabase/Twilio
    const storagePhone = cleanPhoneForStorage(phoneNumber);     // 6XXXXXXXX for MongoDB/Fapshi
    
    console.log('[DRIVER SIGNUP] Supabase format (for OTP):', supabasePhone);
    console.log('[DRIVER SIGNUP] Storage format (for MongoDB/Fapshi):', storagePhone);

    // 3. Connect to Database
    await dbConnect();

    // 4. Check for existing driver (use storage format)
    const existingDriver = await Driver.findOne({
      $or: [
        { phoneNumber: storagePhone },
        { immatriculation: driverData.immatriculation },
      ],
    });

    if (existingDriver) {
      let message = 'A user with this account already exists.';
      if (existingDriver.phoneNumber === storagePhone) {
        message = 'A user with this phone number already exists.';
      } else if (existingDriver.immatriculation === driverData.immatriculation) {
        message = 'A vehicle with this immatriculation number is already registered.';
      }
      return NextResponse.json({ error: message }, { status: 409 });
    }

    // ✅ NEW: Check if user exists in Supabase (orphaned user from previous failed signup)
    console.log('[DRIVER SIGNUP] Checking for existing Supabase user...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingSupabaseUser = existingUsers?.users.find(
      user => user.phone === supabasePhone
    );

    if (existingSupabaseUser) {
      console.log('[DRIVER SIGNUP] ⚠️ Found orphaned Supabase user, deleting...', existingSupabaseUser.id);
      
      // Delete the orphaned Supabase user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        existingSupabaseUser.id
      );
      
      if (deleteError) {
        console.error('[DRIVER SIGNUP] ❌ Failed to delete orphaned user:', deleteError);
        return NextResponse.json(
          { error: 'This phone number already exists. Please contact support.' },
          { status: 409 }
        );
      }
      
      console.log('[DRIVER SIGNUP] ✅ Orphaned user deleted successfully');
    }

    // 5. Create Auth User in Supabase (use Supabase format with +237)
    console.log('[DRIVER SIGNUP] Creating Supabase user with phone:', supabasePhone);
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        phone: supabasePhone, // +237XXXXXXXXX for Twilio
        password: password,
        email: email,
        phone_confirm: false,
        email_confirm: !!email,
      });

    if (authError) {
      console.error('[DRIVER SIGNUP] Supabase Auth Error:', authError);
      throw new Error(`Supabase Auth Error: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Supabase did not return a user.');
    }

    console.log('[DRIVER SIGNUP] ✅ Supabase user created:', authData.user.id);

    // 6. Create the Driver profile in MongoDB (use storage format without +237)
    const newDriver = new Driver({
      ...driverData,
      authId: authData.user.id,
      phoneNumber: storagePhone, // 6XXXXXXXX (no +237) for Fapshi compatibility
      email: email,
    });

    await newDriver.save();
    console.log('[DRIVER SIGNUP] ✅ MongoDB driver created');

    // 7. Send OTP using Supabase format
    console.log('[DRIVER SIGNUP] Sending OTP to:', supabasePhone);
    
    // Handle test user
    if (storagePhone === '699999999') {
      console.log('[DRIVER SIGNUP] Test user signup. Skipping real SMS send.');
    } else {
      // Real user - send OTP
      const supabaseCookieClient = createCookieServerClient(cookieStore);
      const { error: otpError } = await supabaseCookieClient.auth.signInWithOtp({
        phone: supabasePhone, // +237XXXXXXXXX for Twilio SMS
        options: {
          shouldCreateUser: false, // User already created
        },
      });

      if (otpError) {
        console.error('[DRIVER SIGNUP] ❌ OTP send failed:', otpError);
        console.error('[DRIVER SIGNUP] Phone used:', supabasePhone);
        
        // User is created but OTP failed
        return NextResponse.json(
          { 
            error: `User created, but failed to send OTP: ${otpError.message}. Please try to login.`,
            userId: authData.user.id,
            canRetry: true,
          },
          { status: 500 }
        );
      }

      console.log('[DRIVER SIGNUP] ✅ OTP sent successfully');
    }

    console.log('='.repeat(80));

    // 8. Return Success
    return NextResponse.json(
      {
        success: true,
        message: 'Driver registered. Please verify your phone.',
        userId: authData.user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[DRIVER SIGNUP] ❌ Critical Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid validation', details: error.issues },
        { status: 400 }
      );
    }
    if ((error as MongoError).code === 11000) {
      return NextResponse.json(
        { error: 'A duplicate entry error occurred.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: (error as Error).message || 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}