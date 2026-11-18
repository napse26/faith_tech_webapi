import { DeletionStatus } from '@prisma/client';

export interface MobileChangeInitiateResult {
  challengeId: string;
  cooldownSeconds: number;
  resendAvailableAt: Date;
  expiresAt: Date;
  maskedDestination: string;
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
