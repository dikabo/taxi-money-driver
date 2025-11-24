import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/auth/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
// NOTE: Assuming these Mongoose models exist and are correctly imported
import Driver from '@/lib/db/models/Driver'; 
import Transaction from '@/lib/db/models/Transaction'; 
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, History, QrCode, TrendingUp } from 'lucide-react';
import { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * File: /app/(dashboard)/home/page.tsx (DRIVER APP)
 * Purpose: Driver dashboard with REAL DATA from MongoDB
 * ✅ FIXED: TypeScript structural and 'any' errors resolved
 */

export const metadata: Metadata = {
  title: 'Tableau de bord | Taxi Money Chauffeur',
};

export const viewport: Viewport = {
  themeColor: '#1e293b',
};

function formatUnits(amount: number | undefined = 0) {
  return `${amount.toLocaleString('fr-CM')} Units`;
}

// 1. Define the interface for the final, processed transaction (with proper Date object)
interface TransactionWithDate {
  _id: string;
  type: string;
  amount: number;
  notes?: string;
  createdAt: Date;
}

// 2. Define the interface for the raw data returned by Mongoose .lean()
interface RawTransaction {
  // FIX: Changed 'any' to 'unknown' to satisfy no-explicit-any rule (L44/L45)
  _id: unknown; 
  type: string;
  amount: number;
  notes?: string;
  createdAt: string | Date; // Mongoose timestamps are convertible to Date
}


async function getDriverData() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/signup');
  }

  await dbConnect();
  
  // Get driver
  const driver = await Driver.findOne({ authId: session.user.id });

  if (!driver) {
    return redirect('/signup');
  }

  // ✅ FETCH REAL TRANSACTIONS
  const recentTransactionsRaw: RawTransaction[] = await Transaction.find({
    userId: driver._id,
    userType: 'Driver',
    status: 'Success',
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()
    .exec() as unknown as RawTransaction[]; // FIX: Use unknown to bypass structural type conflict (L72)

  // ✅ Convert to proper type with Date objects - FIX APPLIED HERE
  const recentTransactions: TransactionWithDate[] = recentTransactionsRaw.map((t: RawTransaction) => ({
    _id: String(t._id),
    type: t.type,
    amount: t.amount,
    notes: t.notes,
    createdAt: new Date(t.createdAt), // Ensure it's a Date object
  }));

  // Calculate today's earnings
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Use RawTransaction[] for the lean result here too
  const todayTransactions: RawTransaction[] = await Transaction.find({
    userId: driver._id,
    userType: 'Driver',
    type: 'Payment',
    status: 'Success',
    createdAt: { $gte: today },
  }).lean() as unknown as RawTransaction[]; // FIX: Use unknown to bypass structural type conflict (L97)

  const dailyEarnings = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  // Generate QR value
  const driverQrValue = `taximoney://driver/${driver._id}`;

  return { 
    driver, 
    recentTransactions,
    dailyEarnings,
    driverQrValue 
  };
}

export default async function DriverHomePage() {
  // Ensure we check if getDriverData returned a redirect response implicitly or actual data
  const data = await getDriverData();

  if ('driver' in data) {
    const { driver, recentTransactions, dailyEarnings } = data;

    const driverName = `${driver.firstName} ${driver.lastName}`;
    const driverId = String(driver._id).substring(0, 8).toUpperCase();

    return (
      <div className="flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Bonjour, {driverName}</h1>
            <p className="text-sm text-gray-400">ID Chauffeur: {driverId}</p>
          </div>
        </div>

        {/* QR Code Card */}
        <Card className="bg-gray-900 border-gray-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mon Code QR</CardTitle>
            <QrCode className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {/* QR-like grid */}
            <div className="p-4 bg-white rounded-lg">
              <div className="grid grid-cols-8 gap-0.5 bg-white p-2">
                {Array.from({ length: 64 }).map((_, i) => {
                  const seed = `${driver._id}:${i}`;
                  const hash = Array.from(seed).reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) | 0, 7);
                  const isBlack = (Math.abs(hash) % 100) < 40;
                  return (
                    <div
                      key={i}
                      className={`w-4 h-4 ${isBlack ? 'bg-black' : 'bg-white'}`}
                    />
                  );
                })}
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-mono text-black font-bold">{driverId}</p>
              <p className="text-xs text-gray-600">Partagez ce code pour recevoir des paiements</p>
            </div>
          </CardContent>
        </Card>

        {/* Available Balance Card */}
        <Card className="bg-gray-900 border-gray-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde Disponible</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatUnits(driver.availableBalance)}</div>
            <p className="text-xs text-gray-400 pt-2">Disponible pour retrait</p>
            <Link href="/withdraw">
              <Button className="w-full mt-4" variant="default">
                Retirer des fonds
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Today's Earnings Card - ✅ REAL DATA */}
        <Card className="bg-gray-900 border-gray-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gains du jour</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatUnits(dailyEarnings)}</div>
            <p className="text-xs text-gray-400 pt-1">Depuis minuit</p>
          </CardContent>
        </Card>

        {/* Recent Transactions - ✅ REAL DATA */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-white">Activité récente</h2>
            <Link href="/components/dashboard/transactions/HistoryModal">
              <Button variant="link" className="p-0 text-white">
                Voir tout
              </Button>
            </Link>
          </div>
          
          {recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.slice(0, 3).map((transaction) => (
                <Card key={transaction._id} className="bg-gray-900 border-gray-800 text-white">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-800 rounded-full">
                          <History className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.type === 'Payment' ? 'Paiement reçu' : transaction.type}
                          </p>
                          <p className="text-sm text-gray-400">
                            {transaction.createdAt.toLocaleString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          {transaction.notes && (
                            <p className="text-xs text-gray-500 mt-1">{transaction.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className={`text-lg font-bold ${
                        transaction.type === 'Payment' || transaction.type === 'Recharge'
                          ? 'text-green-400' 
                          : 'text-red-400'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}
                        {formatUnits(Math.abs(transaction.amount))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800 text-white">
              <CardContent className="pt-6">
                <p className="text-center text-gray-400">
                  Aucune transaction récente
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }
  
  // This return should not be reached if the redirects in getDriverData work correctly, 
  // but keeping the component structured as it relies on the async function's implicit redirection.
  return null; 
}