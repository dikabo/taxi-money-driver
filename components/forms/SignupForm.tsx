'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// ✅ IMPORT: Using the alias we created
import { signupSchema } from '@/lib/validations/auth-cameroon';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '+237',
      password: '',
      email: '',
      vehicleType: 'Taxi',
      vehicleColor: '',
      vehicleMake: '',
      vehicleModel: '',
      immatriculation: '',
      termsAccepted: false,
      privacyAccepted: false,
    }, // Removed 'as Partial<SignupFormValues>' for cleaner typing
  });

  // FIX: Changed function signature to strictly use SignupFormValues. 
  // form.handleSubmit ensures values conform to the schema.
  async function onSubmit(values: SignupFormValues) {
    setIsLoading(true);

    // DEBUG: Console log to confirm form submission starts after validation passes
    console.log('Attempting signup with values:', values);

    try {
      // FIX: Removed the redundant 'immatriculation' transformation logic.
      // The input field's onChange already sets the value to uppercase in the form state.
      // Sending 'values' directly is cleaner, but we ensure immatriculation is uppercase 
      // one final time just in case, relying on the schema to guarantee it's a string.
      const submissionValues = {
        ...values,
        immatriculation: values.immatriculation.toUpperCase(),
      };

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionValues),
      });

      const result = await response.json();

      if (!response.ok) {
        // DEBUG: Log the full API error response for better server-side debugging
        console.error('API Error Response:', result);
        throw new Error(result.error || 'An unknown error occurred');
      }

      // DEBUG: Log successful response before redirecting
      console.log('API response OK. Redirecting...');

      sonnerToast.success('Account created successfully!', {
        description: 'An OTP has been sent to your phone. Please verify.',
      });

      router.push(`/verify-otp?phone=${encodeURIComponent(values.phoneNumber)}`);
    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error('Signup error:', errorMessage);
      sonnerToast.error('Signup Failed', {
        description: errorMessage,
      });
    } finally {
      // Crucial: This ensures the loading spinner is dismissed even if there's an error
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name (Nom)</FormLabel>
                <FormControl>
                  <Input placeholder="Jean" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name (Prénom)</FormLabel>
                <FormControl>
                  <Input placeholder="Fombi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+237699123456" {...field} />
              </FormControl>
              <FormDescription>
                Must be in international format (e.g., +237...).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormDescription>
                8+ chars, with letter, number, & symbol (@$!%*?&).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="your.email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <h2 className="text-xl font-semibold pt-4">Vehicle Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <Input placeholder="Taxi" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input placeholder="Yellow" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vehicleMake"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input placeholder="Toyota" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleModel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="Yaris" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="immatriculation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Matricule (Immatriculation)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="CE1234AA" 
                  {...field} 
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormDescription>
                Format: CE1234AA (no spaces)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I accept the <a href="#" className="underline">terms and conditions</a>.
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="privacyAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    I accept the <a href="#" className="underline">privacy policy</a>.
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </Form>
  );
}