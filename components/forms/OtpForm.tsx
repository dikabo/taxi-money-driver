'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { driverOtpSchema} from '@/lib/validations/auth-cameroon';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

/**
 * File: /components/forms/OtpForm.tsx
 * Purpose: The frontend form for OTP verification (DRIVER APP).
 * ✅ FIXED: Added resend OTP functionality
 */

// We only need the 'token' part of the schema for this form
const formSchema = z.object({
  token: z
    .string()
    .min(6, 'OTP must be 6 digits')
    .max(6, 'OTP must be 6 digits'),
});

type OtpFormValues = z.infer<typeof formSchema>;

export function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const phoneNumber = searchParams.get('phone'); // Get phone from URL

  const form = useForm<OtpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: '',
    },
  });

  async function onSubmit(values: OtpFormValues) {
    setIsLoading(true);

    if (!phoneNumber) {
      sonnerToast.error('Error', {
        description: 'No phone number found. Please sign up again.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          token: values.token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify OTP');
      }

      // Success!
      sonnerToast.success('Phone verified!', {
        description: 'Your account is active. Redirecting you...',
      });

      // Redirect to the home dashboard
      router.push('/home');
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      sonnerToast.error('Verification Failed', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ✅ NEW: Resend OTP function
  const handleResendOtp = async () => {
    if (!phoneNumber) {
      sonnerToast.error('Error', {
        description: 'No phone number found.',
      });
      return;
    }

    setIsResending(true);

    try {
      console.log('[DRIVER RESEND OTP] Phone from URL:', phoneNumber);

      // Create Supabase client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Resend OTP (phone is already in +237 format from login page)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phoneNumber, // Already formatted as +237XXXXXXXXX
        options: {
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        console.error('[DRIVER RESEND OTP] Error:', otpError);
        throw new Error('Failed to resend code. Please try again.');
      }

      console.log('[DRIVER RESEND OTP] ✅ OTP resent successfully');

      sonnerToast.success('Code resent!', {
        description: 'Check your phone for the new code.',
      });

      // Reset the form
      form.reset();

    } catch (error) {
      console.error('[DRIVER RESEND OTP] ❌ Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred.';
      sonnerToast.error('Resend Failed', {
        description: errorMessage,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">One-Time Password</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  {...field}
                >
                  <InputOTPGroup className="flex justify-center">
                    <InputOTPSlot index={0} className="text-2xl h-14 w-12" />
                    <InputOTPSlot index={1} className="text-2xl h-14 w-12" />
                    <InputOTPSlot index={2} className="text-2xl h-14 w-12" />
                    <InputOTPSlot index={3} className="text-2xl h-14 w-12" />
                    <InputOTPSlot index={4} className="text-2xl h-14 w-12" />
                    <InputOTPSlot index={5} className="text-2xl h-14 w-12" />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Account'
          )}
        </Button>
      </form>
      
      <p className="text-center text-sm text-muted-foreground mt-6">
        Did not receive a code?{' '}
        <Button 
          variant="link" 
          className="p-0"
          onClick={handleResendOtp}
          disabled={isResending}
          type="button"
        >
          {isResending ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin inline" />
              Sending...
            </>
          ) : (
            'Resend code'
          )}
        </Button>
      </p>
    </Form>
  );
}