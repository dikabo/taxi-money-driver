import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';

/**
 * File: /app/api/auth/check-phone/route.ts (DRIVER APP)
 * Purpose: Check if a phone number exists in the system
 * Used during login to verify the driver is registered
 */

const cameroonPhoneRegex = /^[6-8]\d{8}$/;

const checkPhoneSchema = z.object({
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Le numéro doit être composé de 9 chiffres',
  }),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Validate Body
    const body = await req.json();
    const validation = checkPhoneSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { phoneNumber } = validation.data;

    console.log('[CHECK PHONE] Checking phone:', phoneNumber);

    // 2. Connect to MongoDB
    await dbConnect();

    // 3. Check if driver exists
    const driver = await Driver.findOne({ phoneNumber }).lean();

    if (!driver) {
      console.log('[CHECK PHONE] Phone not found:', phoneNumber);
      return NextResponse.json(
        { error: 'Ce numéro n\'est pas enregistré. Veuillez créer un compte.' },
        { status: 404 }
      );
    }

    console.log('[CHECK PHONE] ✅ Phone found for driver:', driver._id);

    // 4. Return success (don't send sensitive data)
    return NextResponse.json(
      {
        success: true,
        message: 'Numéro trouvé',
        firstName: driver.firstName,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[CHECK PHONE API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation invalide', details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}