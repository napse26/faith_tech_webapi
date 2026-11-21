export interface CustomerWalletDto {
  balance: number;
  currency: string;
}

export interface CustomerProfileDto {
  customerId: string;
  fullName: string | null;
  email: string | null;
  mobileNumber: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  profilePhotoUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  preferredLanguage: string;
  accountStatus: string;
  profileCompletionPercentage: number;
  wallet: CustomerWalletDto;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UpdateCustomerProfileInput {
  fullName?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  preferredLanguage?: string;
}

export interface ProfileStatusDto {
  accountStatus: string;
  profileCompletionPercentage: number;
  missingFields: string[];
  canUseAstrologyServices: boolean;
  wallet: CustomerWalletDto;
}

export interface BirthPlaceDto {
  name: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

export interface BirthProfileDto {
  profileId: string;
  profileName: string;
  relationship: string;
  gender: string | null;
  dateOfBirth: string | null;
  timeOfBirth: string | null;
  birthTimeAccuracy: string;
  birthPlace: BirthPlaceDto;
  isDefault: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CreateBirthProfileInput {
  profileName: string;
  relationship: 'SELF' | 'SPOUSE' | 'CHILD' | 'MOTHER' | 'FATHER' | 'SIBLING' | 'OTHER' | string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string;
  dateOfBirth: string; // YYYY-MM-DD
  timeOfBirth?: string | null; // HH:mm:ss or HH:mm
  birthTimeAccuracy?: 'EXACT' | 'APPROXIMATE' | 'UNKNOWN' | string;
  birthPlace: {
    name: string;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string;
  };
  isDefault?: boolean;
}

export interface UpdateBirthProfileInput extends CreateBirthProfileInput {}

export interface CustomerPreferencesDto {
  language: string;
  preferredAstrologerLanguage: string;
  dailyHoroscopeEnabled: boolean;
  panchangEnabled: boolean;
  festivalAlertsEnabled: boolean;
  preferredZodiacSign: string;
}

export interface NotificationPreferencesDto {
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  marketingNotificationsEnabled: boolean;
  dailyHoroscopeEnabled: boolean;
  festivalAlertsEnabled: boolean;
}

export interface DeviceDto {
  deviceId: string;
  deviceName?: string | null;
  deviceType?: string | null;
  deviceToken?: string | null;
  appVersion?: string | null;
  lastActiveAt?: Date | null;
  createdAt?: Date | null;
  isActive: boolean;
}

export interface SecurityOverviewDto {
  accountStatus: string;
  mobileNumber: string;
  mobileVerified: boolean;
  email: string | null;
  emailVerified: boolean;
  activeSessionsCount: number;
  activeDevicesCount: number;
  currentSessionId: string;
  lastLoginAt: Date | null;
}

// ----------------- Phase 3: Privacy & Lifecycle -----------------
export interface ConsentItemDto {
  consentType: string;
  documentVersion: string;
  isGranted: boolean;
  channel: string | null;
  updatedAt: Date | null;
}

export interface UpdateConsentItemInput {
  consentType: string;
  isGranted: boolean;
  documentVersion?: string;
  channel?: string;
}

export interface UpdateConsentsInput {
  consents: UpdateConsentItemInput[];
}

export interface AcceptConsentInput {
  consentType: string;
  documentVersion?: string;
  channel?: string;
}

export interface PrivacyOverviewDto {
  consents: ConsentItemDto[];
  dataRetentionPolicy: string;
  deletionRequestPending: boolean;
  deletionScheduledAt: Date | null;
}

export interface DeactivateAccountInput {
  reason?: string;
  feedback?: string;
}

export interface DeactivationResultDto {
  status: string;
  message: string;
  deactivatedAt: Date;
}

export interface ReactivateAccountInput {
  note?: string;
}

export interface ReactivationResultDto {
  status: string;
  message: string;
  reactivatedAt: Date;
}

export interface RequestDeletionInput {
  reason?: string;
  feedback?: string;
}

export interface DeletionRequestDto {
  requestId: string;
  status: string;
  reason: string | null;
  scheduledPurgeAt: Date;
  createdAt: Date | null;
  cancellationAllowedUntil: Date;
}

// ----------------- Phase 4: Additional Features -----------------
export interface CreateSupportTicketInput {
  category: string;
  subject: string;
  description: string;
  priority?: string;
}

export interface AddTicketMessageInput {
  message: string;
}

export interface SupportTicketMessageDto {
  messageId: string;
  senderType: string;
  senderId?: string | null;
  message: string;
  createdAt: Date | null;
}

export interface SupportTicketDto {
  ticketId: string;
  ticketNumber: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  messages?: SupportTicketMessageDto[];
}

export interface FavoriteAstrologerDto {
  astrologerId: string;
  displayName: string;
  profileImage: string | null;
  primarySpecialization: string | null;
  languages: string[] | null;
  experienceYears: number | null;
  chatRate: number | null;
  callRate: number | null;
  avgRating: number | null;
  totalReviews: number | null;
  isOnline: boolean;
  favoritedAt: Date | null;
}

export interface RecentAstrologerDto {
  astrologerId: string;
  displayName: string;
  profileImage: string | null;
  primarySpecialization: string | null;
  chatRate: number | null;
  callRate: number | null;
  avgRating: number | null;
  interactionType: string | null;
  lastInteractedAt: Date | null;
}

export interface CustomerActivityItemDto {
  id: string;
  activityType: string;
  description: string;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: Date | null;
}

