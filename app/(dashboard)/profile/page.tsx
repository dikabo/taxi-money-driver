import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/auth/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Driver from '@/lib/db/models/Driver';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Smartphone, Car } from 'lucide-react';
import { Metadata } from 'next';

/**
 * File: /app/(dashboard)/profile/page.tsx
 * Purpose: The driver's profile page, displaying their data.
 * ✅ FIXED: Driver ID now consistent with home page (uses _id, not authId)
 */

export const metadata: Metadata = {
  title: 'Profile | Taxi Money Driver',
};

// Helper function to fetch the driver data
async function getDriverData() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  // 1. Get the current user session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return redirect('/login');
  }

  // 2. Get the driver profile from MongoDB
  await dbConnect();
  const driver = await Driver.findOne({ authId: session.user.id });
  if (!driver) {
    return redirect('/login');
  }

  return driver;
}

// A simple component to display a piece of data
function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-slate-700">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{value || 'N/A'}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const driver = await getDriverData();
  
  // ✅ FIXED: Use the same format as home page (first 8 chars of _id)
  const driverId = String(driver._id).substring(0, 8).toUpperCase();

  return (
    <div className="flex flex-col h-full space-y-6">
      <h1 className="text-2xl font-bold text-white">Your Profile</h1>

      {/* Personal Information Card */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center space-x-3 pb-4">
          <User className="h-6 w-6" />
          <CardTitle className="text-lg">Personal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="First Name" value={driver.firstName} />
          <InfoRow label="Last Name" value={driver.lastName} />
          <InfoRow label="Driver ID" value={driverId} />
        </CardContent>
      </Card>

      {/* Contact Information Card */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center space-x-3 pb-4">
          <Smartphone className="h-6 w-6" />
          <CardTitle className="text-lg">Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Phone Number" value={driver.phoneNumber} />
          <InfoRow label="Email Address" value={driver.email} />
        </CardContent>
      </Card>

      {/* Vehicle Information Card */}
      <Card className="bg-card">
        <CardHeader className="flex flex-row items-center space-x-3 pb-4">
          <Car className="h-6 w-6" />
          <CardTitle className="text-lg">Vehicle Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Matricule" value={driver.immatriculation} />
          <InfoRow label="Make" value={driver.vehicleMake} />
          <InfoRow label="Model" value={driver.vehicleModel} />
          <InfoRow label="Color" value={driver.vehicleColor} />
          <InfoRow label="Type" value={driver.vehicleType} />
        </CardContent>
      </Card>
    </div>
  );
}