import { OtpPurpose, UserStatus, DeletionStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { normalizePhoneNumber } from '../../common/utils/phone';
import { otpService } from '../otp/otp.service';
import { sessionService } from '../sessions/session.service';
import { auditService } from '../audit/audit.service';
import { ConflictError, NotFoundError, BadRequestError } from '../../common/errors/app-error';
import { DeletionRequestDto, MobileChangeInitiateResult } from './user.types';

export class UserService {
  /**
   * Initiates mobile number change for authenticated user. Dispatches OTP to the NEW mobile number.
   */
  async initiateMobileChange(
    userId: string,
    newMobileNumber: string,
    countryCallingCode = '+91'
  ): Promise<MobileChangeInitiateResult> {
    const normalized = normalizePhoneNumber(newMobileNumber, countryCallingCode);

    // Ensure new number is not already used
    const existing = await prisma.user.findUnique({
      where: { mobileNumber: normalized.e164 }
    });

    if (existing) {
      throw new ConflictError(
        'The requested mobile number is already assigned to another account',
        'MOBILE_ALREADY_EXISTS'
      );
    }

    return otpService.initiateChallenge(
      normalized.e164,
      OtpPurpose.MOBILE_CHANGE,
      userId
    );
  }

  /**
   * Confirms mobile number change with OTP and updates user record atomically.
   */
  async confirmMobileChange(userId: string, challengeId: string, otp: string) {
    return prisma.$transaction(async (tx) => {
      const verification = await otpService.verifyChallenge(
        challengeId,
        otp,
        OtpPurpose.MOBILE_CHANGE,
        tx
      );

      // Verify the challenge belongs to this user
      if (verification.userId && verification.userId !== userId) {
        throw new BadRequestError('Challenge verification token does not match active session', 'UNAUTHORIZED_CHALLENGE');
      }

      // Check conflict again inside transaction
      const existing = await tx.user.findUnique({
        where: { mobileNumber: verification.destination }
      });

      if (existing && existing.id !== userId) {
        throw new ConflictError('Mobile number is already registered to another account', 'MOBILE_ALREADY_EXISTS');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          mobileNumber: verification.destination,
          isMobileVerified: true
        }
      });

      await auditService.log(
        {
          userId,
          action: 'MOBILE_CHANGED',
          resource: 'USER',
          metadata: { newMobileNumber: verification.destination }
        },
        tx
      );

      return {
        userId: updated.id,
        mobileNumber: updated.mobileNumber,
        isMobileVerified: updated.isMobileVerified
      };
    });
  }

  /**
   * Deactivates the user account and immediately terminates all active sessions.
   */
  async deactivateAccount(userId: string, ip?: string, ua?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.DEACTIVATED }
      });

      await sessionService.logoutAll(userId);

      await auditService.log(
        {
          userId,
          action: 'ACCOUNT_DEACTIVATED',
          resource: 'USER',
          ipAddress: ip,
          userAgent: ua
        },
        tx
      );
    });
  }

  /**
   * Submits an account deletion request with a 30-day grace period and logs out sessions.
   */
  async submitDeletionRequest(
    userId: string,
    reason?: string,
    ip?: string,
    ua?: string
  ): Promise<DeletionRequestDto> {
    return prisma.$transaction(async (tx) => {
      // Check if an existing pending deletion request exists
      const existing = await tx.accountDeletionRequest.findFirst({
        where: { userId, status: DeletionStatus.PENDING }
      });

      if (existing) {
        const daysRemaining = Math.max(
          0,
          Math.ceil((existing.scheduledPurgeAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        );
        return {
          id: existing.id,
          userId: existing.userId,
          status: existing.status,
          reason: existing.reason,
          scheduledPurgeAt: existing.scheduledPurgeAt,
          createdAt: existing.createdAt,
          daysRemaining
        };
      }

      const scheduledPurgeAt = new Date();
      scheduledPurgeAt.setDate(scheduledPurgeAt.getDate() + 30); // 30-day grace period

      const request = await tx.accountDeletionRequest.create({
        data: {
          userId,
          reason,
          scheduledPurgeAt,
          status: DeletionStatus.PENDING
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.DELETION_PENDING }
      });

      await sessionService.logoutAll(userId);

      await auditService.log(
        {
          userId,
          action: 'ACCOUNT_DELETION_REQUESTED',
          resource: 'ACCOUNT_DELETION_REQUEST',
          ipAddress: ip,
          userAgent: ua,
          metadata: { scheduledPurgeAt, reason }
        },
        tx
      );

      return {
        id: request.id,
        userId: request.userId,
        status: request.status,
        reason: request.reason,
        scheduledPurgeAt: request.scheduledPurgeAt,
        createdAt: request.createdAt,
        daysRemaining: 30
      };
    });
  }

  /**
   * Retrieves the current pending deletion request status for the authenticated user.
   */
  async getCurrentDeletionRequest(userId: string): Promise<DeletionRequestDto> {
    const request = await prisma.accountDeletionRequest.findFirst({
      where: { userId, status: DeletionStatus.PENDING },
      orderBy: { createdAt: 'desc' }
    });

    if (!request) {
      throw new NotFoundError('No active deletion request found', 'DELETION_REQUEST_NOT_FOUND');
    }

    const daysRemaining = Math.max(
      0,
      Math.ceil((request.scheduledPurgeAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );

    return {
      id: request.id,
      userId: request.userId,
      status: request.status,
      reason: request.reason,
      scheduledPurgeAt: request.scheduledPurgeAt,
      createdAt: request.createdAt,
      daysRemaining
    };
  }
}

export const userService = new UserService();
