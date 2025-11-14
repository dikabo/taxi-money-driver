'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form'; // Import SubmitHandler
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { requestPaymentSchema } from '@/lib/validations/auth-cameroon';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * File: /components/forms/RequestPaymentForm.tsx
 * Purpose: The frontend form for requesting a payment from a passenger.
 *
 * THE FIX:
 * 1. The schema now expects a 'string' for amount.
 * 2. defaultValues is now '150' (as a string).
 * 3. All type errors are now resolved.
 */

// This type is now { amount: string, passengerId: string }
type RequestFormValues = z.infer<typeof requestPaymentSchema>;

const presetAmounts = [150, 200, 350, 500];

export function RequestPaymentForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // THIS IS THE FIX: All fields are now strings
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestPaymentSchema),
    defaultValues: {
      amount: '150', // 'amount' is now a string
      passengerId: '',
    },
  });

  const handleTabChange = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true);
      form.setValue('amount', ''); // Set to empty string
      form.clearErrors('amount');
    } else {
      setIsCustom(false);
      form.setValue('amount', value); // Set to string value
      form.clearErrors('amount');
    }
  };

  // This will no longer be red
  const onSubmit: SubmitHandler<RequestFormValues> = async (values) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'An unknown error occurred');
      }

      sonnerToast.success('Payment Requested!', {
        description: `Request for ${values.amount} XAF sent to passenger ${values.passengerId}.`,
      });

      // Reset form to its default state
      form.reset();
      setIsCustom(false); // Reset the tab view
      router.refresh(); 

    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      sonnerToast.error('Request Failed', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <FormField
          control={form.control} // No more error
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (XAF)</FormLabel>
              <Tabs 
                defaultValue="150" 
                className="w-full" 
                onValueChange={handleTabChange}
              >
                <TabsList className="grid w-full grid-cols-5">
                  {presetAmounts.map((amount) => (
                    <TabsTrigger key={amount} value={String(amount)}>
                      {amount}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <FormControl>
                {/* This is now a 100% type-safe string input */}
                <Input 
                  type="number" // The HTML type is still 'number'
                  placeholder="Enter custom amount" 
                  {...field} // 'field' is now correctly typed
                  className={cn(isCustom ? 'mt-4' : 'hidden')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control} // No more error
          name="passengerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passenger ID</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter passenger's ID" 
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Ask the passenger for their 6-digit ID.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Request Payment'
          )}
        </Button>
      </form>
    </Form>
  );
}