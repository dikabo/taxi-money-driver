import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/auth/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import Transaction from '@/lib/db/models/Transaction';

/**
 * File: /app/api/transactions/history/route.ts (DRIVER APP)
 * Purpose: Get driver transaction history
 * 
 * GET /api/transactions/history
 * Returns all transactions for authenticated driver
 */

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Check authentication
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 2. Connect to database
    await dbConnect();

    // 3. Find driver
    const driver = await Driver.findOne({ authId: session.user.id });
    
    if (!driver) {
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // 4. Get all transactions for this driver
    const transactions = await Transaction.find({
      userId: driver._id,
      userType: 'Driver',
    })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(50) // Limit to last 50 transactions
      .lean()
      .exec();

    // 5. Return transactions
    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
    });

  } catch (error) {
    console.error('[DRIVER HISTORY] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Une erreur est survenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}