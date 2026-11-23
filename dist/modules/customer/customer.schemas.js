"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTicketMessageSchema = exports.createSupportTicketSchema = exports.requestDeletionSchema = exports.reactivateAccountSchema = exports.deactivateAccountSchema = exports.acceptConsentSchema = exports.updateConsentsSchema = exports.updateConsentItemSchema = exports.updateNotificationPreferencesSchema = exports.updateCustomerPreferencesSchema = exports.verifyEmailVerificationSchema = exports.initiateEmailVerificationSchema = exports.verifyMobileChangeSchema = exports.initiateMobileChangeSchema = exports.setDefaultBirthProfileSchema = exports.updateBirthProfileSchema = exports.createBirthProfileSchema = exports.birthPlaceSchema = exports.updateCustomerProfileSchema = void 0;
const zod_1 = require("zod");
exports.updateCustomerProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(1).max(100).optional(),
    email: zod_1.z.string().trim().email('Invalid email address format').optional(),
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be in YYYY-MM-DD format').optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
    preferredLanguage: zod_1.z.string().trim().min(2).max(10).optional()
});
exports.birthPlaceSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1, 'Birth place name is required').max(150),
    latitude: zod_1.z.number().min(-90).max(90).optional().nullable(),
    longitude: zod_1.z.number().min(-180).max(180).optional().nullable(),
    timezone: zod_1.z.string().trim().max(50).optional().default('Asia/Kolkata')
});
exports.createBirthProfileSchema = zod_1.z.object({
    profileName: zod_1.z.string().trim().min(1, 'Profile name is required').max(100),
    relationship: zod_1.z.enum(['SELF', 'SPOUSE', 'CHILD', 'MOTHER', 'FATHER', 'SIBLING', 'OTHER']).default('SELF'),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    dateOfBirth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be in YYYY-MM-DD format'),
    timeOfBirth: zod_1.z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'timeOfBirth must be in HH:mm or HH:mm:ss format').optional().nullable(),
    birthTimeAccuracy: zod_1.z.enum(['EXACT', 'APPROXIMATE', 'UNKNOWN']).default('EXACT'),
    birthPlace: exports.birthPlaceSchema,
    isDefault: zod_1.z.boolean().optional().default(false)
});
exports.updateBirthProfileSchema = exports.createBirthProfileSchema;
exports.setDefaultBirthProfileSchema = zod_1.z.object({
    isDefault: zod_1.z.boolean().default(true)
});
exports.initiateMobileChangeSchema = zod_1.z.object({
    newMobileNumber: zod_1.z.string().trim().min(5).max(20)
});
exports.verifyMobileChangeSchema = zod_1.z.object({
    verificationId: zod_1.z.string().uuid('Invalid verification reference format').optional(),
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format').optional(),
    otp: zod_1.z.string().regex(/^\d{4,6}$/, 'OTP must be 4 to 6 digits')
}).refine(data => data.verificationId || data.challengeId, {
    message: 'Either verificationId or challengeId is required',
    path: ['verificationId']
});
exports.initiateEmailVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email('Invalid email address')
});
exports.verifyEmailVerificationSchema = zod_1.z.object({
    verificationId: zod_1.z.string().uuid('Invalid verification reference format').optional(),
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format').optional(),
    verificationCode: zod_1.z.string().regex(/^\d{4,6}$/, 'Verification code must be 4 to 6 digits').optional(),
    otp: zod_1.z.string().regex(/^\d{4,6}$/, 'OTP must be 4 to 6 digits').optional()
}).refine(data => (data.verificationId || data.challengeId) && (data.verificationCode || data.otp), {
    message: 'Verification ID and code are required'
});
exports.updateCustomerPreferencesSchema = zod_1.z.object({
    language: zod_1.z.string().trim().min(2).max(10).optional(),
    preferredAstrologerLanguage: zod_1.z.string().trim().min(2).max(10).optional(),
    dailyHoroscopeEnabled: zod_1.z.boolean().optional(),
    panchangEnabled: zod_1.z.boolean().optional(),
    festivalAlertsEnabled: zod_1.z.boolean().optional(),
    preferredZodiacSign: zod_1.z.enum([
        'ARIES', 'TAURUS', 'GEMINI', 'CANCER', 'LEO', 'VIRGO',
        'LIBRA', 'SCORPIO', 'SAGITTARIUS', 'CAPRICORN', 'AQUARIUS', 'PISCES'
    ]).optional()
});
exports.updateNotificationPreferencesSchema = zod_1.z.object({
    pushEnabled: zod_1.z.boolean().optional(),
    whatsappEnabled: zod_1.z.boolean().optional(),
    smsEnabled: zod_1.z.boolean().optional(),
    emailEnabled: zod_1.z.boolean().optional(),
    marketingNotificationsEnabled: zod_1.z.boolean().optional(),
    dailyHoroscopeEnabled: zod_1.z.boolean().optional(),
    festivalAlertsEnabled: zod_1.z.boolean().optional()
});
// ----------------- Phase 3: Privacy & Lifecycle -----------------
exports.updateConsentItemSchema = zod_1.z.object({
    consentType: zod_1.z.string().trim().min(1).max(50),
    isGranted: zod_1.z.boolean(),
    documentVersion: zod_1.z.string().trim().max(20).optional().default('1.0'),
    channel: zod_1.z.string().trim().max(30).optional().default('APP')
});
exports.updateConsentsSchema = zod_1.z.object({
    consents: zod_1.z.array(exports.updateConsentItemSchema).min(1, 'At least one consent item is required')
});
exports.acceptConsentSchema = zod_1.z.object({
    consentType: zod_1.z.string().trim().min(1).max(50),
    documentVersion: zod_1.z.string().trim().max(20).optional().default('1.0'),
    channel: zod_1.z.string().trim().max(30).optional().default('APP')
});
exports.deactivateAccountSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().max(255).optional(),
    feedback: zod_1.z.string().trim().max(1000).optional()
});
exports.reactivateAccountSchema = zod_1.z.object({
    note: zod_1.z.string().trim().max(255).optional()
});
exports.requestDeletionSchema = zod_1.z.object({
    reason: zod_1.z.string().trim().max(255).optional(),
    feedback: zod_1.z.string().trim().max(1000).optional()
});
// ----------------- Phase 4: Additional Features -----------------
exports.createSupportTicketSchema = zod_1.z.object({
    category: zod_1.z.enum(['ACCOUNT', 'PAYMENT', 'KUNDLI', 'CONSULTATION', 'APP_ISSUE', 'OTHER']).default('ACCOUNT'),
    subject: zod_1.z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
    description: zod_1.z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
    priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM')
});
exports.addTicketMessageSchema = zod_1.z.object({
    message: zod_1.z.string().trim().min(1, 'Message cannot be empty').max(3000)
});
