import { Prisma, otp_verification } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { otpRepository } from './otp.repository';
import { generateOtp, generateSalt, hashOtp, verifyOtpHash } from '../../common/utils/crypto';
import { maskPhoneNumber } from '../../common/utils/phone';
import { getSmsProvider } from '../../integrations/sms/sms.factory';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  RateLimitError
} from '../../common/errors/app-error';
import { auditService } from '../audit/audit.service';
import { OtpInitiateResult, OtpPurpose, VerifyOtpResult } from './otp.types';

export class OtpService {
  private smsProvider = getSmsProvider();

  /**
   * Encodes salt and HMAC hash into single string: "salt:hash"
   */
  private formatOtpHash(otp: string): string {
    const salt = generateSalt(16);
    const digest = hashOtp(otp, salt);
    return `${salt}:${digest}`;
  }

  /**
   * Verifies candidate OTP against stored "salt:hash"
   */
  private verifyStoredOtpHash(candidateOtp: string, storedHash: string): boolean {
    if (env.USE_SAMPLE_OTP && env.NODE_ENV !== 'production' && candidateOtp === env.DEV_SAMPLE_OTP) {
      return true;
    }
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      return false;
    }
    const [salt, expectedDigest] = parts;
    return verifyOtpHash(candidateOtp, salt, expectedDigest);
  }

  /**
   * Initiates an OTP challenge: generates CSPRNG OTP, calculates HMAC, saves challenge, sends SMS.
   */
  async initiateChallenge(
    phoneNumber: string,
    purpose: OtpPurpose | string = 'LOGIN',
    ipAddress?: string
  ): Promise<OtpInitiateResult> {
    const now = new Date();
    const expirySeconds = env.OTP_EXPIRY_SECONDS || env.OTP_TTL_SECONDS || 300;
    const cooldownSeconds = env.OTP_RESEND_COOLDOWN || env.OTP_RESEND_COOLDOWN_SECONDS || 90;
    const expiresAt = new Date(now.getTime() + expirySeconds * 1000);

    const rawOtp = generateOtp(env.OTP_LENGTH || 4);
    const storedOtpHash = this.formatOtpHash(rawOtp);

    // Supersede any existing pending challenges for this phone and purpose
    const challenge = await prisma.$transaction(async (tx) => {
      await otpRepository.supersedeActiveChallenges(phoneNumber, purpose, tx);
      return otpRepository.createChallenge(
        {
          phoneNumber,
          purpose,
          channel: 'SMS',
          otpHash: storedOtpHash,
          expiresAt
        },
        tx
      );
    });

    // Send through configured SMS provider
    try {
      await this.smsProvider.sendOtp(
        phoneNumber,
        rawOtp,
        `Your DharmaDarshan verification code is ${rawOtp}. Valid for ${Math.floor(expirySeconds / 60)} minutes.`
      );

      await auditService.log({
        phoneNumber,
        eventType: 'OTP_SENT',
        ipAddress,
        status: 'SUCCESS'
      });
    } catch (err: any) {
      await auditService.log({
        phoneNumber,
        eventType: 'OTP_DELIVERY_FAILED',
        ipAddress,
        status: 'FAILED',
        failureReason: err?.message || 'SMS delivery failure'
      });
      // In dev mode, we do not throw if sample OTP is active
      if (env.NODE_ENV === 'production') {
        throw new BadRequestError('Failed to deliver SMS. Please try again.', 'SMS_DELIVERY_FAILED');
      }
    }

    return {
      challengeId: challenge.challenge_id,
      maskedPhoneNumber: maskPhoneNumber(phoneNumber),
      otpLength: env.OTP_LENGTH || 4,
      expiresIn: expirySeconds,
      resendAfter: cooldownSeconds,
      ...(env.USE_SAMPLE_OTP && env.NODE_ENV !== 'production' && { sampleOtp: env.DEV_SAMPLE_OTP || rawOtp })
    };
  }

  /**
   * Verifies an OTP challenge atomically within a caller-provided transaction or stand-alone.
   */
  async verifyChallenge(
    challengeId: string,
    otp: string,
    expectedPurpose?: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<VerifyOtpResult> {
    const challenge = await otpRepository.findByChallengeId(challengeId, tx);

    if (!challenge) {
      throw new NotFoundError('Invalid verification challenge', 'INVALID_CHALLENGE');
    }

    if (challenge.status === 'CONSUMED') {
      throw new ConflictError('OTP has already been used', 'OTP_ALREADY_USED');
    }

    if (challenge.status === 'LOCKED') {
      throw new RateLimitError('Maximum verification attempts exceeded for this OTP', 'OTP_ATTEMPTS_EXCEEDED');
    }

    if (challenge.status !== 'PENDING') {
      throw new BadRequestError('Invalid or expired verification code', 'INVALID_OTP');
    }

    if (expectedPurpose && challenge.purpose !== expectedPurpose && expectedPurpose !== 'AUTHENTICATION') {
      throw new BadRequestError('Verification purpose mismatch', 'PURPOSE_MISMATCH');
    }

    if (challenge.expires_at < new Date()) {
      await tx.otp_verification.update({
        where: { challenge_id: challengeId },
        data: { status: 'EXPIRED', updated_at: new Date() }
      });
      await auditService.log(
        {
          phoneNumber: challenge.phone_number,
          eventType: 'OTP_EXPIRED',
          status: 'FAILED',
          failureReason: 'OTP expired'
        },
        tx
      );
      throw new BadRequestError('OTP has expired', 'OTP_EXPIRED');
    }

    if (challenge.attempts >= (env.OTP_MAX_ATTEMPTS || 5)) {
      throw new RateLimitError('Maximum verification attempts exceeded. Please request a new OTP.', 'OTP_ATTEMPTS_EXCEEDED');
    }

    const isValid = this.verifyStoredOtpHash(otp, challenge.otp_hash);

    if (!isValid) {
      const updated = await otpRepository.incrementAttempts(challengeId, env.OTP_MAX_ATTEMPTS || 5, tx);
      await auditService.log(
        {
          phoneNumber: challenge.phone_number,
          eventType: 'OTP_VERIFICATION_FAILED',
          status: 'FAILED',
          failureReason: `Invalid OTP entry. Attempt ${updated.attempts}/${env.OTP_MAX_ATTEMPTS || 5}`
        },
        tx
      );

      if (updated.attempts >= (env.OTP_MAX_ATTEMPTS || 5)) {
        throw new RateLimitError('Maximum verification attempts exceeded. Please request a new OTP.', 'OTP_ATTEMPTS_EXCEEDED');
      }

      throw new BadRequestError('Invalid verification code entered', 'INVALID_OTP');
    }

    // Atomically mark consumed / verified
    await otpRepository.markVerified(challengeId, tx);

    await auditService.log(
      {
        phoneNumber: challenge.phone_number,
        eventType: 'OTP_VERIFICATION_SUCCESS',
        status: 'SUCCESS'
      },
      tx
    );

    return {
      valid: true,
      phoneNumber: challenge.phone_number,
      purpose: challenge.purpose,
      challengeId: challenge.challenge_id
    };
  }

  /**
   * Resends an OTP challenge subject to cooldown and quota checks.
   */
  async resendOtp(challengeId: string, ipAddress?: string): Promise<OtpInitiateResult> {
    const challenge = await otpRepository.findByChallengeId(challengeId);

    if (!challenge) {
      throw new NotFoundError('Invalid challenge identifier', 'INVALID_CHALLENGE');
    }

    if (challenge.status === 'CONSUMED') {
      throw new ConflictError('Cannot resend code for an already consumed challenge', 'OTP_ALREADY_USED');
    }

    if (challenge.status !== 'PENDING') {
      throw new BadRequestError('Cannot resend code for an inactive or expired challenge', 'CHALLENGE_INACTIVE');
    }

    const cooldownSeconds = env.OTP_RESEND_COOLDOWN || env.OTP_RESEND_COOLDOWN_SECONDS || 90;
    const expirySeconds = env.OTP_EXPIRY_SECONDS || env.OTP_TTL_SECONDS || 300;
    const now = new Date();

    // Check cooldown based on created_at or updated_at
    const lastIssuedAt = challenge.updated_at || challenge.created_at;
    const elapsedSeconds = Math.floor((now.getTime() - lastIssuedAt.getTime()) / 1000);

    if (elapsedSeconds < cooldownSeconds) {
      const remainingWait = cooldownSeconds - elapsedSeconds;
      throw new RateLimitError(
        `Please wait ${remainingWait} seconds before requesting a new OTP`,
        'RESEND_COOLDOWN_ACTIVE'
      );
    }

    if (challenge.resend_count >= 5) {
      throw new RateLimitError('Maximum resend limit reached for this session. Please restart.', 'RESEND_LIMIT_EXCEEDED');
    }

    const rawOtp = generateOtp(env.OTP_LENGTH || 4);
    const storedOtpHash = this.formatOtpHash(rawOtp);
    const expiresAt = new Date(now.getTime() + expirySeconds * 1000);

    await otpRepository.markResent(challengeId, storedOtpHash, expiresAt);

    try {
      await this.smsProvider.sendOtp(
        challenge.phone_number,
        rawOtp,
        `Your new DharmaDarshan verification code is ${rawOtp}. Valid for ${Math.floor(expirySeconds / 60)} minutes.`
      );
      await auditService.log({
        phoneNumber: challenge.phone_number,
        eventType: 'OTP_RESENT',
        ipAddress,
        status: 'SUCCESS'
      });
    } catch (err: any) {
      await auditService.log({
        phoneNumber: challenge.phone_number,
        eventType: 'OTP_DELIVERY_FAILED',
        ipAddress,
        status: 'FAILED',
        failureReason: err?.message || 'SMS resend delivery failed'
      });
      if (env.NODE_ENV === 'production') {
        throw new BadRequestError('Failed to deliver SMS. Please try again.', 'SMS_DELIVERY_FAILED');
      }
    }

    return {
      challengeId: challenge.challenge_id,
      maskedPhoneNumber: maskPhoneNumber(challenge.phone_number),
      otpLength: env.OTP_LENGTH || 4,
      expiresIn: expirySeconds,
      resendAfter: cooldownSeconds,
      ...(env.USE_SAMPLE_OTP && env.NODE_ENV !== 'production' && { sampleOtp: env.DEV_SAMPLE_OTP || rawOtp })
    };
  }
}

export const otpService = new OtpService();
