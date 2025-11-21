'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form'; // Added SubmitHandler
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
    } as Partial<SignupFormValues>,
  });

  // ✅ FIXED: Implemented the robust logic from the Passenger app
  const onSubmit: SubmitHandler<SignupFormValues> = async (values) => {
    setIsLoading(true);
    let apiError = ''; // Store error here instead of throwing immediately

    try {
      // Preserve specific driver logic: Uppercase the matricule
      // We cast values to 'any' briefly to handle the dynamic property safely if Typescript complains, 
      // or we just rely on the object spread.
      const submissionValues: SignupFormValues = {
        ...values,
        immatriculation: values.immatriculation ? values.immatriculation.toUpperCase() : '',
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
        // Capture API error
        apiError = result.error || 'An unknown error occurred';
      }

    } catch (error) {
      // Capture Network/Fetch error
      console.error('Signup fetch error:', error);
      apiError = 'Unable to contact server. Please check your connection.';
    }

    // Handle results outside the try/catch block
    if (apiError) {
      // --- FAILURE CASE ---
      sonnerToast.error('Signup Failed', {
        description: apiError,
      });
      setIsLoading(false); // Stop loading so user can try again
    } else {
      // --- SUCCESS CASE ---
      sonnerToast.success('Account created successfully!', {
        description: 'An OTP has been sent to your phone. Please verify.',
      });

      // Stop loading BEFORE navigating
      setIsLoading(false);

      // Navigate to OTP page
      router.push(`/verify-otp?phone=${encodeURIComponent(values.phoneNumber)}`);
    }
  };

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