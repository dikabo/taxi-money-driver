'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * File: /components/forms/DriverLoginForm.tsx
 * Purpose: Driver login - sends OTP (like passenger app)
 * Just phone number input → sends OTP → redirects to verify-otp page
 */

const loginSchema = z.object({
  phoneNumber: z.string().regex(/^[6-8]\d{8}$/, {
    message: 'Le numéro doit être au format 6XXXXXXXX',
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

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);

    try {
      // Call login API to send OTP
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Échec de l\'envoi du code');
      }

      toast.success('Code envoyé!', {
        description: 'Un code OTP a été envoyé à votre téléphone',
      });

      // Redirect to OTP verification page
      router.push(`/verify-otp?phone=${encodeURIComponent(values.phoneNumber)}`);

    } catch (error) {
      let errorMessage = 'Une erreur inattendue est survenue.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error('Échec de la connexion', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
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
                  placeholder="6XXXXXXXX"
                  {...field}
                  maxLength={9}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={isLoading}
                />
              </FormControl>
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
              Envoi du code...
            </>
          ) : (
            'Recevoir le code OTP'
          )}
        </Button>
      </form>
    </Form>
  );
}