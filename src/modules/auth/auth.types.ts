export interface DeviceInfo {
  deviceId?: string;
  deviceName?: string;
  platform?: string;
  appVersion?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface UserSummaryDto {
  customerId: number;
  name: string | null;
  phoneNumber: string;
  email?: string | null;
  role: string;
  status: string;
  isMobileVerified: boolean;
  isProfileComplete?: boolean;
}

export interface AuthSuccessData {
  isNewUser: boolean;
  isProfileComplete: boolean;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummaryDto;
}
