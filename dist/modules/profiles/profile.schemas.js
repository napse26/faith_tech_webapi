"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmEmailVerificationSchema = exports.initiateEmailVerificationSchema = exports.profilePhotoUploadSchema = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
const genderEnum = zod_1.z.enum([
    'MALE',
    'FEMALE',
    'NON_BINARY',
    'OTHER',
    'PREFER_NOT_TO_SAY'
]);
exports.updateProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(1).max(100).nullable().optional(),
    displayName: zod_1.z.string().trim().min(1).max(50).nullable().optional(),
    gender: genderEnum.nullable().optional(),
    avatarUrl: zod_1.z.string().url('Invalid URL format for avatar').max(500).nullable().optional(),
    preferredLanguage: zod_1.z.string().trim().min(2).max(10).optional(),
    country: zod_1.z.string().trim().min(1).max(100).nullable().optional(),
    state: zod_1.z.string().trim().min(1).max(100).nullable().optional(),
    city: zod_1.z.string().trim().min(1).max(100).nullable().optional(),
    timezone: zod_1.z.string().trim().min(1).max(100).optional()
}).strict(); // Disallow unknown/injected properties like role, id, etc.
exports.profilePhotoUploadSchema = zod_1.z.object({
    fileType: zod_1.z.enum(['image/jpeg', 'image/png', 'image/webp'], {
        errorMap: () => ({ message: 'Only JPEG, PNG, and WebP images are allowed' })
    }),
    fileSize: zod_1.z.number().max(5 * 1024 * 1024, 'Profile photo must not exceed 5MB'),
    fileName: zod_1.z.string().max(255).optional()
});
exports.initiateEmailVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address format').max(255)
});
exports.confirmEmailVerificationSchema = zod_1.z.object({
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format'),
    otp: zod_1.z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits')
});
