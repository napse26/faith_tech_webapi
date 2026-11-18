import { z } from 'zod';

const genderEnum = z.enum([
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'OTHER',
  'PREFER_NOT_TO_SAY'
]);

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(100).nullable().optional(),
  displayName: z.string().trim().min(1).max(50).nullable().optional(),
  gender: genderEnum.nullable().optional(),
  avatarUrl: z.string().url('Invalid URL format for avatar').max(500).nullable().optional(),
  preferredLanguage: z.string().trim().min(2).max(10).optional(),
  country: z.string().trim().min(1).max(100).nullable().optional(),
  state: z.string().trim().min(1).max(100).nullable().optional(),
  city: z.string().trim().min(1).max(100).nullable().optional(),
  timezone: z.string().trim().min(1).max(100).optional()
}).strict(); // Disallow unknown/injected properties like role, id, etc.

export const profilePhotoUploadSchema = z.object({
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Only JPEG, PNG, and WebP images are allowed' })
  }),
  fileSize: z.number().max(5 * 1024 * 1024, 'Profile photo must not exceed 5MB'),
  fileName: z.string().max(255).optional()
});

export const initiateEmailVerificationSchema = z.object({
  email: z.string().email('Invalid email address format').max(255)
});

export const confirmEmailVerificationSchema = z.object({
  challengeId: z.string().uuid('Invalid challenge ID format'),
  otp: z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits')
});
