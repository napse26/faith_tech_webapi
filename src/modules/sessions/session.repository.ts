import { Prisma, user_sessions } from '@prisma/client';
import { prisma } from '../../config/database';

export class SessionRepository {
  async createSession(
    data: {
      userId: bigint;
      refreshTokenHash: string;
      deviceId?: string;
      deviceType?: string;
      deviceName?: string;
      ipAddress?: string;
      userAgent?: string;
      expiresAt: Date;
    },
    tx: Prisma.TransactionClient = prisma
  ): Promise<user_sessions> {
    return tx.user_sessions.create({
      data: {
        user_id: data.userId,
        refresh_token_hash: data.refreshTokenHash,
        device_id: data.deviceId ? data.deviceId.slice(0, 255) : null,
        device_type: data.deviceType ? data.deviceType.slice(0, 20) : null,
        device_name: data.deviceName ? data.deviceName.slice(0, 255) : null,
        ip_address: data.ipAddress ? data.ipAddress.slice(0, 45) : null,
        user_agent: data.userAgent || null,
        expires_at: data.expiresAt,
        last_active_at: new Date(),
        created_at: new Date()
      }
    });
  }

  async findByTokenHash(
    refreshTokenHash: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<user_sessions | null> {
    return tx.user_sessions.findFirst({
      where: { refresh_token_hash: refreshTokenHash }
    });
  }

  async findById(
    id: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<user_sessions | null> {
    return tx.user_sessions.findUnique({
      where: { id }
    });
  }

  async updateRefreshToken(
    id: string,
    newRefreshTokenHash: string,
    newExpiresAt: Date,
    tx: Prisma.TransactionClient = prisma
  ): Promise<user_sessions> {
    return tx.user_sessions.update({
      where: { id },
      data: {
        refresh_token_hash: newRefreshTokenHash,
        expires_at: newExpiresAt,
        last_active_at: new Date()
      }
    });
  }

  async revokeSession(id: string, tx: Prisma.TransactionClient = prisma): Promise<user_sessions> {
    return tx.user_sessions.update({
      where: { id },
      data: {
        revoked_at: new Date()
      }
    });
  }

  async revokeAllUserSessions(userId: bigint, tx: Prisma.TransactionClient = prisma): Promise<number> {
    const result = await tx.user_sessions.updateMany({
      where: {
        user_id: userId,
        revoked_at: null
      },
      data: {
        revoked_at: new Date()
      }
    });
    return result.count;
  }

  async findActiveUserSessions(userId: bigint, tx: Prisma.TransactionClient = prisma): Promise<user_sessions[]> {
    const now = new Date();
    return tx.user_sessions.findMany({
      where: {
        user_id: userId,
        revoked_at: null,
        expires_at: { gt: now }
      },
      orderBy: {
        last_active_at: 'desc'
      }
    });
  }

  async touchSession(id: string, tx: Prisma.TransactionClient = prisma): Promise<void> {
    await tx.user_sessions.update({
      where: { id },
      data: {
        last_active_at: new Date()
      }
    });
  }
}

export const sessionRepository = new SessionRepository();
