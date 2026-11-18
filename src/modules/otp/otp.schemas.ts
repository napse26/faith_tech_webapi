import { z } from 'zod';

export const initiateOtpSchema = z.object({
  mobileNumber: z.string().min(5).max(20),
  countryCode: z.string().min(1).max(5).default('+91')
});

export const verifyOtpSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
});

export const resendOtpSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format')
});
