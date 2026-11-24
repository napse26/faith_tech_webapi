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
  slotId: string;
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
  newSlotId: string;
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

export interface CreatePoojaDto {
  categoryId: number;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  significance?: string;
  benefits?: string[];
  ritualSteps?: string[];
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
}

export interface UpdatePoojaDto {
  categoryId?: number;
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  significance?: string;
  benefits?: string[];
  ritualSteps?: string[];
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
}

export interface CreatePoojaPackageDto {
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
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
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
  search?: string;
  language?: string;
  deliveryMode?: string;
  isFeatured?: boolean;
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
