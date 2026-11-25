import { z } from 'zod';

export const devoteeDetailSchema = z.object({
  name: z.string().min(2).max(100),
  relationship: z.string().max(50).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  gotra: z.string().max(50).optional(),
  rashi: z.string().max(50).optional(),
  nakshatra: z.string().max(50).optional(),
  dateOfBirth: z.string().optional()
});

export const sankalpDetailSchema = z.object({
  sankalpPurpose: z.string().min(2).max(200),
  kuldeviDevta: z.string().max(100).optional(),
  wishes: z.string().max(500).optional(),
  familyGotra: z.string().max(50).optional(),
  specialInstructions: z.string().max(500).optional()
});

export const addonSelectionSchema = z.object({
  addonId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20)
});

export const generateQuoteSchema = z.object({
  poojaId: z.string().uuid(),
  packageId: z.string().uuid(),
  slotId: z.string().uuid().optional(),
  isScheduled: z.boolean().default(true).optional(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  preferredTime: z.string().max(30).optional(),
  deliveryMode: z.enum(['ONLINE', 'TEMPLE', 'HOME']).default('ONLINE'),
  addons: z.array(addonSelectionSchema).optional(),
  devotees: z.array(devoteeDetailSchema).min(1, 'At least 1 devotee is required'),
  sankalpDetails: sankalpDetailSchema.optional()
});

export const addCheckoutFamilyMemberSchema = z.object({
  personName: z.string().min(2).max(100),
  relationship: z.string().max(50).default('FAMILY_MEMBER').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  dateOfBirth: z.string().optional(),
  timeOfBirth: z.string().optional(),
  placeOfBirth: z.string().max(200).optional(),
  gotra: z.string().max(50).optional(),
  rashi: z.string().max(50).optional()
});

export const submitPoojaReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  reviewText: z.string().min(5).max(1000),
  reviewerName: z.string().min(2).max(150).optional(),
  reviewerCity: z.string().max(100).optional()
});

export const createBookingSchema = z.object({
  quoteId: z.string().uuid(),
  customerAddress: z.string().max(500).optional()
});

export const rescheduleBookingSchema = z.object({
  newSlotId: z.string().uuid(),
  reason: z.string().max(500).optional()
});

export const cancelBookingSchema = z.object({
  reason: z.string().min(3).max(500)
});

export const simulatePaymentSchema = z.object({
  paymentMethod: z.string().default('UPI'),
  transactionId: z.string().optional()
});

export const bookingFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

export const poojaProcessStepSchema = z.object({
  stepNumber: z.number().int().positive(),
  title: z.string().min(2).max(150),
  description: z.string().min(5),
  significance: z.string().optional(),
  duration: z.string().optional()
});

// Admin Schemas
export const createPoojaSchema = z.object({
  categoryId: z.number().int().positive(),
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(250),
  shortDescription: z.string().max(500).optional(),
  description: z.string().optional(),
  significance: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  ritualSteps: z.array(z.string()).optional(),
  poojaProcess: z.array(poojaProcessStepSchema).optional(),
  totalParticipants: z.number().int().min(0).optional(),
  samagriInfo: z.string().optional(),
  instructions: z.string().optional(),
  supportedLanguages: z.array(z.string()).optional(),
  deliveryModes: z.array(z.string()).optional(),
  templeName: z.string().max(200).optional(),
  templeLocation: z.string().max(200).optional(),
  imageUrl: z.string().url().max(500).optional(),
  bannerUrl: z.string().url().max(500).optional(),
  durationMinutes: z.number().int().positive().optional(),
  leadTimeHours: z.number().int().min(0).optional(),
  cancellationPolicy: z.string().optional(),
  cancellationCutoffHours: z.number().int().min(0).optional(),
  rescheduleCutoffHours: z.number().int().min(0).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'INACTIVE', 'ARCHIVED']).default('DRAFT').optional(),
  isFeatured: z.boolean().default(false).optional(),
  isScheduled: z.boolean().default(true).optional(),
  tag: z.string().max(100).optional(),
  rating: z.number().min(1).max(5).optional(),
  totalReviews: z.number().int().min(0).optional(),
  galleryImages: z.array(z.object({ url: z.string(), title: z.string() })).optional(),
  includedItems: z.array(z.object({ icon: z.string(), title: z.string(), description: z.string() })).optional(),
  primaryPriestId: z.string().uuid().optional(),
  liveStreamingAvailable: z.boolean().default(true).optional()
});

export const updatePoojaSchema = createPoojaSchema.partial();

export const createPoojaPackageSchema = z.object({
  packageCode: z.enum(['INDIVIDUAL', 'PARTNER', 'FAMILY', 'JOINT_FAMILY_BHOG']).or(z.string()).optional(),
  title: z.string().min(2).max(150),
  description: z.string().optional(),
  price: z.number().positive(),
  discountPrice: z.number().positive().optional(),
  currency: z.string().default('INR').optional(),
  durationMinutes: z.number().int().positive().optional(),
  maxDevotees: z.number().int().positive().default(4).optional(),
  samagriIncluded: z.boolean().default(true).optional(),
  priestLevel: z.string().default('SENIOR_ACHARYA').optional(),
  deliveryMode: z.enum(['ONLINE', 'TEMPLE', 'HOME']).default('ONLINE').optional()
});

export const updatePoojaPackageSchema = createPoojaPackageSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const createPoojaAddonSchema = z.object({
  title: z.string().min(2).max(150),
  description: z.string().optional(),
  price: z.number().positive(),
  maxQuantity: z.number().int().positive().default(10).optional()
});

export const updatePoojaAddonSchema = createPoojaAddonSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const bulkCreateSlotsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Format HH:mm'),
  maxCapacity: z.number().int().positive().default(5).optional(),
  timezone: z.string().default('Asia/Kolkata').optional()
});

export const adminAssignPriestSchema = z.object({
  priestId: z.string().uuid(),
  notes: z.string().max(500).optional()
});

export const adminUpdateBookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED']),
  reason: z.string().max(500).optional()
});

export const adminSetLiveSessionSchema = z.object({
  liveStreamUrl: z.string().url().max(500),
  liveStreamNotes: z.string().max(1000).optional()
});

export const adminProcessRefundSchema = z.object({
  refundAmount: z.number().positive(),
  reason: z.string().max(500).optional()
});
