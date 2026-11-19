export type DeletionStatus = 'PENDING' | 'CANCELLED' | 'COMPLETED';

export interface MobileChangeInitiateResult {
  challengeId: string;
  maskedPhoneNumber: string;
  otpLength: number;
  expiresIn: number;
  resendAfter: number;
  sampleOtp?: string;
}

export interface DeletionRequestDto {
  id: string;
  userId: string;
  status: DeletionStatus;
  reason: string | null;
  scheduledPurgeAt: Date;
  createdAt: Date;
  daysRemaining: number;
}
