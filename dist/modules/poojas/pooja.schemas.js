"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProcessRefundSchema = exports.adminSetLiveSessionSchema = exports.adminUpdateBookingStatusSchema = exports.adminAssignPriestSchema = exports.bulkCreateSlotsSchema = exports.updatePoojaAddonSchema = exports.createPoojaAddonSchema = exports.updatePoojaPackageSchema = exports.createPoojaPackageSchema = exports.updatePoojaSchema = exports.createPoojaSchema = exports.poojaProcessStepSchema = exports.bookingFeedbackSchema = exports.simulatePaymentSchema = exports.cancelBookingSchema = exports.rescheduleBookingSchema = exports.createBookingSchema = exports.addCheckoutFamilyMemberSchema = exports.generateQuoteSchema = exports.addonSelectionSchema = exports.sankalpDetailSchema = exports.devoteeDetailSchema = void 0;
const zod_1 = require("zod");
exports.devoteeDetailSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    relationship: zod_1.z.string().max(50).optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    gotra: zod_1.z.string().max(50).optional(),
    rashi: zod_1.z.string().max(50).optional(),
    nakshatra: zod_1.z.string().max(50).optional(),
    dateOfBirth: zod_1.z.string().optional()
});
exports.sankalpDetailSchema = zod_1.z.object({
    sankalpPurpose: zod_1.z.string().min(2).max(200),
    kuldeviDevta: zod_1.z.string().max(100).optional(),
    wishes: zod_1.z.string().max(500).optional(),
    familyGotra: zod_1.z.string().max(50).optional(),
    specialInstructions: zod_1.z.string().max(500).optional()
});
exports.addonSelectionSchema = zod_1.z.object({
    addonId: zod_1.z.string().uuid(),
    quantity: zod_1.z.number().int().min(1).max(20)
});
exports.generateQuoteSchema = zod_1.z.object({
    poojaId: zod_1.z.string().uuid(),
    packageId: zod_1.z.string().uuid(),
    slotId: zod_1.z.string().uuid().optional(),
    isScheduled: zod_1.z.boolean().default(true).optional(),
    preferredDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    preferredTime: zod_1.z.string().max(30).optional(),
    deliveryMode: zod_1.z.enum(['ONLINE', 'TEMPLE', 'HOME']).default('ONLINE'),
    addons: zod_1.z.array(exports.addonSelectionSchema).optional(),
    devotees: zod_1.z.array(exports.devoteeDetailSchema).min(1, 'At least 1 devotee is required'),
    sankalpDetails: exports.sankalpDetailSchema.optional()
});
exports.addCheckoutFamilyMemberSchema = zod_1.z.object({
    personName: zod_1.z.string().min(2).max(100),
    relationship: zod_1.z.string().max(50).default('FAMILY_MEMBER').optional(),
    gender: zod_1.z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    dateOfBirth: zod_1.z.string().optional(),
    timeOfBirth: zod_1.z.string().optional(),
    placeOfBirth: zod_1.z.string().max(200).optional(),
    gotra: zod_1.z.string().max(50).optional(),
    rashi: zod_1.z.string().max(50).optional()
});
exports.createBookingSchema = zod_1.z.object({
    quoteId: zod_1.z.string().uuid(),
    customerAddress: zod_1.z.string().max(500).optional()
});
exports.rescheduleBookingSchema = zod_1.z.object({
    newSlotId: zod_1.z.string().uuid(),
    reason: zod_1.z.string().max(500).optional()
});
exports.cancelBookingSchema = zod_1.z.object({
    reason: zod_1.z.string().min(3).max(500)
});
exports.simulatePaymentSchema = zod_1.z.object({
    paymentMethod: zod_1.z.string().default('UPI'),
    transactionId: zod_1.z.string().optional()
});
exports.bookingFeedbackSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().max(500).optional()
});
exports.poojaProcessStepSchema = zod_1.z.object({
    stepNumber: zod_1.z.number().int().positive(),
    title: zod_1.z.string().min(2).max(150),
    description: zod_1.z.string().min(5),
    significance: zod_1.z.string().optional(),
    duration: zod_1.z.string().optional()
});
// Admin Schemas
exports.createPoojaSchema = zod_1.z.object({
    categoryId: zod_1.z.number().int().positive(),
    title: zod_1.z.string().min(3).max(200),
    slug: zod_1.z.string().min(3).max(250),
    shortDescription: zod_1.z.string().max(500).optional(),
    description: zod_1.z.string().optional(),
    significance: zod_1.z.string().optional(),
    benefits: zod_1.z.array(zod_1.z.string()).optional(),
    ritualSteps: zod_1.z.array(zod_1.z.string()).optional(),
    poojaProcess: zod_1.z.array(exports.poojaProcessStepSchema).optional(),
    totalParticipants: zod_1.z.number().int().min(0).optional(),
    samagriInfo: zod_1.z.string().optional(),
    instructions: zod_1.z.string().optional(),
    supportedLanguages: zod_1.z.array(zod_1.z.string()).optional(),
    deliveryModes: zod_1.z.array(zod_1.z.string()).optional(),
    templeName: zod_1.z.string().max(200).optional(),
    templeLocation: zod_1.z.string().max(200).optional(),
    imageUrl: zod_1.z.string().url().max(500).optional(),
    bannerUrl: zod_1.z.string().url().max(500).optional(),
    durationMinutes: zod_1.z.number().int().positive().optional(),
    leadTimeHours: zod_1.z.number().int().min(0).optional(),
    cancellationPolicy: zod_1.z.string().optional(),
    cancellationCutoffHours: zod_1.z.number().int().min(0).optional(),
    rescheduleCutoffHours: zod_1.z.number().int().min(0).optional(),
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'INACTIVE', 'ARCHIVED']).default('DRAFT').optional(),
    isFeatured: zod_1.z.boolean().default(false).optional(),
    isScheduled: zod_1.z.boolean().default(true).optional(),
    tag: zod_1.z.string().max(100).optional(),
    rating: zod_1.z.number().min(1).max(5).optional(),
    totalReviews: zod_1.z.number().int().min(0).optional(),
    galleryImages: zod_1.z.array(zod_1.z.object({ url: zod_1.z.string(), title: zod_1.z.string() })).optional(),
    includedItems: zod_1.z.array(zod_1.z.object({ icon: zod_1.z.string(), title: zod_1.z.string(), description: zod_1.z.string() })).optional(),
    primaryPriestId: zod_1.z.string().uuid().optional(),
    liveStreamingAvailable: zod_1.z.boolean().default(true).optional()
});
exports.updatePoojaSchema = exports.createPoojaSchema.partial();
exports.createPoojaPackageSchema = zod_1.z.object({
    packageCode: zod_1.z.enum(['INDIVIDUAL', 'PARTNER', 'FAMILY', 'JOINT_FAMILY_BHOG']).or(zod_1.z.string()).optional(),
    title: zod_1.z.string().min(2).max(150),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().positive(),
    discountPrice: zod_1.z.number().positive().optional(),
    currency: zod_1.z.string().default('INR').optional(),
    durationMinutes: zod_1.z.number().int().positive().optional(),
    maxDevotees: zod_1.z.number().int().positive().default(4).optional(),
    samagriIncluded: zod_1.z.boolean().default(true).optional(),
    priestLevel: zod_1.z.string().default('SENIOR_ACHARYA').optional(),
    deliveryMode: zod_1.z.enum(['ONLINE', 'TEMPLE', 'HOME']).default('ONLINE').optional()
});
exports.updatePoojaPackageSchema = exports.createPoojaPackageSchema.partial().extend({
    isActive: zod_1.z.boolean().optional()
});
exports.createPoojaAddonSchema = zod_1.z.object({
    title: zod_1.z.string().min(2).max(150),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().positive(),
    maxQuantity: zod_1.z.number().int().positive().default(10).optional()
});
exports.updatePoojaAddonSchema = exports.createPoojaAddonSchema.partial().extend({
    isActive: zod_1.z.boolean().optional()
});
exports.bulkCreateSlotsSchema = zod_1.z.object({
    startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    startTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format HH:mm'),
    endTime: zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format HH:mm'),
    maxCapacity: zod_1.z.number().int().positive().default(5).optional(),
    timezone: zod_1.z.string().default('Asia/Kolkata').optional()
});
exports.adminAssignPriestSchema = zod_1.z.object({
    priestId: zod_1.z.string().uuid(),
    notes: zod_1.z.string().max(500).optional()
});
exports.adminUpdateBookingStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED']),
    reason: zod_1.z.string().max(500).optional()
});
exports.adminSetLiveSessionSchema = zod_1.z.object({
    liveStreamUrl: zod_1.z.string().url().max(500),
    liveStreamNotes: zod_1.z.string().max(1000).optional()
});
exports.adminProcessRefundSchema = zod_1.z.object({
    refundAmount: zod_1.z.number().positive(),
    reason: zod_1.z.string().max(500).optional()
});
