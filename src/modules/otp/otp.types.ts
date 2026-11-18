import { OtpPurpose, OtpStatus } from '@prisma/client';

export interface CreateOtpChallengeParams {
  userId?: string;
  purpose: OtpPurpose;
  destination: string;
}

export interface OtpInitiateResult {
  challengeId: string;
  cooldownSeconds: number;
  resendAvailableAt: Date;
  expiresAt: Date;
  maskedDestination: string;
  isExistingUser?: boolean;
  sampleOtp?: string;
}

export interface VerifyOtpResult {
  valid: boolean;
  destination: string;
  purpose: OtpPurpose;
  userId?: string | null;
}
