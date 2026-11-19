import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { sessionRepository } from './session.repository';
import { generateOpaqueToken, hashToken } from '../../common/utils/crypto';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../common/errors/app-error';
import { TokenPair } from './session.types';
import { auditService } from '../audit/audit.service';

export interface JwtPayload {
  sub: string; // userId as string
  sid: string; // sessionId
  jti: string; // token unique identifier
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

export interface SessionDto {
  sessionId: string;
  deviceId: string | null;
  deviceType: string | null;
  deviceName: string | null;
  ipAddress: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export class SessionService {
  /**
   * Generates a stateless JWT access token.
   */
  public generateAccessToken(userId: bigint | string | number, sessionId: string): string {
    const tokenId = uuidv4();
    return jwt.sign(
      {
        sub: userId.toString(),
        sid: sessionId,
        jti: tokenId
      },
      env.JWT_ACCESS_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: env.JWT_ACCESS_TOKEN_TTL as any,
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE
      }
    );
  }

  /**
   * Verifies and decodes a JWT access token.
   */
  public verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
        algorithms: ['HS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE
      }) as JwtPayload;

      if (!decoded.sub || !decoded.sid) {
        throw new UnauthorizedError('Token is missing required claims', 'INVALID_TOKEN_CLAIMS');
      }

      return decoded;
    } catch (error: any) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token', 'INVALID_ACCESS_TOKEN');
    }
  }

  /**
   * Issues a new access token and refresh token pair and creates a user_sessions record.
   */
  async issueTokenPair(
    params: {
      userId: bigint | number | string;
      deviceId?: string;
      deviceType?: string;
      deviceName?: string;
      ipAddress?: string;
      userAgent?: string;
    },
    tx: Prisma.TransactionClient = prisma
  ): Promise<TokenPair> {
    const rawRefreshToken = generateOpaqueToken(32);
    const refreshTokenHash = hashToken(rawRefreshToken);
    const parsedUserId = BigInt(params.userId.toString());

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (env.REFRESH_TOKEN_TTL_DAYS || 30));

    const session = await sessionRepository.createSession(
      {
        userId: parsedUserId,
        refreshTokenHash,
        deviceId: params.deviceId,
        deviceType: params.deviceType,
        deviceName: params.deviceName,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        expiresAt
      },
      tx
    );

    const accessToken = this.generateAccessToken(parsedUserId, session.id);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer'
    };
  }

  /**
   * Rotates a refresh token: verifies hash, detects reuse, and issues a new pair atomically.
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const tokenHash = hashToken(rawRefreshToken);

    const session = await sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }

    // Reuse detection: if the session has already been revoked, token theft or reuse occurred
    if (session.revoked_at !== null) {
      await sessionRepository.revokeAllUserSessions(session.user_id);
      await auditService.log({
        userId: session.user_id,
        eventType: 'TOKEN_REUSE_DETECTED',
        ipAddress,
        deviceId: session.device_id || undefined,
        status: 'FAILED',
        failureReason: 'Compromised refresh token reuse detected. All sessions revoked.'
      });
      throw new UnauthorizedError(
        'Compromised refresh token reuse detected. All sessions have been revoked.',
        'TOKEN_REUSE_DETECTED'
      );
    }

    if (session.expires_at < new Date()) {
      await sessionRepository.revokeSession(session.id);
      throw new UnauthorizedError('Refresh token has expired', 'INVALID_REFRESH_TOKEN');
    }

    // Perform atomic rotation
    return prisma.$transaction(async (tx) => {
      const current = await sessionRepository.findById(session.id, tx);
      if (!current || current.revoked_at !== null) {
        throw new UnauthorizedError('Refresh token was already revoked', 'INVALID_REFRESH_TOKEN');
      }

      const newRawRefreshToken = generateOpaqueToken(32);
      const newRefreshTokenHash = hashToken(newRawRefreshToken);
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + (env.REFRESH_TOKEN_TTL_DAYS || 30));

      await sessionRepository.updateRefreshToken(current.id, newRefreshTokenHash, newExpiresAt, tx);

      const newAccessToken = this.generateAccessToken(current.user_id, current.id);

      await auditService.log(
        {
          userId: current.user_id,
          eventType: 'TOKEN_REFRESHED',
          ipAddress,
          deviceId: current.device_id || undefined,
          status: 'SUCCESS'
        },
        tx
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRawRefreshToken,
        expiresIn: 900,
        tokenType: 'Bearer'
      };
    });
  }

  /**
   * Logs out the current session.
   */
  async logout(sessionId: string, userId?: bigint | string): Promise<void> {
    await sessionRepository.revokeSession(sessionId);
    if (userId) {
      await auditService.log({
        userId,
        eventType: 'LOGOUT',
        status: 'SUCCESS'
      });
    }
  }

  /**
   * Revokes all active sessions for a user (logout all devices).
   */
  async logoutAll(userId: bigint | string): Promise<number> {
    const parsedUserId = BigInt(userId.toString());
    const count = await sessionRepository.revokeAllUserSessions(parsedUserId);
    await auditService.log({
      userId: parsedUserId,
      eventType: 'LOGOUT_ALL',
      status: 'SUCCESS'
    });
    return count;
  }

  /**
   * Lists active sessions for a user.
   */
  async getUserSessions(userId: bigint | string, currentSessionId: string): Promise<SessionDto[]> {
    const parsedUserId = BigInt(userId.toString());
    const sessions = await sessionRepository.findActiveUserSessions(parsedUserId);
    return sessions.map((s) => ({
      sessionId: s.id,
      deviceId: s.device_id,
      deviceType: s.device_type,
      deviceName: s.device_name,
      ipAddress: s.ip_address,
      lastActiveAt: s.last_active_at,
      createdAt: s.created_at,
      isCurrent: s.id === currentSessionId
    }));
  }

  /**
   * Revokes a specific session by ID after verifying user ownership.
   */
  async revokeUserSession(sessionId: string, userId: bigint | string): Promise<void> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found', 'SESSION_NOT_FOUND');
    }

    const parsedUserId = BigInt(userId.toString());
    if (session.user_id !== parsedUserId) {
      throw new ForbiddenError('Cannot revoke session belonging to another user', 'FORBIDDEN');
    }

    await sessionRepository.revokeSession(sessionId);
    await auditService.log({
      userId: parsedUserId,
      eventType: 'SESSION_REVOKED',
      status: 'SUCCESS'
    });
  }
}

export const sessionService = new SessionService();
