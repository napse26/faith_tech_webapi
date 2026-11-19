import { z } from 'zod';

export const initiateAuthSchema = z
  .object({
    phoneNumber: z.string().min(5).max(25).optional(),
    mobileNumber: z.string().min(5).max(25).optional(),
    countryCode: z.string().min(1).max(6).optional().default('+91'),
    purpose: z.enum(['LOGIN', 'REGISTER', 'CHANGE_PHONE', 'ACCOUNT_RECOVERY', 'AUTHENTICATION']).optional().default('LOGIN'),
    channel: z.enum(['SMS', 'WHATSAPP']).optional().default('SMS')
  })
  .refine((data) => data.phoneNumber || data.mobileNumber, {
    message: 'Either phoneNumber or mobileNumber must be provided',
    path: ['phoneNumber']
  });

export const verifyAuthOtpSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format'),
  otp: z.string().regex(/^\d{4,6}$/, 'OTP must be 4 or 6 digits'),
  device: z
    .object({
      deviceId: z.string().max(255).optional(),
      deviceName: z.string().max(255).optional(),
      platform: z.string().max(50).optional(),
      appVersion: z.string().max(50).optional()
    })
    .optional(),
  deviceId: z.string().max(255).optional(),
  deviceName: z.string().max(255).optional(),
  platform: z.string().max(50).optional()
});

export const resendAuthOtpSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format')
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(10)
});

export const changeMobileSendOtpSchema = z
  .object({
    newPhoneNumber: z.string().min(5).max(25).optional(),
    phoneNumber: z.string().min(5).max(25).optional(),
    countryCode: z.string().min(1).max(6).optional().default('+91')
  })
  .refine((data) => data.newPhoneNumber || data.phoneNumber, {
    message: 'Either newPhoneNumber or phoneNumber must be provided',
    path: ['newPhoneNumber']
  });

export const changeMobileVerifyOtpSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format'),
  otp: z.string().regex(/^\d{4,6}$/, 'OTP must be 4 or 6 digits')
});
