import { z } from 'zod';

export const applyAstrologerSchema = z.object({
  displayName: z.string().min(2).max(200),
  legalName: z.string().max(200).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  experienceYears: z.number().int().min(0).max(100).optional(),
  qualification: z.string().max(500).optional(),
  aboutMe: z.string().max(2000).optional(),
  astrologyTradition: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  specializationIds: z.array(z.number().int().positive()).optional(),
  languageIds: z.array(z.number().int().positive()).optional()
});

export const updateAstrologerProfileSchema = z.object({
  displayName: z.string().min(2).max(200).optional(),
  legalName: z.string().max(200).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  experienceYears: z.number().int().min(0).max(100).optional(),
  qualification: z.string().max(500).optional(),
  aboutMe: z.string().max(2000).optional(),
  astrologyTradition: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().max(50).optional()
});

export const updateExpertiseSchema = z.object({
  specializationIds: z.array(z.number().int().positive()),
  languageIds: z.array(z.number().int().positive())
});

export const updateAstrologerPricingSchema = z.object({
  chatRate: z.number().min(0).max(100000).optional(),
  callRate: z.number().min(0).max(100000).optional(),
  videoRate: z.number().min(0).max(100000).optional()
});

export const addQualificationSchema = z.object({
  qualificationName: z.string().min(2).max(200),
  institution: z.string().min(2).max(200),
  yearOfCompletion: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
  description: z.string().max(1000).optional(),
  certificateUrl: z.string().url().max(500).optional()
});

export const updateQualificationSchema = z.object({
  qualificationName: z.string().min(2).max(200).optional(),
  institution: z.string().min(2).max(200).optional(),
  yearOfCompletion: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
  description: z.string().max(1000).optional(),
  certificateUrl: z.string().url().max(500).optional()
});

export const uploadDocumentSchema = z.object({
  documentType: z.string().min(2).max(50),
  documentName: z.string().min(2).max(150),
  fileUrl: z.string().url().max(500),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(50).optional()
});

export const updatePayoutDetailsSchema = z.object({
  payoutMethod: z.enum(['BANK_TRANSFER', 'UPI']).default('BANK_TRANSFER'),
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format').optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Invalid Aadhaar format (must be 12 digits)').optional(),
  accountHolderName: z.string().min(2).max(200).optional(),
  accountNumber: z.string().min(5).max(50).optional(),
  bankName: z.string().min(2).max(200).optional(),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format').optional(),
  upiId: z.string().max(100).optional()
});

export const weeklySlotItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (HH:mm)'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Invalid time format (HH:mm)'),
  slotDurationMinutes: z.number().int().positive().default(15).optional(),
  isActive: z.boolean().default(true).optional()
});

export const setWeeklyAvailabilitySchema = z.object({
  slots: z.array(weeklySlotItemSchema),
  timezone: z.string().max(50).optional()
});

export const addDateExceptionSchema = z.object({
  exceptionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  isAvailable: z.boolean().default(false),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/).optional(),
  reason: z.string().max(200).optional()
});

export const toggleOnlineStatusSchema = z.object({
  isOnline: z.boolean(),
  isBusy: z.boolean().optional()
});

export const updatePhotoSchema = z.object({
  photoType: z.enum(['PROFILE', 'COVER']),
  photoUrl: z.string().url().max(500)
});

export const uploadGalleryImageSchema = z.object({
  imageUrl: z.string().url().max(500).optional(),
  image_url: z.string().url().max(500).optional(),
  caption: z.string().max(255).optional(),
  title: z.string().max(150).optional(),
  displayOrder: z.number().int().min(0).optional(),
  display_order: z.number().int().min(0).optional()
}).refine(data => Boolean(data.imageUrl || data.image_url), {
  message: 'imageUrl or image_url is required',
  path: ['imageUrl']
});

// Admin Schemas
export const adminReviewApplicationSchema = z.object({
  notes: z.string().max(1000).optional()
});

export const adminRequestChangesSchema = z.object({
  notes: z.string().min(5).max(1000),
  actionRequiredFields: z.array(z.string().min(1)).min(1)
});

export const adminApproveApplicationSchema = z.object({
  notes: z.string().max(1000).optional(),
  commissionPercentage: z.number().min(0).max(100).optional()
});

export const adminRejectApplicationSchema = z.object({
  reason: z.string().min(5).max(1000),
  adminNotes: z.string().max(1000).optional()
});

export const adminSuspendAstrologerSchema = z.object({
  reason: z.string().min(5).max(1000)
});

export const adminVerifyDocumentSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED']),
  rejectionReason: z.string().max(500).optional()
});

export const createAstrologerServiceSchema = z.object({
  serviceMasterId: z.number().int().positive(),
  status: z.number().int().min(0).max(1).default(1).optional()
});

export const updateAstrologerServiceSchema = z.object({
  status: z.number().int().min(0).max(1)
});
