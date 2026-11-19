import { prisma } from '../../config/database';
import { normalizePhoneNumber } from '../../common/utils/phone';
import { otpService } from '../otp/otp.service';
import { sessionService } from '../sessions/session.service';
import { auditService } from '../audit/audit.service';
import { ConflictError, NotFoundError, BadRequestError } from '../../common/errors/app-error';
import { DeletionRequestDto, MobileChangeInitiateResult } from './user.types';
import { v4 as uuidv4 } from 'uuid';

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
    const parsedUserId = BigInt(userId);

    // Ensure new number is not already used
    const existing = await prisma.users.findUnique({
      where: { mobile_no: normalized.e164 }
    });

    if (existing && existing.user_id !== parsedUserId) {
      throw new ConflictError(
        'The requested mobile number is already assigned to another account',
        'MOBILE_ALREADY_EXISTS'
      );
    }

    const result = await otpService.initiateChallenge(
      normalized.e164,
      'CHANGE_PHONE'
    );

    return result;
  }

  /**
   * Confirms mobile number change with OTP and updates user record atomically.
   */
  async confirmMobileChange(userId: string, challengeId: string, otp: string) {
    const parsedUserId = BigInt(userId);
    return prisma.$transaction(async (tx) => {
      const verification = await otpService.verifyChallenge(
        challengeId,
        otp,
        'CHANGE_PHONE',
        tx
      );

      // Check conflict again inside transaction
      const existing = await tx.users.findUnique({
        where: { mobile_no: verification.phoneNumber }
      });

      if (existing && existing.user_id !== parsedUserId) {
        throw new ConflictError(
          'The requested mobile number is already assigned to another account',
          'MOBILE_ALREADY_EXISTS'
        );
      }

      const updatedUser = await tx.users.update({
        where: { user_id: parsedUserId },
        data: {
          mobile_no: verification.phoneNumber,
          is_mobile_verified: true,
          updated_on: new Date()
        }
      });

      await auditService.log(
        {
          userId: parsedUserId,
          phoneNumber: verification.phoneNumber,
          eventType: 'MOBILE_NUMBER_CHANGED',
          status: 'SUCCESS'
        },
        tx
      );

      return {
        userId: updatedUser.user_id.toString(),
        mobileNumber: updatedUser.mobile_no,
        isMobileVerified: updatedUser.is_mobile_verified
      };
    });
  }

  /**
   * Deactivates the user account and revokes all active sessions.
   */
  async deactivateAccount(userId: string, reason?: string) {
    const parsedUserId = BigInt(userId);
    return prisma.$transaction(async (tx) => {
      const user = await tx.users.update({
        where: { user_id: parsedUserId },
        data: {
          status: 'INACTIVE',
          is_active: false,
          updated_on: new Date()
        }
      });

      await sessionService.logoutAll(parsedUserId);

      await auditService.log(
        {
          userId: parsedUserId,
          phoneNumber: user.mobile_no,
          eventType: 'ACCOUNT_DEACTIVATED',
          status: 'SUCCESS'
        },
        tx
      );

      return {
        userId: user.user_id.toString(),
        status: user.status,
        message: 'Account has been deactivated. You can reactivate anytime by logging in.'
      };
    });
  }

  /**
   * Requests deletion of the user account.
   */
  async requestAccountDeletion(userId: string, reason?: string): Promise<DeletionRequestDto> {
    const parsedUserId = BigInt(userId);
    const scheduledPurgeAt = new Date();
    scheduledPurgeAt.setDate(scheduledPurgeAt.getDate() + 30);

    return prisma.$transaction(async (tx) => {
      const user = await tx.users.update({
        where: { user_id: parsedUserId },
        data: {
          status: 'DELETION_PENDING',
          updated_on: new Date()
        }
      });

      await sessionService.logoutAll(parsedUserId);

      await auditService.log(
        {
          userId: parsedUserId,
          phoneNumber: user.mobile_no,
          eventType: 'ACCOUNT_DELETION_REQUESTED',
          status: 'SUCCESS'
        },
        tx
      );

      return {
        id: uuidv4(),
        userId,
        status: 'PENDING' as const,
        reason: reason || null,
        scheduledPurgeAt,
        createdAt: new Date(),
        daysRemaining: 30
      };
    });
  }

  /**
   * Cancels a pending account deletion request.
   */
  async cancelAccountDeletion(userId: string) {
    const parsedUserId = BigInt(userId);
    return prisma.$transaction(async (tx) => {
      const user = await tx.users.update({
        where: { user_id: parsedUserId },
        data: {
          status: 'ACTIVE',
          is_active: true,
          updated_on: new Date()
        }
      });

      await auditService.log(
        {
          userId: parsedUserId,
          phoneNumber: user.mobile_no,
          eventType: 'ACCOUNT_DELETION_CANCELLED',
          status: 'SUCCESS'
        },
        tx
      );

      return {
        userId,
        status: user.status,
        message: 'Account deletion has been cancelled. Your account is active.'
      };
    });
  }

  /**
   * Gets deletion status for the user.
   */
  async getDeletionStatus(userId: string): Promise<DeletionRequestDto | null> {
    const parsedUserId = BigInt(userId);
    const user = await prisma.users.findUnique({
      where: { user_id: parsedUserId }
    });

    if (!user || user.status !== 'DELETION_PENDING') {
      return null;
    }

    const scheduled = new Date(user.updated_on || new Date());
    scheduled.setDate(scheduled.getDate() + 30);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      id: uuidv4(),
      userId,
      status: 'PENDING',
      reason: null,
      scheduledPurgeAt: scheduled,
      createdAt: user.updated_on || new Date(),
      daysRemaining
    };
  }
}

export const userService = new UserService();
