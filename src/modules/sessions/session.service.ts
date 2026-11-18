import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, SessionStatus } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { sessionRepository } from './session.repository';
import { generateOpaqueToken, hashToken } from '../../common/utils/crypto';
import { UnauthorizedError } from '../../common/errors/app-error';
import { CreateSessionParams, JwtPayload, TokenPair } from './session.types';
import { auditService } from '../audit/audit.service';

export class SessionService {
  /**
   * Generates a stateless JWT access token.
   */
  public generateAccessToken(userId: string, sessionId: string): string {
    const tokenId = uuidv4();
    return jwt.sign(
      {
        sub: userId,
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
   * Issues a new access token and refresh token pair and creates a Session record.
   */
  async issueTokenPair(
    params: CreateSessionParams,
    familyId?: string,
    tx: Prisma.TransactionClient = prisma
  ): Promise<TokenPair> {
    const rawRefreshToken = generateOpaqueToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const resolvedFamilyId = familyId || uuidv4();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);

    const session = await sessionRepository.createSession(
      {
        userId: params.userId,
        refreshTokenHash,
        familyId: resolvedFamilyId,
        deviceId: params.deviceId,
        deviceName: params.deviceName,
        platform: params.platform,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        expiresAt
      },
      tx
    );

    const accessToken = this.generateAccessToken(params.userId, session.id);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900, // 15 minutes
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

    // Check for REUSE of already rotated token
    if (session.status === SessionStatus.ROTATED) {
      // Must commit revocation immediately to prevent further abuse of the compromised family
      await sessionRepository.revokeFamily(session.familyId);
      await auditService.log({
        userId: session.userId,
        action: 'SESSION_REUSE_DETECTED',
        resource: 'SESSION',
        ipAddress,
        userAgent,
        metadata: { familyId: session.familyId, sessionId: session.id }
      });
      throw new UnauthorizedError(
        'Compromised refresh token reuse detected. All sessions in this chain have been revoked.',
        'TOKEN_REUSE_DETECTED'
      );
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new UnauthorizedError('Refresh token is no longer active', 'TOKEN_REVOKED');
    }

    if (session.expiresAt < new Date()) {
      await sessionRepository.revokeSession(session.id);
      throw new UnauthorizedError('Refresh token has expired', 'TOKEN_EXPIRED');
    }

    return prisma.$transaction(async (tx) => {
      // Re-verify inside transaction to prevent concurrency race
      const current = await sessionRepository.findById(session.id, tx);
      if (!current || current.status !== SessionStatus.ACTIVE) {
        throw new UnauthorizedError('Refresh token was already consumed', 'TOKEN_ALREADY_ROTATED');
      }

      // Mark old session as ROTATED
      await sessionRepository.markRotated(current.id, tx);

      // Issue new token pair preserving the same familyId
      const newTokens = await this.issueTokenPair(
        {
          userId: current.userId,
          deviceId: current.deviceId || undefined,
          deviceName: current.deviceName || undefined,
          platform: current.platform || undefined,
          ipAddress,
          userAgent
        },
        current.familyId,
        tx
      );

      return newTokens;
    });
  }

  /**
   * Logs out the current session.
   */
  async logout(sessionId: string): Promise<void> {
    await sessionRepository.revokeSession(sessionId);
  }

  /**
   * Revokes all active sessions for a user (logout all devices).
   */
  async logoutAll(userId: string): Promise<number> {
    return sessionRepository.revokeAllUserSessions(userId);
  }
}

export const sessionService = new SessionService();
