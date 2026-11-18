import { Prisma, OtpStatus, OtpPurpose, OtpChallenge } from '@prisma/client';
import { prisma } from '../../config/database';

export class OtpRepository {
  async supersedeActiveChallenges(
    destination: string,
    purpose: OtpPurpose,
    tx: Prisma.TransactionClient = prisma
  ): Promise<void> {
    await tx.otpChallenge.updateMany({
      where: {
        destination,
        purpose,
        status: OtpStatus.PENDING
      },
      data: {
        status: OtpStatus.SUPERSEDED
      }
    });
  }

  async createChallenge(
    data: {
      userId?: string;
      purpose: OtpPurpose;
      destination: string;
      otpHash: string;
      salt: string;
      expiresAt: Date;
      resendAvailableAt: Date;
    },
    tx: Prisma.TransactionClient = prisma
  ): Promise<OtpChallenge> {
    return tx.otpChallenge.create({
      data: {
        userId: data.userId || null,
        purpose: data.purpose,
        destination: data.destination,
        otpHash: data.otpHash,
        salt: data.salt,
        status: OtpStatus.PENDING,
        attemptsCount: 0,
        maxAttempts: 5,
        resendCount: 0,
        expiresAt: data.expiresAt,
        resendAvailableAt: data.resendAvailableAt
      }
    });
  }

  async findById(id: string, tx: Prisma.TransactionClient = prisma): Promise<OtpChallenge | null> {
    return tx.otpChallenge.findUnique({
      where: { id }
    });
  }

  async incrementAttempts(
    id: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<OtpChallenge> {
    const challenge = await tx.otpChallenge.update({
      where: { id },
      data: {
        attemptsCount: { increment: 1 }
      }
    });

    if (challenge.attemptsCount >= challenge.maxAttempts) {
      await tx.otpChallenge.update({
        where: { id },
        data: { status: OtpStatus.MAX_ATTEMPTS_EXCEEDED }
      });
    }

    return challenge;
  }

  async markVerified(id: string, tx: Prisma.TransactionClient = prisma): Promise<OtpChallenge> {
    return tx.otpChallenge.update({
      where: { id },
      data: {
        status: OtpStatus.VERIFIED,
        consumedAt: new Date()
      }
    });
  }

  async markResent(
    id: string,
    otpHash: string,
    salt: string,
    expiresAt: Date,
    resendAvailableAt: Date,
    tx: Prisma.TransactionClient = prisma
  ): Promise<OtpChallenge> {
    return tx.otpChallenge.update({
      where: { id },
      data: {
        otpHash,
        salt,
        attemptsCount: 0,
        resendCount: { increment: 1 },
        expiresAt,
        resendAvailableAt
      }
    });
  }
}

export const otpRepository = new OtpRepository();
