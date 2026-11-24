"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAstrologerServiceSchema = exports.createAstrologerServiceSchema = exports.adminVerifyDocumentSchema = exports.adminSuspendAstrologerSchema = exports.adminRejectApplicationSchema = exports.adminApproveApplicationSchema = exports.adminRequestChangesSchema = exports.adminReviewApplicationSchema = exports.updatePhotoSchema = exports.toggleOnlineStatusSchema = exports.addDateExceptionSchema = exports.setWeeklyAvailabilitySchema = exports.weeklySlotItemSchema = exports.updatePayoutDetailsSchema = exports.uploadDocumentSchema = exports.updateQualificationSchema = exports.addQualificationSchema = exports.updateAstrologerPricingSchema = exports.updateExpertiseSchema = exports.updateAstrologerProfileSchema = exports.applyAstrologerSchema = void 0;
const zod_1 = require("zod");
exports.applyAstrologerSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(2).max(200),
    legalName: zod_1.z.string().max(200).optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    experienceYears: zod_1.z.number().int().min(0).max(100).optional(),
    qualification: zod_1.z.string().max(500).optional(),
    aboutMe: zod_1.z.string().max(2000).optional(),
    astrologyTradition: zod_1.z.string().max(100).optional(),
    city: zod_1.z.string().max(100).optional(),
    state: zod_1.z.string().max(100).optional(),
    country: zod_1.z.string().max(100).optional(),
    timezone: zod_1.z.string().max(50).optional(),
    specializationIds: zod_1.z.array(zod_1.z.number().int().positive()).optional(),
    languageIds: zod_1.z.array(zod_1.z.number().int().positive()).optional()
});
exports.updateAstrologerProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(2).max(200).optional(),
    legalName: zod_1.z.string().max(200).optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    experienceYears: zod_1.z.number().int().min(0).max(100).optional(),
    qualification: zod_1.z.string().max(500).optional(),
    aboutMe: zod_1.z.string().max(2000).optional(),
    astrologyTradition: zod_1.z.string().max(100).optional(),
    city: zod_1.z.string().max(100).optional(),
    state: zod_1.z.string().max(100).optional(),
    country: zod_1.z.string().max(100).optional(),
    timezone: zod_1.z.string().max(50).optional()
});
exports.updateExpertiseSchema = zod_1.z.object({
    specializationIds: zod_1.z.array(zod_1.z.number().int().positive()),
    languageIds: zod_1.z.array(zod_1.z.number().int().positive())
});
exports.updateAstrologerPricingSchema = zod_1.z.object({
    chatRate: zod_1.z.number().min(0).max(100000).optional(),
    callRate: zod_1.z.number().min(0).max(100000).optional(),
    videoRate: zod_1.z.number().min(0).max(100000).optional()
});
exports.addQualificationSchema = zod_1.z.object({
    qualificationName: zod_1.z.string().min(2).max(200),
    institution: zod_1.z.string().min(2).max(200),
    yearOfCompletion: zod_1.z.number().int().min(1950).max(new Date().getFullYear()).optional(),
    description: zod_1.z.string().max(1000).optional(),
    certificateUrl: zod_1.z.string().url().max(500).optional()
});
exports.updateQualificationSchema = zod_1.z.object({
    qualificationName: zod_1.z.string().min(2).max(200).optional(),
    institution: zod_1.z.string().min(2).max(200).optional(),
    yearOfCompletion: zod_1.z.number().int().min(1950).max(new Date().getFullYear()).optional(),
    description: zod_1.z.string().max(1000).optional(),
    certificateUrl: zod_1.z.string().url().max(500).optional()
});
exports.uploadDocumentSchema = zod_1.z.object({
    documentType: zod_1.z.string().min(2).max(50),
    documentName: zod_1.z.string().min(2).max(150),
    fileUrl: zod_1.z.string().url().max(500),
    fileSize: zod_1.z.number().int().positive().optional(),
    mimeType: zod_1.z.string().max(50).optional()
});
exports.updatePayoutDetailsSchema = zod_1.z.object({
    payoutMethod: zod_1.z.enum(['BANK_TRANSFER', 'UPI']).default('BANK_TRANSFER'),
    panNumber: zod_1.z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional(),
    aadhaarNumber: zod_1.z.string().regex(/^\d{12}$/, 'Invalid Aadhaar format (must be 12 digits)').optional(),
    accountHolderName: zod_1.z.string().min(2).max(200).optional(),
    accountNumber: zod_1.z.string().min(5).max(50).optional(),
    bankName: zod_1.z.string().min(2).max(200).optional(),
    ifscCode: zod_1.z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format').optional(),
    upiId: zod_1.z.string().max(100).optional()
});
exports.weeklySlotItemSchema = zod_1.z.object({
    dayOfWeek: zod_1.z.number().int().min(0).max(6),
    startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (HH:mm)'),
    endTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (HH:mm)'),
    slotDurationMinutes: zod_1.z.number().int().positive().default(15).optional(),
    isActive: zod_1.z.boolean().default(true).optional()
});
exports.setWeeklyAvailabilitySchema = zod_1.z.object({
    slots: zod_1.z.array(exports.weeklySlotItemSchema),
    timezone: zod_1.z.string().max(50).optional()
});
exports.addDateExceptionSchema = zod_1.z.object({
    exceptionDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    isAvailable: zod_1.z.boolean().default(false),
    startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).optional(),
    endTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).optional(),
    reason: zod_1.z.string().max(200).optional()
});
exports.toggleOnlineStatusSchema = zod_1.z.object({
    isOnline: zod_1.z.boolean(),
    isBusy: zod_1.z.boolean().optional()
});
exports.updatePhotoSchema = zod_1.z.object({
    photoType: zod_1.z.enum(['PROFILE', 'COVER']),
    photoUrl: zod_1.z.string().url().max(500)
});
// Admin Schemas
exports.adminReviewApplicationSchema = zod_1.z.object({
    notes: zod_1.z.string().max(1000).optional()
});
exports.adminRequestChangesSchema = zod_1.z.object({
    notes: zod_1.z.string().min(5).max(1000),
    actionRequiredFields: zod_1.z.array(zod_1.z.string().min(1)).min(1)
});
exports.adminApproveApplicationSchema = zod_1.z.object({
    notes: zod_1.z.string().max(1000).optional(),
    commissionPercentage: zod_1.z.number().min(0).max(100).optional()
});
exports.adminRejectApplicationSchema = zod_1.z.object({
    reason: zod_1.z.string().min(5).max(1000),
    adminNotes: zod_1.z.string().max(1000).optional()
});
exports.adminSuspendAstrologerSchema = zod_1.z.object({
    reason: zod_1.z.string().min(5).max(1000)
});
exports.adminVerifyDocumentSchema = zod_1.z.object({
    status: zod_1.z.enum(['VERIFIED', 'REJECTED']),
    rejectionReason: zod_1.z.string().max(500).optional()
});
exports.createAstrologerServiceSchema = zod_1.z.object({
    serviceMasterId: zod_1.z.number().int().positive(),
    status: zod_1.z.number().int().min(0).max(1).default(1).optional()
});
exports.updateAstrologerServiceSchema = zod_1.z.object({
    status: zod_1.z.number().int().min(0).max(1)
});
