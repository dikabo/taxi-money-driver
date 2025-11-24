'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';

/**
 * File: /components/forms/DriverLoginForm.tsx (DRIVER APP)
 * Purpose: Driver login - FIXED to work like passenger app
 * ✅ Calls Supabase directly (no /api/auth/login)
 * ✅ Sends OTP automatically
 * ✅ Redirects to verify-otp
 */

const loginSchema = z.object({
  phoneNumber: z.string().regex(/^[6-8]\d{8}$/, {
    message: 'Le numéro doit être composé de 9 chiffres (ex: 677123456)',
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function DriverLoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setIsLoading(true);
    let apiError = '';

    try {
      // 1. Create Supabase client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 2. Check if driver exists in database first
      const checkResponse = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: values.phoneNumber }),
      });

      if (!checkResponse.ok) {
        const error = await checkResponse.json();
        apiError = error.error || 'Ce numéro n\'est pas enregistré';
        throw new Error(apiError);
      }

      // 3. Send OTP via Supabase (same as passenger app!)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: values.phoneNumber,
        options: {
          shouldCreateUser: false, // Don't create new user
        },
      });

      if (otpError) {
        console.error('[LOGIN] Supabase OTP error:', otpError);
        apiError = 'Impossible d\'envoyer l\'OTP. Veuillez réessayer.';
        throw new Error(apiError);
      }

    } catch (error) {
      console.error('[LOGIN] Error:', error);
      if (!apiError) {
        apiError = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
      }
    }

    // Handle result after try/catch
    if (apiError) {
      toast.error('Échec de la connexion', {
        description: apiError,
      });
      setIsLoading(false);
    } else {
      toast.success('OTP envoyé!', {
        description: 'Vérifiez votre téléphone pour le code.',
      });
      
      setIsLoading(false);
      router.push(`/verify-otp?phone=${encodeURIComponent(values.phoneNumber)}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Phone Number Field */}
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de téléphone</FormLabel>
              <FormControl>
                <Input
                  placeholder="677123456"
                  {...field}
                  maxLength={9}
                  type="tel"
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                9 chiffres (ex: 677123456)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            'Continuer'
          )}
        </Button>
      </form>
    </Form>
  );
}