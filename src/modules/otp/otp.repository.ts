import { Prisma, otp_verification } from '@prisma/client';
import { prisma } from '../../config/database';

export class OtpRepository {
  async supersedeActiveChallenges(
    phoneNumber: string,
    purpose: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<void> {
    await tx.otp_verification.updateMany({
      where: {
        phone_number: phoneNumber,
        purpose,
        status: 'PENDING'
      },
      data: {
        status: 'EXPIRED',
        updated_at: new Date()
      }
    });
  }

  async createChallenge(
    data: {
      phoneNumber: string;
      purpose: string;
      channel?: string;
      otpHash: string;
      expiresAt: Date;
    },
    tx: Prisma.TransactionClient = prisma
  ): Promise<otp_verification> {
    return tx.otp_verification.create({
      data: {
        phone_number: data.phoneNumber,
        purpose: data.purpose,
        channel: data.channel || 'SMS',
        otp_hash: data.otpHash,
        status: 'PENDING',
        attempts: 0,
        resend_count: 0,
        expires_at: data.expiresAt,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  async findByChallengeId(
    challengeId: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<otp_verification | null> {
    return tx.otp_verification.findUnique({
      where: { challenge_id: challengeId }
    });
  }

  async incrementAttempts(
    challengeId: string,
    maxAttempts = 5,
    tx: Prisma.TransactionClient = prisma
  ): Promise<otp_verification> {
    const record = await tx.otp_verification.update({
      where: { challenge_id: challengeId },
      data: {
        attempts: { increment: 1 },
        updated_at: new Date()
      }
    });

    if (record.attempts >= maxAttempts) {
      return tx.otp_verification.update({
        where: { challenge_id: challengeId },
        data: {
          status: 'LOCKED',
          updated_at: new Date()
        }
      });
    }

    return record;
  }

  async markVerified(
    challengeId: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<otp_verification> {
    const now = new Date();
    return tx.otp_verification.update({
      where: { challenge_id: challengeId },
      data: {
        status: 'CONSUMED',
        verified_at: now,
        consumed_at: now,
        updated_at: now
      }
    });
  }

  async markResent(
    challengeId: string,
    otpHash: string,
    expiresAt: Date,
    tx: Prisma.TransactionClient = prisma
  ): Promise<otp_verification> {
    return tx.otp_verification.update({
      where: { challenge_id: challengeId },
      data: {
        otp_hash: otpHash,
        attempts: 0,
        resend_count: { increment: 1 },
        expires_at: expiresAt,
        updated_at: new Date()
      }
    });
  }
}

export const otpRepository = new OtpRepository();
