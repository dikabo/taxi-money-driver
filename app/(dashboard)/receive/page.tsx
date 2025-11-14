import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/auth/supabase-server';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequestPaymentForm } from '@/components/forms/RequestPaymentForm';
import { QrCode } from 'lucide-react';

/**
 * File: /app/(dashboard)/receive/page.tsx
 * Purpose: The driver's "Receive Payment" page.
 *
 * This Server Component fetches the driver's ID for the
 * QR code and passes it to the client-side form.
 */

export const metadata: Metadata = {
  title: 'Receive Payment | Taxi Money Driver',
};

// We will use our correct 'cookies()' pattern
async function getDriverData() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  const { data: { session }, } = await supabase.auth.getSession();
  if (!session) {
    return redirect('/signup');
  }

  // TODO: Fetch real Driver ID from MongoDB
  // For now, we'll use the authId
  const driverId = session.user.id.substring(0, 8); // e.g., "TAXI-1234"
  const driverQrValue = `taximoney://driver/${session.user.id}`;

  return { driverId, driverQrValue };
}

export default async function ReceivePage() {
  const { driverId, driverQrValue } = await getDriverData();

  return (
    <div className="flex flex-col h-full space-y-6">
      <h1 className="text-2xl font-bold text-white">Receive Payment</h1>

      {/* 1. Get Scanned (Your QR Code) */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>My Driver ID (Get Scanned)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {/* Mock QR Code */}
          <div className="p-4 bg-white rounded-lg">
            <QrCode className="h-32 w-32 text-black" />
          </div>
          <p className="text-lg font-mono text-center">
            {driverId}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            Ask the passenger to scan this code or enter your ID.
          </p>
        </CardContent>
      </Card>

      {/* 2. Request Payment (By Passenger ID) */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Request Payment (By ID)</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestPaymentForm />
        </CardContent>
      </Card>
    </div>
  );
}