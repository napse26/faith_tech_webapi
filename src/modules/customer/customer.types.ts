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
