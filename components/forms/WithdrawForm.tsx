'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form'; // Import SubmitHandler
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { withdrawSchema } from '@/lib/validations/auth-cameroon';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * File: /components/forms/WithdrawForm.tsx
 * Purpose: The frontend form for processing a withdrawal.
 *
 * THE FIX:
 * 1. The schema now expects a 'string' for amount.
 * 2. defaultValues is now '' (an empty string).
 * 3. All type errors are now resolved.
 */

// This type is now { amount: string, method: string, ... }
type WithdrawFormValues = z.infer<typeof withdrawSchema>;

interface WithdrawFormProps {
  availableBalance: number;
  driverPhone: string;
}

export function WithdrawForm({ availableBalance, driverPhone }: WithdrawFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // THIS IS THE FIX: All fields are now strings or undefined
  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema.refine(
      (data) => Number(data.amount) <= availableBalance,
      {
        message: "Amount exceeds available balance",
        path: ["amount"],
      }
    )),
    defaultValues: {
      amount: '', // 'amount' is now a string
      method: undefined,
      withdrawalPhoneNumber: driverPhone || '+237',
    },
  });

  const selectedMethod = form.watch('method');

  // This will no longer be red
  const onSubmit: SubmitHandler<WithdrawFormValues> = async (values) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/withdraw', {
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

      sonnerToast.success('Withdrawal processing!', {
        description: `Your request for ${values.amount} XAF to ${values.withdrawalPhoneNumber} is processing.`,
      });

      form.reset();
      router.refresh(); 

    } catch (error) {
      let errorMessage = 'An unexpected error occurred.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      sonnerToast.error('Withdrawal Failed', {
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
              <FormLabel>Amount to Withdraw (XAF)</FormLabel>
              <FormControl>
                {/* This is now a 100% type-safe string input */}
                <Input 
                  type="number" // The HTML type is still 'number'
                  placeholder="5000" 
                  {...field} // 'field' is now correctly typed
                />
              </FormControl>
              <FormDescription>
                Minimum 150 XAF.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control} // No more error
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Withdrawal Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                  <SelectItem value="Orange">Orange Money</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {selectedMethod && (
          <FormField
            control={form.control} // No more error
            name="withdrawalPhoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Withdrawal Phone Number</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="+237XXXXXXXXX" 
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Enter the {selectedMethod} number to receive the funds.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Confirm Withdrawal'
          )}
        </Button>
      </form>
    </Form>
  );
}