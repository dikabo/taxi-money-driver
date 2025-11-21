/**
 * File: /lib/validations/auth-cameroon.ts
 * Purpose: Zod schemas for driver authentication
 * ✅ FIXED: All TypeScript errors resolved
 */

import { z } from 'zod';

const cameroonPhoneRegex = /[6-8]\d{8}$/;
const pinRegex = /^\d{4}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const numericString = z
  .string()
  .regex(/^\d+$/, 'Doit être un nombre valide');

// ✅ FIXED: Complete driver signup schema
export const driverSignupSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Le numéro doit être au format 6XXXXXXXX',
  }),
  password: z.string().regex(passwordRegex, {
    message: '8+ caractères, avec lettre, chiffre et symbole.',
  }),
  pin: z.string().regex(pinRegex, {
    message: 'Votre code PIN doit être composé de 4 chiffres.',
  }),
  email: z
    .string()
    .email('Veuillez saisir une adresse e-mail valide')
    .optional()
    .or(z.literal('')),
  vehicleType: z.string().min(2, 'Type de véhicule requis'),
  vehicleColor: z.string().min(2, 'Couleur requise'),
  vehicleMake: z.string().min(2, 'Marque requise'),
  vehicleModel: z.string().min(2, 'Modèle requis'),
  immatriculation: z.string().min(6, 'Immatriculation invalide'),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter les conditions générales.',
  }),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter la politique de confidentialité.',
  }),
});

// ✅ ALIAS: Export signupSchema to match your form imports
export const signupSchema = driverSignupSchema;

export const driverOtpSchema = z.object({
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Le numéro doit être au format 6XXXXXXXX',
  }),
  token: z
    .string()
    .min(6, 'Le code OTP doit être de 6 chiffres')
    .max(6, 'Le code OTP doit être de 6 chiffres'),
});

export const pinLoginSchema = z.object({
  pin: z.string().regex(pinRegex, {
    message: 'Votre code PIN doit être composé de 4 chiffres.',
  }),
});

// ✅ FIXED: Proper enum definition with error handling
export const withdrawSchema = z.object({
  amount: numericString
    .refine((val) => Number(val) >= 100, {
      message: 'Le retrait minimum est de 100 Units',
    })
    .refine((val) => Number(val) <= 500000, {
      message: 'Montant invalide',
    }),
  method: z.enum(['MTN', 'Orange'] as const, {
    message: 'Veuillez choisir MTN ou Orange',
  }),
  withdrawalPhoneNumber: z
    .string()
    .min(1, 'Veuillez entrer un numéro de téléphone')
    .regex(cameroonPhoneRegex, 'Veuillez saisir un numéro MoMo valide'),
});

export const requestPaymentSchema = z.object({
  amount: numericString
    .refine((val) => Number(val) > 0, {
      message: 'Le montant doit être supérieur à 0',
    })
    .refine((val) => Number(val) <= 4000, {
      message: 'Le montant maximum est de 4,000 Units',
    }),
  passengerId: z
    .string()
    .min(6, 'L\'ID du passager doit contenir au moins 6 caractères'),
});

// ✅ Type exports
export type DriverSignupValues = z.infer<typeof driverSignupSchema>;
export type DriverOtpValues = z.infer<typeof driverOtpSchema>;
export type PinLoginValues = z.infer<typeof pinLoginSchema>;
export type WithdrawFormValues = z.infer<typeof withdrawSchema>;
export type RequestPaymentValues = z.infer<typeof requestPaymentSchema>;