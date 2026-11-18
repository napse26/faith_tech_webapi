import { UserStatus } from '@prisma/client';
import { TokenPair } from '../sessions/session.types';

export interface UserSummaryDto {
  id: string;
  mobileNumber: string;
  countryCode: string;
  email: string | null;
  status: UserStatus;
  isMobileVerified: boolean;
  isEmailVerified: boolean;
  isProfileComplete: boolean;
}

export interface AuthSuccessDto {
  user: UserSummaryDto;
  tokens: TokenPair;
  isNewUser?: boolean;
}

export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  ipAddress?: string;
  userAgent?: string;
}
