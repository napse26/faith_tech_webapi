import { OtpPurpose, OtpStatus, Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { otpRepository } from './otp.repository';
import { generateOtp, generateSalt, hashOtp, verifyOtpHash } from '../../common/utils/crypto';
import { getSmsProvider } from '../../integrations/sms/sms.factory';
import { BadRequestError } from '../../common/errors/app-error';
import { OtpInitiateResult, VerifyOtpResult } from './otp.types';

export class OtpService {
  private smsProvider = getSmsProvider();

  /**
   * Masks a phone number for safe public display (e.g. "+919876543210" -> "+91******3210")
   */
  public maskDestination(destination: string): string {
    if (destination.length <= 6) return destination;
    const start = destination.slice(0, 3);
    const end = destination.slice(-4);
    return `${start}******${end}`;
  }

  /**
   * Initiates an OTP challenge: generates CSPRNG OTP, calculates HMAC, saves challenge, sends SMS.
   */
  async initiateChallenge(
    destination: string,
    purpose: OtpPurpose,
    userId?: string
  ): Promise<OtpInitiateResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.OTP_TTL_SECONDS * 1000);
    const resendAvailableAt = new Date(now.getTime() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000);

    const rawOtp = generateOtp();
    const salt = generateSalt();
    const otpHash = hashOtp(rawOtp, salt);

    // Run in transaction: supersede existing active challenges and insert new one
    const challenge = await prisma.$transaction(async (tx) => {
      await otpRepository.supersedeActiveChallenges(destination, purpose, tx);
      return otpRepository.createChallenge(
        {
          userId,
          purpose,
          destination,
          otpHash,
          salt,
          expiresAt,
          resendAvailableAt
        },
        tx
      );
    });

    // Send through SMS provider
    await this.smsProvider.sendOtp(
      destination,
      rawOtp,
      `Your FaithTech verification code is ${rawOtp}. Valid for ${Math.floor(env.OTP_TTL_SECONDS / 60)} minutes.`
    );

    return {
      challengeId: challenge.id,
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      resendAvailableAt: challenge.resendAvailableAt,
      expiresAt: challenge.expiresAt,
      maskedDestination: this.maskDestination(destination),
      ...(env.USE_SAMPLE_OTP && env.NODE_ENV !== 'production' && { sampleOtp: env.DEV_SAMPLE_OTP })
    };
  }

  /**
   * Verifies an OTP challenge atomically within a caller-provided transaction or stand-alone.
   */
  async verifyChallenge(
    challengeId: string,
    otp: string,
    expectedPurpose: OtpPurpose,
    tx: Prisma.TransactionClient = prisma
  ): Promise<VerifyOtpResult> {
    const challenge = await otpRepository.findById(challengeId, tx);

    if (!challenge) {
      throw new BadRequestError('Invalid or expired verification code', 'INVALID_OTP');
    }

    if (challenge.status !== OtpStatus.PENDING) {
      throw new BadRequestError('Invalid or expired verification code', 'INVALID_OTP');
    }

    const isPurposeCompatible =
      challenge.purpose === expectedPurpose ||
      expectedPurpose === OtpPurpose.AUTHENTICATION ||
      challenge.purpose === OtpPurpose.AUTHENTICATION;

    if (!isPurposeCompatible) {
      throw new BadRequestError('Verification purpose mismatch', 'PURPOSE_MISMATCH');
    }

    if (challenge.expiresAt < new Date()) {
      await tx.otpChallenge.update({
        where: { id: challengeId },
        data: { status: OtpStatus.EXPIRED }
      });
      throw new BadRequestError('Verification code has expired. Please request a new one.', 'OTP_EXPIRED');
    }

    if (challenge.attemptsCount >= challenge.maxAttempts) {
      throw new BadRequestError(
        'Maximum verification attempts exceeded. Please request a new code.',
        'MAX_ATTEMPTS_EXCEEDED'
      );
    }

    const isValid = verifyOtpHash(otp, challenge.salt, challenge.otpHash);

    if (!isValid) {
      await otpRepository.incrementAttempts(challengeId, tx);
      throw new BadRequestError('Invalid or expired verification code', 'INVALID_OTP');
    }

    // Atomically mark verified
    await otpRepository.markVerified(challengeId, tx);

    return {
      valid: true,
      destination: challenge.destination,
      purpose: challenge.purpose,
      userId: challenge.userId
    };
  }

  /**
   * Resends an OTP challenge subject to cooldown and quota checks.
   */
  async resendOtp(challengeId: string): Promise<OtpInitiateResult> {
    const challenge = await otpRepository.findById(challengeId);

    if (!challenge) {
      throw new BadRequestError('Invalid challenge identifier', 'INVALID_CHALLENGE');
    }

    if (challenge.status !== OtpStatus.PENDING) {
      throw new BadRequestError('Cannot resend code for an inactive or expired challenge', 'CHALLENGE_INACTIVE');
    }

    const now = new Date();
    if (challenge.resendAvailableAt > now) {
      const waitSeconds = Math.ceil((challenge.resendAvailableAt.getTime() - now.getTime()) / 1000);
      throw new BadRequestError(
        `Please wait ${waitSeconds} seconds before requesting a new code`,
        'RESEND_COOLDOWN_ACTIVE'
      );
    }

    if (challenge.resendCount >= 3) {
      throw new BadRequestError('Maximum resend limit reached for this session. Please restart.', 'RESEND_LIMIT_EXCEEDED');
    }

    const rawOtp = generateOtp();
    const salt = generateSalt();
    const otpHash = hashOtp(rawOtp, salt);
    const expiresAt = new Date(now.getTime() + env.OTP_TTL_SECONDS * 1000);
    const resendAvailableAt = new Date(now.getTime() + env.OTP_RESEND_COOLDOWN_SECONDS * 1000);

    const updated = await otpRepository.markResent(
      challengeId,
      otpHash,
      salt,
      expiresAt,
      resendAvailableAt
    );

    await this.smsProvider.sendOtp(
      challenge.destination,
      rawOtp,
      `Your new FaithTech verification code is ${rawOtp}. Valid for ${Math.floor(env.OTP_TTL_SECONDS / 60)} minutes.`
    );

    return {
      challengeId: updated.id,
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      resendAvailableAt: updated.resendAvailableAt,
      expiresAt: updated.expiresAt,
      maskedDestination: this.maskDestination(challenge.destination)
    };
  }
}

export const otpService = new OtpService();
