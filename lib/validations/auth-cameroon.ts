import { z } from 'zod';

/**
 * File: /lib/validations/auth-cameroon.ts
 * Purpose: Defines Zod schemas for input validation.
 *
 * THE FINAL, HOLISTIC FIX:
 * We are switching 'amount' to a z.string() and validating it
 * as a string. This fixes the 'string' vs 'number' type-war.
 * The API will handle the conversion.
 */

// Regex for Cameroon phone numbers (e.g., +237699123456)
const cameroonPhoneRegex = /^\+237[6-8]\d{8}$/;

// Regex for Cameroon vehicle immatriculation (e.g., CE1234AA)
const immatriculationRegex = /^[A-Z0-9]{8}$/i;

// Password regex: min 8 chars, 1 letter, 1 number, 1 special char
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const signupSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),

  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Phone number must be in the format +237XXXXXXXXX',
  }),

  password: z.string().regex(passwordRegex, {
    message:
      'Password must be 8+ chars with a letter, number, and special character.',
  }),
  
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),

  vehicleType: z.string().min(3, 'Vehicle type required'),
  vehicleMake: z.string().min(2, 'Vehicle make required'),
  vehicleModel: z.string().min(2, 'Vehicle model required'),
  vehicleColor: z.string().min(3, 'Vehicle color required'),

  immatriculation: z.string().regex(immatriculationRegex, {
    message: 'Matricule must be 8 characters (e.g., CE1234AA)',
  }),

  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the privacy policy',
  }),
});

export const otpSchema = z.object({
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Phone number must be in the format +237XXXXXXXXX',
  }),
  token: z
    .string()
    .min(6, 'OTP must be 6 digits')
    .max(6, 'OTP must be 6 digits'),
});

// This is a regex to check if a string contains only digits
const numericString = z.string().regex(/^\d+$/, 'Must be a valid number');

// UPDATED SCHEMA FOR WITHDRAWALS
export const withdrawSchema = z.object({
  // THIS IS THE FIX. We validate it as a string.
  amount: numericString
    .min(1, 'Please enter an amount.')
    .refine((val) => Number(val) >= 150, {
      message: 'Minimum withdrawal is 150 XAF',
    }),
  method: z.string().min(1, 'Please select a withdrawal method.'),
  
  withdrawalPhoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Please enter a valid MoMo number in the format +237XXXXXXXXX',
  }),
});

// UPDATED SCHEMA FOR REQUESTING A PAYMENT
export const requestPaymentSchema = z.object({
  // THIS IS THE FIX. We validate it as a string.
  amount: numericString
    .min(1, 'Please enter an amount.')
    .refine((val) => Number(val) >= 150, {
      message: 'Minimum payment is 150 XAF',
    }),
  passengerId: z
    .string()
    .min(6, 'Passenger ID must be at least 6 characters'),
});