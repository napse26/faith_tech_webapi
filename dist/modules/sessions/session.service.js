"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = exports.SessionService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const env_1 = require("../../config/env");
const database_1 = require("../../config/database");
const session_repository_1 = require("./session.repository");
const crypto_1 = require("../../common/utils/crypto");
const app_error_1 = require("../../common/errors/app-error");
const audit_service_1 = require("../audit/audit.service");
class SessionService {
    /**
     * Generates a stateless JWT access token.
     */
    generateAccessToken(userId, sessionId) {
        const tokenId = (0, uuid_1.v4)();
        return jsonwebtoken_1.default.sign({
            sub: userId.toString(),
            sid: sessionId,
            jti: tokenId
        }, env_1.env.JWT_ACCESS_SECRET, {
            algorithm: 'HS256',
            expiresIn: env_1.env.JWT_ACCESS_TOKEN_TTL,
            issuer: env_1.env.JWT_ISSUER,
            audience: env_1.env.JWT_AUDIENCE
        });
    }
    /**
     * Verifies and decodes a JWT access token.
     */
    verifyAccessToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET, {
                algorithms: ['HS256'],
                issuer: env_1.env.JWT_ISSUER,
                audience: env_1.env.JWT_AUDIENCE
            });
            if (!decoded.sub || !decoded.sid) {
                throw new app_error_1.UnauthorizedError('Token is missing required claims', 'INVALID_TOKEN_CLAIMS');
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new app_error_1.UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
            }
            throw new app_error_1.UnauthorizedError('Invalid access token', 'INVALID_ACCESS_TOKEN');
        }
    }
    /**
     * Issues a new access token and refresh token pair and creates a user_sessions record.
     */
    async issueTokenPair(params, tx = database_1.prisma) {
        const rawRefreshToken = (0, crypto_1.generateOpaqueToken)(32);
        const refreshTokenHash = (0, crypto_1.hashToken)(rawRefreshToken);
        const parsedUserId = BigInt(params.userId.toString());
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (env_1.env.REFRESH_TOKEN_TTL_DAYS || 30));
        const session = await session_repository_1.sessionRepository.createSession({
            userId: parsedUserId,
            refreshTokenHash,
            deviceId: params.deviceId,
            deviceType: params.deviceType,
            deviceName: params.deviceName,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            expiresAt
        }, tx);
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
    async rotateRefreshToken(rawRefreshToken, ipAddress, userAgent) {
        const tokenHash = (0, crypto_1.hashToken)(rawRefreshToken);
        const session = await session_repository_1.sessionRepository.findByTokenHash(tokenHash);
        if (!session) {
            throw new app_error_1.UnauthorizedError('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
        }
        // Reuse detection: if the session has already been revoked, token theft or reuse occurred
        if (session.revoked_at !== null) {
            await session_repository_1.sessionRepository.revokeAllUserSessions(session.user_id);
            await audit_service_1.auditService.log({
                userId: session.user_id,
                eventType: 'TOKEN_REUSE_DETECTED',
                ipAddress,
                deviceId: session.device_id || undefined,
                status: 'FAILED',
                failureReason: 'Compromised refresh token reuse detected. All sessions revoked.'
            });
            throw new app_error_1.UnauthorizedError('Compromised refresh token reuse detected. All sessions have been revoked.', 'TOKEN_REUSE_DETECTED');
        }
        if (session.expires_at < new Date()) {
            await session_repository_1.sessionRepository.revokeSession(session.id);
            throw new app_error_1.UnauthorizedError('Refresh token has expired', 'INVALID_REFRESH_TOKEN');
        }
        // Perform atomic rotation
        return database_1.prisma.$transaction(async (tx) => {
            const current = await session_repository_1.sessionRepository.findById(session.id, tx);
            if (!current || current.revoked_at !== null) {
                throw new app_error_1.UnauthorizedError('Refresh token was already revoked', 'INVALID_REFRESH_TOKEN');
            }
            const newRawRefreshToken = (0, crypto_1.generateOpaqueToken)(32);
            const newRefreshTokenHash = (0, crypto_1.hashToken)(newRawRefreshToken);
            const newExpiresAt = new Date();
            newExpiresAt.setDate(newExpiresAt.getDate() + (env_1.env.REFRESH_TOKEN_TTL_DAYS || 30));
            await session_repository_1.sessionRepository.updateRefreshToken(current.id, newRefreshTokenHash, newExpiresAt, tx);
            const newAccessToken = this.generateAccessToken(current.user_id, current.id);
            await audit_service_1.auditService.log({
                userId: current.user_id,
                eventType: 'TOKEN_REFRESHED',
                ipAddress,
                deviceId: current.device_id || undefined,
                status: 'SUCCESS'
            }, tx);
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
    async logout(sessionId, userId) {
        await session_repository_1.sessionRepository.revokeSession(sessionId);
        if (userId) {
            await audit_service_1.auditService.log({
                userId,
                eventType: 'LOGOUT',
                status: 'SUCCESS'
            });
        }
    }
    /**
     * Revokes all active sessions for a user (logout all devices).
     */
    async logoutAll(userId) {
        const parsedUserId = BigInt(userId.toString());
        const count = await session_repository_1.sessionRepository.revokeAllUserSessions(parsedUserId);
        await audit_service_1.auditService.log({
            userId: parsedUserId,
            eventType: 'LOGOUT_ALL',
            status: 'SUCCESS'
        });
        return count;
    }
    /**
     * Lists active sessions for a user.
     */
    async getUserSessions(userId, currentSessionId) {
        const parsedUserId = BigInt(userId.toString());
        const sessions = await session_repository_1.sessionRepository.findActiveUserSessions(parsedUserId);
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
    async revokeUserSession(sessionId, userId) {
        const session = await session_repository_1.sessionRepository.findById(sessionId);
        if (!session) {
            throw new app_error_1.NotFoundError('Session not found', 'SESSION_NOT_FOUND');
        }
        const parsedUserId = BigInt(userId.toString());
        if (session.user_id !== parsedUserId) {
            throw new app_error_1.ForbiddenError('Cannot revoke session belonging to another user', 'FORBIDDEN');
        }
        await session_repository_1.sessionRepository.revokeSession(sessionId);
        await audit_service_1.auditService.log({
            userId: parsedUserId,
            eventType: 'SESSION_REVOKED',
            status: 'SUCCESS'
        });
    }
}
exports.SessionService = SessionService;
exports.sessionService = new SessionService();
