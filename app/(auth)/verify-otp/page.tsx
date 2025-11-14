'use client';

import { Suspense } from 'react';
import { OtpForm } from '@/components/forms/OtpForm';

/**
 * File: /app/(auth)/verify-otp/page.tsx
 * Purpose: This page displays the OTP verification form.
 * We wrap it in a <Suspense> to allow the form to
 * read the phone number from the URL.
 */

export default function VerifyOtpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Check your phone</h1>
        <p className="text-muted-foreground text-center mb-6">
          We sent a 6-digit verification code.
        </p>
        <Suspense fallback={<div>Loading...</div>}>
          <OtpForm />
        </Suspense>
      </div>
    </div>
  );
}