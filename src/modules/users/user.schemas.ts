import { z } from 'zod';

export const initiateMobileChangeSchema = z.object({
  newMobileNumber: z
    .string({ required_error: 'New mobile number is required' })
    .min(5, 'Mobile number is too short')
    .max(20, 'Mobile number is too long'),
  countryCode: z.string().min(1).max(5).default('+91')
});

export const confirmMobileChangeSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
});

export const submitDeletionRequestSchema = z.object({
  reason: z.string().max(500).optional(),
  confirmText: z.literal('DELETE MY ACCOUNT', {
    errorMap: () => ({ message: 'Please type "DELETE MY ACCOUNT" to confirm deletion request' })
  })
});
