import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies HERE
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import { signupSchema } from '@/lib/validations/auth-cameroon';
import { 
  createAdminServerClient, 
  createCookieServerClient 
} from '@/lib/auth/supabase-server';
import { z } from 'zod';

/**
 * File: /app/api/auth/signup/route.ts
 * Purpose: API endpoint for new driver registration.
 *
 * THE FIX: Cleaned up the 'otpError' logic to remove the warning.
 */

interface MongoError {
  code: number;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies(); // Call cookies() ONCE at the top

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
        // This 'issues' line is correct. The error is a cache bug.
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

    // 3. Connect to Database
    await dbConnect();

    // 4. Check for existing driver
    const existingDriver = await Driver.findOne({
      $or: [
        { phoneNumber },
        { immatriculation: driverData.immatriculation },
      ],
    });

    if (existingDriver) {
      let message = 'A user with this account already exists.';
      if (existingDriver.phoneNumber === phoneNumber) {
        message = 'A user with this phone number already exists.';
      } else if (existingDriver.immatriculation === driverData.immatriculation) {
        message = 'A vehicle with this immatriculation number is already registered.';
      }
      return NextResponse.json({ error: message }, { status: 409 });
    }

    // 5. Create Auth User in Supabase (using Admin Client)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        phone: phoneNumber,
        password: password,
        email: email,
        phone_confirm: false,
        email_confirm: !!email,
      });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return NextResponse.json(
        { error: `Supabase auth error: ${authError.message}` },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Supabase did not return a user.' },
        { status: 500 }
      );
    }

    // 6. Create the Driver profile in MongoDB
    const newDriver = new Driver({
      ...driverData,
      authId: authData.user.id,
      phoneNumber,
      email: email,
    });

    await newDriver.save();

    // 7. Send OTP (by signing in with the Cookie Client)
    // THIS IS THE FIX for the yellow warning
    if (phoneNumber === '+237699999999') {
      // It's our test user. The test OTP (123456) is handled by "Phone Autofill".
      console.log('Test user signup. Skipping real SMS send.');
    } else {
      // It's a real user. Send a real SMS.
      const supabaseCookieClient = createCookieServerClient(cookieStore);
      const { error: otpError } = await supabaseCookieClient.auth.signInWithPassword({
        phone: phoneNumber,
        password: password,
      });

      if (otpError) {
        console.error('CRITICAL: Could not send OTP after signup:', otpError.message);
        return NextResponse.json(
          { error: `User created, but failed to send OTP: ${otpError.message}` },
          { status: 500 }
        );
      }
    }

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
    console.error('Signup API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        // This 'issues' line is correct. The error is a cache bug.
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
      { error: 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}