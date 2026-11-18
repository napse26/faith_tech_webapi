import { OtpPurpose, UserStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { normalizePhoneNumber } from '../../common/utils/phone';
import { otpService } from '../otp/otp.service';
import { sessionService } from '../sessions/session.service';
import { auditService } from '../audit/audit.service';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/app-error';
import { AuthSuccessDto, DeviceInfo, UserSummaryDto } from './auth.types';
import { OtpInitiateResult } from '../otp/otp.types';
import { TokenPair } from '../sessions/session.types';

export class AuthService {
  /**
   * Initiates the signup OTP verification flow.
   */
  async initiateSignup(
    mobileNumber: string,
    countryCallingCode = '+91'
  ): Promise<OtpInitiateResult> {
    const normalized = normalizePhoneNumber(mobileNumber, countryCallingCode);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { mobileNumber: normalized.e164 }
    });

    // If user exists and is active, we still dispatch or proceed with login OTP flow seamlessly
    // to provide good UX without user enumeration
    const purpose = existingUser ? OtpPurpose.LOGIN : OtpPurpose.SIGNUP;

    return otpService.initiateChallenge(normalized.e164, purpose, existingUser?.id);
  }

  /**
   * Verifies the signup OTP challenge, creates user & profile, and establishes a session transactionally.
   */
  async verifySignupOtp(
    challengeId: string,
    otp: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthSuccessDto> {
    return prisma.$transaction(async (tx) => {
      // Verify OTP challenge atomically
      const verification = await otpService.verifyChallenge(
        challengeId,
        otp,
        OtpPurpose.SIGNUP,
        tx
      );

      // Create or fetch existing user
      let user = await tx.user.findUnique({
        where: { mobileNumber: verification.destination },
        include: { profile: true }
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            mobileNumber: verification.destination,
            isMobileVerified: true,
            status: UserStatus.ACTIVE,
            profile: {
              create: {
                isProfileComplete: false
              }
            }
          },
          include: { profile: true }
        });
      } else if (!user.isMobileVerified) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { isMobileVerified: true },
          include: { profile: true }
        });
      }

      // Create session and issue tokens
      const tokens = await sessionService.issueTokenPair(
        {
          userId: user.id,
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          platform: deviceInfo.platform,
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent
        },
        undefined,
        tx
      );

      // Log audit
      await auditService.log(
        {
          userId: user.id,
          action: 'AUTH_SIGNUP_SUCCESS',
          resource: 'USER',
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          metadata: { mobileNumber: user.mobileNumber }
        },
        tx
      );

      const userSummary: UserSummaryDto = {
        id: user.id,
        mobileNumber: user.mobileNumber,
        countryCode: user.countryCode,
        email: user.email,
        status: user.status,
        isMobileVerified: user.isMobileVerified,
        isEmailVerified: user.isEmailVerified,
        isProfileComplete: user.profile?.isProfileComplete ?? false
      };

      return { user: userSummary, tokens };
    });
  }

  /**
   * Initiates the login OTP verification flow.
   */
  async initiateLogin(
    mobileNumber: string,
    countryCallingCode = '+91'
  ): Promise<OtpInitiateResult> {
    const normalized = normalizePhoneNumber(mobileNumber, countryCallingCode);

    const user = await prisma.user.findUnique({
      where: { mobileNumber: normalized.e164 }
    });

    if (user && user.status === UserStatus.BLOCKED) {
      throw new ForbiddenError('This account has been suspended', 'ACCOUNT_BLOCKED');
    }

    // Always initiate OTP challenge (creates consistent timing / anti-enumeration)
    return otpService.initiateChallenge(normalized.e164, OtpPurpose.LOGIN, user?.id);
  }

  /**
   * Verifies login OTP, handles account states (reactivates deactivated or deletion-pending), and issues session.
   */
  async verifyLoginOtp(
    challengeId: string,
    otp: string,
    deviceInfo: DeviceInfo
  ): Promise<AuthSuccessDto> {
    return prisma.$transaction(async (tx) => {
      const verification = await otpService.verifyChallenge(
        challengeId,
        otp,
        OtpPurpose.LOGIN,
        tx
      );

      let user = await tx.user.findUnique({
        where: { mobileNumber: verification.destination },
        include: { profile: true }
      });

      if (!user) {
        // If not registered, create as seamless onboarding
        user = await tx.user.create({
          data: {
            mobileNumber: verification.destination,
            isMobileVerified: true,
            status: UserStatus.ACTIVE,
            profile: {
              create: {
                isProfileComplete: false
              }
            }
          },
          include: { profile: true }
        });
      }

      if (user.status === UserStatus.BLOCKED) {
        throw new ForbiddenError('Account is suspended or blocked', 'ACCOUNT_BLOCKED');
      }

      // Reactivate if deactivated or deletion-pending
      if (user.status === UserStatus.DEACTIVATED || user.status === UserStatus.DELETION_PENDING) {
        user = await tx.user.update({
          where: { id: user.id },
          data: { status: UserStatus.ACTIVE },
          include: { profile: true }
        });

        // Cancel pending deletion requests if any
        await tx.accountDeletionRequest.updateMany({
          where: { userId: user.id, status: 'PENDING' },
          data: { status: 'CANCELLED' }
        });
      }

      const tokens = await sessionService.issueTokenPair(
        {
          userId: user.id,
          deviceId: deviceInfo.deviceId,
          deviceName: deviceInfo.deviceName,
          platform: deviceInfo.platform,
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent
        },
        undefined,
        tx
      );

      await auditService.log(
        {
          userId: user.id,
          action: 'AUTH_LOGIN_SUCCESS',
          resource: 'USER',
          ipAddress: deviceInfo.ipAddress,
          userAgent: deviceInfo.userAgent,
          metadata: { mobileNumber: user.mobileNumber }
        },
        tx
      );

      const userSummary: UserSummaryDto = {
        id: user.id,
        mobileNumber: user.mobileNumber,
        countryCode: user.countryCode,
        email: user.email,
        status: user.status,
        isMobileVerified: user.isMobileVerified,
        isEmailVerified: user.isEmailVerified,
        isProfileComplete: user.profile?.isProfileComplete ?? false
      };

      return { user: userSummary, tokens };
    });
  }

  /**
   * Resends an OTP challenge.
   */
  async resendOtp(challengeId: string): Promise<OtpInitiateResult> {
    return otpService.resendOtp(challengeId);
  }

  /**
   * Refreshes access token and rotates refresh token.
   */
  async refreshToken(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    return sessionService.rotateRefreshToken(rawRefreshToken, ipAddress, userAgent);
  }

  /**
   * Logs out the current session.
   */
  async logout(sessionId: string, userId?: string, ip?: string, ua?: string): Promise<void> {
    await sessionService.logout(sessionId);
    if (userId) {
      await auditService.log({
        userId,
        action: 'AUTH_LOGOUT',
        resource: 'SESSION',
        ipAddress: ip,
        userAgent: ua,
        metadata: { sessionId }
      });
    }
  }

  /**
   * Logs out all active sessions for the user.
   */
  async logoutAll(userId: string, ip?: string, ua?: string): Promise<number> {
    const count = await sessionService.logoutAll(userId);
    await auditService.log({
      userId,
      action: 'AUTH_LOGOUT_ALL',
      resource: 'SESSION',
      ipAddress: ip,
      userAgent: ua,
      metadata: { revokedSessionsCount: count }
    });
    return count;
  }
}

export const authService = new AuthService();
