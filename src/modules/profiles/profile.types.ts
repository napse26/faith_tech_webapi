export type Gender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY' | string;

export interface UserProfileDto {
  userId: string;
  mobileNumber: string;
  email: string | null;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
  fullName: string | null;
  displayName: string | null;
  gender: string | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  country: string | null;
  state: string | null;
  city: string | null;
  timezone: string;
  isProfileComplete: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface UpdateProfileInput {
  fullName?: string | null;
  displayName?: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  preferredLanguage?: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  timezone?: string;
}
