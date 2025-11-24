import { Metadata } from 'next';
import Link from 'next/link';
import { DriverLoginForm } from '@/components/forms/DriverLoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * File: /app/(auth)/login/page.tsx (DRIVER APP)
 * Purpose: Driver login page - sends OTP
 */

export const metadata: Metadata = {
  title: 'Connexion | Taxi Money Chauffeur',
  description: 'Connectez-vous à votre compte chauffeur',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Connexion Chauffeur
          </CardTitle>
          <CardDescription className="text-slate-400">
            Entrez votre numéro pour recevoir un code OTP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriverLoginForm />
          
          <div className="mt-6 text-center text-sm text-slate-400">
            Pas encore de compte ?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Créer un compte
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}