import { z } from 'zod';

export const initiateAuthSchema = z.object({
  mobileNumber: z
    .string({ required_error: 'Mobile number is required' })
    .min(5, 'Mobile number is too short')
    .max(20, 'Mobile number is too long'),
  countryCode: z.string().min(1).max(5).default('+91')
});

export const verifyAuthOtpSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  deviceId: z.string().max(100).optional(),
  deviceName: z.string().max(100).optional(),
  platform: z.enum(['ANDROID', 'IOS', 'WEB', 'UNKNOWN']).optional().default('UNKNOWN')
});

export const resendAuthOtpSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(20)
});
