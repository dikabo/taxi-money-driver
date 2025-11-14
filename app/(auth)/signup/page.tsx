import { SignupForm } from '@/components/forms/SignupForm'; // <-- THE FIX IS HERE
import { Metadata } from 'next';

/**
 * File: /app/(auth)/signup/page.tsx
 * Purpose: This page displays the driver registration form.
 *
 * FIX: Changed import to a named import { SignupForm } to match
 * the export in the component file.
 */

export const metadata: Metadata = {
  title: 'Driver Signup | Taxi Money',
  description: 'Create your Taxi Money driver account.',
};

export default function SignupPage() {
  // This page just renders the form component.
  return <SignupForm />;
}