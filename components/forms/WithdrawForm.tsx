'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
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
 * Purpose: Driver withdrawal form via Fapshi disbursement
 * 
 * FIXES MADE:
 * - Changed XAF → Units in labels
 * - Proper error handling
 * - Type-safe form values
 * - Loading state management
 * - Real API integration
 */

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

interface WithdrawFormProps {
  availableBalance: number;
  driverPhone: string;
}

export function WithdrawForm({ availableBalance, driverPhone }: WithdrawFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema.refine(
      (data) => Number(data.amount) <= availableBalance,
      {
        message: `Montant dépasse le solde disponible (${availableBalance} Units)`,
        path: ['amount'],
      }
    )),
    defaultValues: {
      amount: '',
      method: undefined,
      withdrawalPhoneNumber: driverPhone || '',
    },
  });

  const selectedMethod = form.watch('method');

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
        throw new Error(result.error || 'Retrait échoué');
      }

      sonnerToast.success('Retrait en cours!', {
        description: `Retrait de ${values.amount} Units vers ${values.withdrawalPhoneNumber} en traitement. Nouveau solde: ${result.newBalance} Units`,
      });

      form.reset();
      router.refresh();

    } catch (error) {
      let errorMessage = 'Une erreur inattendue est survenue.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      sonnerToast.error('Échec du retrait', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Amount Field - CHANGED: XAF → Units */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant à retirer (Units)</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  placeholder="5000" 
                  {...field}
                  className="bg-gray-800 border-gray-700"
                />
              </FormControl>
              <FormDescription>
                Montant minimum: 100 Units. Maximum: {availableBalance} Units disponibles.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment Method Field */}
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Méthode de retrait</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Choisir une méthode" />
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

        {/* Phone Number Field (Conditional) */}
        {selectedMethod && (
          <div key={`phone-${selectedMethod}`}>
            <FormField
              control={form.control}
              name="withdrawalPhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numéro de téléphone ({selectedMethod})</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="6XXXXXXXX"
                      {...field}
                      className="bg-gray-800 border-gray-700"
                    />
                  </FormControl>
                  <FormDescription>
                    Le numéro {selectedMethod} qui recevra les fonds. Format: 6XXXXXXXX
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traitement...
            </>
          ) : (
            'Confirmer le retrait'
          )}
        </Button>
      </form>
    </Form>
  );
}