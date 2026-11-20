import { z } from 'zod';

export const updateCustomerProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email('Invalid email address format').optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be in YYYY-MM-DD format').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  preferredLanguage: z.string().trim().min(2).max(10).optional()
});

export const birthPlaceSchema = z.object({
  name: z.string().trim().min(1, 'Birth place name is required').max(150),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  timezone: z.string().trim().max(50).optional().default('Asia/Kolkata')
});

export const createBirthProfileSchema = z.object({
  profileName: z.string().trim().min(1, 'Profile name is required').max(100),
  relationship: z.enum(['SELF', 'SPOUSE', 'CHILD', 'MOTHER', 'FATHER', 'SIBLING', 'OTHER']).default('SELF'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be in YYYY-MM-DD format'),
  timeOfBirth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'timeOfBirth must be in HH:mm or HH:mm:ss format').optional().nullable(),
  birthTimeAccuracy: z.enum(['EXACT', 'APPROXIMATE', 'UNKNOWN']).default('EXACT'),
  birthPlace: birthPlaceSchema,
  isDefault: z.boolean().optional().default(false)
});

export const updateBirthProfileSchema = createBirthProfileSchema;

export const setDefaultBirthProfileSchema = z.object({
  isDefault: z.boolean().default(true)
});

export const initiateMobileChangeSchema = z.object({
  newMobileNumber: z.string().trim().min(5).max(20)
});

export const verifyMobileChangeSchema = z.object({
  verificationId: z.string().uuid('Invalid verification reference format').optional(),
  challengeId: z.string().uuid('Invalid challenge ID format').optional(),
  otp: z.string().regex(/^\d{4,6}$/, 'OTP must be 4 to 6 digits')
}).refine(data => data.verificationId || data.challengeId, {
  message: 'Either verificationId or challengeId is required',
  path: ['verificationId']
});

export const initiateEmailVerificationSchema = z.object({
  email: z.string().trim().email('Invalid email address')
});

export const verifyEmailVerificationSchema = z.object({
  verificationId: z.string().uuid('Invalid verification reference format').optional(),
  challengeId: z.string().uuid('Invalid challenge ID format').optional(),
  verificationCode: z.string().regex(/^\d{4,6}$/, 'Verification code must be 4 to 6 digits').optional(),
  otp: z.string().regex(/^\d{4,6}$/, 'OTP must be 4 to 6 digits').optional()
}).refine(data => (data.verificationId || data.challengeId) && (data.verificationCode || data.otp), {
  message: 'Verification ID and code are required'
});

export const updateCustomerPreferencesSchema = z.object({
  language: z.string().trim().min(2).max(10).optional(),
  preferredAstrologerLanguage: z.string().trim().min(2).max(10).optional(),
  dailyHoroscopeEnabled: z.boolean().optional(),
  panchangEnabled: z.boolean().optional(),
  festivalAlertsEnabled: z.boolean().optional(),
  preferredZodiacSign: z.enum([
    'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
    'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'
  ]).optional()
});

export const updateNotificationPreferencesSchema = z.object({
  pushEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  marketingNotificationsEnabled: z.boolean().optional(),
  dailyHoroscopeEnabled: z.boolean().optional(),
  festivalAlertsEnabled: z.boolean().optional()
});
