export type PoojaStatus = 'DRAFT' | 'PUBLISHED' | 'INACTIVE' | 'ARCHIVED';

export type PoojaBookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'REFUNDED';

export interface DevoteeDetail {
  profileId?: string | number;
  name: string;
  relationship?: string;
  gender?: string;
  gotra?: string;
  rashi?: string;
  nakshatra?: string;
  dateOfBirth?: string;
}

export interface SankalpDetail {
  sankalpPurpose: string;
  kuldeviDevta?: string;
  wishes?: string;
  familyGotra?: string;
  specialInstructions?: string;
}

export interface AddonItemSelection {
  addonId: string;
  quantity: number;
}

export interface GenerateQuoteDto {
  poojaId: string;
  packageId: string;
  slotId?: string; // Optional for personal/custom poojas
  isScheduled?: boolean; // true = scheduled (slotId required), false = personal
  preferredDate?: string; // For personal pooja (YYYY-MM-DD)
  preferredTime?: string; // For personal pooja (e.g. "07:00 AM" or "18:00:00")
  deliveryMode: string; // 'ONLINE' | 'TEMPLE' | 'HOME'
  addons?: AddonItemSelection[];
  devotees: DevoteeDetail[];
  sankalpDetails?: SankalpDetail;
}

export interface CreateBookingDto {
  quoteId: string;
  customerAddress?: string;
}

export interface RescheduleBookingDto {
  newSlotId?: string;
  preferredDate?: string;
  preferredTime?: string;
  reason?: string;
}

export interface CancelBookingDto {
  reason: string;
}

export interface SimulatePaymentDto {
  paymentMethod?: string;
  transactionId?: string;
}

export interface BookingFeedbackDto {
  rating: number; // 1 - 5
  comment?: string;
}

export interface AddCheckoutFamilyMemberDto {
  personName: string;
  relationship?: string;
  gender?: string;
  dateOfBirth?: string;
  timeOfBirth?: string;
  placeOfBirth?: string;
  gotra?: string;
  rashi?: string;
}

export interface SubmitPoojaReviewDto {
  rating: number; // 1 - 5
  reviewText: string;
  reviewerName?: string;
  reviewerCity?: string;
}

export interface PoojaProcessStep {
  stepNumber: number;
  title: string;
  description: string;
  significance?: string;
  duration?: string;
}

export type PoojaPackageTier = 'INDIVIDUAL' | 'PARTNER' | 'FAMILY' | 'JOINT_FAMILY_BHOG' | string;

export interface CreatePoojaDto {
  categoryId: number;
  title: string;
  slug: string;
  tag?: string;
  shortDescription?: string;
  description?: string;
  significance?: string;
  benefits?: string[];
  ritualSteps?: string[];
  poojaProcess?: PoojaProcessStep[];
  totalParticipants?: number;
  samagriInfo?: string;
  instructions?: string;
  supportedLanguages?: string[];
  deliveryModes?: string[];
  templeName?: string;
  templeLocation?: string;
  imageUrl?: string;
  bannerUrl?: string;
  durationMinutes?: number;
  leadTimeHours?: number;
  cancellationPolicy?: string;
  cancellationCutoffHours?: number;
  rescheduleCutoffHours?: number;
  status?: PoojaStatus;
  isFeatured?: boolean;
  isScheduled?: boolean;
  rating?: number;
  totalReviews?: number;
  galleryImages?: Array<{ url: string; title: string }>;
  includedItems?: Array<{ icon: string; title: string; description: string }>;
  primaryPriestId?: string;
  liveStreamingAvailable?: boolean;
}

export interface UpdatePoojaDto {
  categoryId?: number;
  title?: string;
  slug?: string;
  tag?: string;
  shortDescription?: string;
  description?: string;
  significance?: string;
  benefits?: string[];
  ritualSteps?: string[];
  poojaProcess?: PoojaProcessStep[];
  totalParticipants?: number;
  samagriInfo?: string;
  instructions?: string;
  supportedLanguages?: string[];
  deliveryModes?: string[];
  templeName?: string;
  templeLocation?: string;
  imageUrl?: string;
  bannerUrl?: string;
  durationMinutes?: number;
  leadTimeHours?: number;
  cancellationPolicy?: string;
  cancellationCutoffHours?: number;
  rescheduleCutoffHours?: number;
  status?: PoojaStatus;
  isFeatured?: boolean;
  isScheduled?: boolean;
  rating?: number;
  totalReviews?: number;
  galleryImages?: Array<{ url: string; title: string }>;
  includedItems?: Array<{ icon: string; title: string; description: string }>;
  primaryPriestId?: string;
  liveStreamingAvailable?: boolean;
}

export interface CreatePoojaPackageDto {
  packageCode?: PoojaPackageTier;
  title: string;
  description?: string;
  price: number;
  discountPrice?: number;
  currency?: string;
  durationMinutes?: number;
  maxDevotees?: number;
  samagriIncluded?: boolean;
  priestLevel?: string;
  deliveryMode?: string;
}

export interface UpdatePoojaPackageDto {
  packageCode?: PoojaPackageTier;
  title?: string;
  description?: string;
  price?: number;
  discountPrice?: number;
  currency?: string;
  durationMinutes?: number;
  maxDevotees?: number;
  samagriIncluded?: boolean;
  priestLevel?: string;
  deliveryMode?: string;
  isActive?: boolean;
}

export interface CreatePoojaAddonDto {
  title: string;
  description?: string;
  price: number;
  maxQuantity?: number;
}

export interface UpdatePoojaAddonDto {
  title?: string;
  description?: string;
  price?: number;
  maxQuantity?: number;
  isActive?: boolean;
}

export interface BulkCreateSlotsDto {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxCapacity?: number;
  timezone?: string;
}

export interface AdminAssignPriestDto {
  priestId: string;
  notes?: string;
}

export interface AdminUpdateBookingStatusDto {
  status: PoojaBookingStatus;
  reason?: string;
}

export interface AdminSetLiveSessionDto {
  liveStreamUrl: string;
  liveStreamNotes?: string;
}

export interface AdminProcessRefundDto {
  refundAmount: number;
  reason?: string;
}

export interface PoojaFilterQuery {
  page?: number;
  limit?: number;
  categoryId?: number;
  category?: string; // code or name (e.g., TRENDING, RECOMMENDED, DOSHA_SHANTI)
  search?: string;
  language?: string;
  deliveryMode?: string;
  isFeatured?: boolean;
  isScheduled?: boolean; // Scheduled vs Personal pooja
  liveStreamingOnly?: boolean;
  minRating?: number; // 4.5, 4.8
  sankalpFee?: string; // 'under_1100' | '1100_to_2500' | 'above_2500'
  minPrice?: number;
  maxPrice?: number;
  status?: string;
}

export interface BookingFilterQuery {
  page?: number;
  limit?: number;
  status?: string;
  poojaId?: string;
  priestId?: string;
  fromDate?: string;
  toDate?: string;
}
