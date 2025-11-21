import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/auth/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { WithdrawForm } from '@/components/forms/WithdrawForm';
import { Card, CardContent } from '@/components/ui/card';

/**
 * File: /app/(dashboard)/withdraw/page.tsx
 * Purpose: The driver's withdrawal page.
 * ✅ FIXED: Now fetches REAL DATA from MongoDB
 */

export const metadata: Metadata = {
  title: 'Withdraw | Taxi Money Driver',
};

// Helper function to format currency
function formatCurrency(amount: number | undefined = 0) {
  return new Intl.NumberFormat('fr-CM', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(amount);
}

async function getWalletData() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return redirect('/signup');
  }

  // ✅ Connect to MongoDB
  await dbConnect();
  
  // ✅ Fetch REAL driver data from MongoDB
  const driver = await Driver.findOne({ authId: session.user.id });

  if (!driver) {
    return redirect('/signup');
  }

  // ✅ Use REAL available balance from driver document
  const availableBalance = driver.availableBalance || 0;

  return { 
    availableBalance, 
    driverPhone: session.user.phone 
  };
}

export default async function WithdrawPage() {
  const { availableBalance, driverPhone } = await getWalletData();

  return (
    <div className="flex flex-col h-full space-y-6">
      <h1 className="text-2xl font-bold text-white">Withdraw Funds</h1>

      {/* Available Balance - ✅ REAL DATA */}
      <Card className="bg-slate-800 border-slate-700 text-white">
        <CardContent className="pt-6">
          <div className="text-sm font-medium text-muted-foreground">
            Solde Disponible
          </div>
          <div className="text-3xl font-bold">
            {formatCurrency(availableBalance)}
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Form */}
      <Card className="bg-card">
        <CardContent className="pt-6">
          <WithdrawForm 
            availableBalance={availableBalance}
            driverPhone={driverPhone || ''} 
          />
        </CardContent>
      </Card>
    </div>
  );
}