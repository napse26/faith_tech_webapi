import { Prisma, Session, SessionStatus } from '@prisma/client';
import { prisma } from '../../config/database';

export class SessionRepository {
  async createSession(
    data: {
      userId: string;
      refreshTokenHash: string;
      familyId?: string;
      deviceId?: string;
      deviceName?: string;
      platform?: string;
      ipAddress?: string;
      userAgent?: string;
      expiresAt: Date;
    },
    tx: Prisma.TransactionClient = prisma
  ): Promise<Session> {
    return tx.session.create({
      data: {
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        familyId: data.familyId,
        deviceId: data.deviceId,
        deviceName: data.deviceName,
        platform: data.platform,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
        status: SessionStatus.ACTIVE
      }
    });
  }

  async findByTokenHash(
    refreshTokenHash: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<Session | null> {
    return tx.session.findUnique({
      where: { refreshTokenHash }
    });
  }

  async findById(id: string, tx: Prisma.TransactionClient = prisma): Promise<Session | null> {
    return tx.session.findUnique({
      where: { id }
    });
  }

  async markRotated(id: string, tx: Prisma.TransactionClient = prisma): Promise<Session> {
    return tx.session.update({
      where: { id },
      data: {
        status: SessionStatus.ROTATED,
        lastActivityAt: new Date()
      }
    });
  }

  async revokeSession(id: string, tx: Prisma.TransactionClient = prisma): Promise<Session> {
    return tx.session.update({
      where: { id },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date()
      }
    });
  }

  async revokeFamily(familyId: string, tx: Prisma.TransactionClient = prisma): Promise<number> {
    const result = await tx.session.updateMany({
      where: {
        familyId,
        status: { in: [SessionStatus.ACTIVE, SessionStatus.ROTATED] }
      },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date()
      }
    });
    return result.count;
  }

  async revokeAllUserSessions(userId: string, tx: Prisma.TransactionClient = prisma): Promise<number> {
    const result = await tx.session.updateMany({
      where: {
        userId,
        status: { in: [SessionStatus.ACTIVE, SessionStatus.ROTATED] }
      },
      data: {
        status: SessionStatus.REVOKED,
        revokedAt: new Date()
      }
    });
    return result.count;
  }
}

export const sessionRepository = new SessionRepository();
