import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/auth/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, History } from 'lucide-react';
import { Metadata, Viewport } from 'next';

/**
 * File: /app/(dashboard)/home/page.tsx
 * Purpose: The main driver dashboard.
 *
 * FIX: Correctly displays the driver's full name.
 */

export const metadata: Metadata = {
  title: 'Dashboard | Taxi Money Driver',
};

export const viewport: Viewport = {
  themeColor: '#1e293b',
};

// Helper function to format currency
function formatCurrency(amount: number | undefined = 0) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
}

async function getDriverData() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  const { data: { session }, } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/signup');
  }

  await dbConnect();
  const driver = await Driver.findOne({ authId: session.user.id });

  if (!driver) {
    return redirect('/signup');
  }

  const earnings = {
    availableBalance: 50000,
    today: 12500,
    lastTransaction: {
      type: 'Payment Received',
      amount: 1500,
      timestamp: new Date().toISOString(),
    },
  };

  return { driver, earnings, session };
}


export default async function HomePage() {
  const { driver, earnings } = await getDriverData();

  // THIS IS THE FIX
  const driverName = `${driver.firstName} ${driver.lastName}`;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {/* We are now using the full driverName */}
          <h1 className="text-2xl font-bold text-white">Bonjour, {driverName}</h1>
          <p className="text-sm text-muted-foreground">Driver ID: {driver.authId.substring(0, 8)}</p>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <Card className="bg-slate-800 border-slate-700 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Solde Disponible</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatCurrency(earnings.availableBalance)}</div>
          <p className="text-xs text-muted-foreground pt-2">Retrait instantané disponible</p>
        </CardContent>
      </Card>

      {/* Today's Earnings Card */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gains du jour</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(earnings.today)}</div>
        </CardContent>
      </Card>

      {/* Last Transaction */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Activité récente</h2>
        <Card className="bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-700 rounded-full">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{earnings.lastTransaction.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(earnings.lastTransaction.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="text-lg font-bold text-green-400">
                +{formatCurrency(earnings.lastTransaction.amount)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}