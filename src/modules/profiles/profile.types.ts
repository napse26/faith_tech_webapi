import { Gender } from '@prisma/client';

export interface UserProfileDto {
  userId: string;
  mobileNumber: string;
  email: string | null;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
  fullName: string | null;
  displayName: string | null;
  gender: Gender | null;
  avatarUrl: string | null;
  preferredLanguage: string;
  country: string | null;
  state: string | null;
  city: string | null;
  timezone: string;
  isProfileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileInput {
  fullName?: string | null;
  displayName?: string | null;
  gender?: Gender | null;
  avatarUrl?: string | null;
  preferredLanguage?: string;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  timezone?: string;
}
