export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'CHANGE_PHONE' | 'ACCOUNT_RECOVERY' | 'AUTHENTICATION';

export type OtpStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'LOCKED'
  | 'CONSUMED'
  | 'DELIVERY_FAILED'
  | 'SUPERSEDED'
  | 'MAX_ATTEMPTS_EXCEEDED';

export interface CreateOtpChallengeParams {
  phoneNumber: string;
  purpose: OtpPurpose | string;
  channel?: string;
  ipAddress?: string;
}

export interface OtpInitiateResult {
  challengeId: string;
  maskedPhoneNumber: string;
  otpLength: number;
  expiresIn: number;
  resendAfter: number;
  sampleOtp?: string;
  isExistingUser?: boolean;
}

export interface VerifyOtpResult {
  valid: boolean;
  phoneNumber: string;
  purpose: string;
  challengeId: string;
}
