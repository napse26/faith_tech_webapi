export type AstrologerOnboardingStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACTION_REQUIRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'INACTIVE';

export type VerificationStatus = 'PENDING' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

export interface ApplyAstrologerDto {
  displayName: string;
  legalName?: string;
  gender?: string;
  experienceYears?: number;
  qualification?: string;
  aboutMe?: string;
  astrologyTradition?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  specializationIds?: number[];
  languageIds?: number[];
}

export interface UpdateAstrologerProfileDto {
  displayName?: string;
  legalName?: string;
  gender?: string;
  experienceYears?: number;
  qualification?: string;
  aboutMe?: string;
  astrologyTradition?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
}

export interface UpdateExpertiseDto {
  specializationIds: number[];
  languageIds: number[];
}

export interface AstrologerPricingDto {
  chatRate?: number;
  callRate?: number;
  videoRate?: number;
}

export interface AddQualificationDto {
  qualificationName: string;
  institution: string;
  yearOfCompletion?: number;
  description?: string;
  certificateUrl?: string;
}

export interface UpdateQualificationDto {
  qualificationName?: string;
  institution?: string;
  yearOfCompletion?: number;
  description?: string;
  certificateUrl?: string;
}

export interface UploadDocumentDto {
  documentType: string;
  documentName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

export interface UpdatePayoutDetailsDto {
  payoutMethod?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface WeeklyAvailabilitySlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  slotDurationMinutes?: number;
  isActive?: boolean;
}

export interface SetWeeklyAvailabilityDto {
  slots: WeeklyAvailabilitySlot[];
  timezone?: string;
}

export interface AddDateExceptionDto {
  exceptionDate: string; // YYYY-MM-DD
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface ToggleOnlineStatusDto {
  isOnline: boolean;
  isBusy?: boolean;
}

export interface AdminReviewApplicationDto {
  notes?: string;
}

export interface AdminRequestChangesDto {
  notes: string;
  actionRequiredFields: string[];
}

export interface AdminApproveApplicationDto {
  notes?: string;
  commissionPercentage?: number;
}

export interface AdminRejectApplicationDto {
  reason: string;
  adminNotes?: string;
}

export interface AdminSuspendAstrologerDto {
  reason: string;
}

export interface AdminVerifyDocumentDto {
  status: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
}

export interface AstrologerFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  specializationId?: number;
  languageId?: number;
  gender?: string;
  sortBy?: 'rating' | 'experience' | 'price_asc' | 'price_desc';
  onboardingStatus?: string;
  isOnline?: boolean;
  isFeatured?: boolean;
  isRecommended?: boolean;
}
