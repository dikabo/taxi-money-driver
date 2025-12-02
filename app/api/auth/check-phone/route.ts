import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';

/**
 * File: /app/api/auth/check-phone/route.ts (DRIVER APP)
 * Purpose: Check if a phone number is registered before login
 * 
 * ✅ Phone format: Receives 9-digit format (6XXXXXXXX) from client
 */

/**
 * Clean phone for MongoDB lookup (just 9 digits, no prefix)
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
  try {
    const body = await req.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Numéro de téléphone requis' },
        { status: 400 }
      );
    }

    console.log('[DRIVER CHECK PHONE] Original phone:', phoneNumber);

    // Clean phone for MongoDB lookup
    const storagePhone = cleanPhoneForStorage(phoneNumber);
    console.log('[DRIVER CHECK PHONE] Storage format for lookup:', storagePhone);

    // Connect to database
    await dbConnect();

    // Check if driver exists
    const driver = await Driver.findOne({ phoneNumber: storagePhone });

    if (!driver) {
      console.log('[DRIVER CHECK PHONE] ❌ Driver not found');
      return NextResponse.json(
        { error: 'Ce numéro n\'est pas enregistré. Veuillez créer un compte.' },
        { status: 404 }
      );
    }

    console.log('[DRIVER CHECK PHONE] ✅ Driver found:', driver._id);

    return NextResponse.json(
      {
        success: true,
        exists: true,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[DRIVER CHECK PHONE] ❌ Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}