"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRepository = exports.SessionRepository = void 0;
const database_1 = require("../../config/database");
class SessionRepository {
    async createSession(data, tx = database_1.prisma) {
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
    async findByTokenHash(refreshTokenHash, tx = database_1.prisma) {
        return tx.user_sessions.findFirst({
            where: { refresh_token_hash: refreshTokenHash }
        });
    }
    async findById(id, tx = database_1.prisma) {
        return tx.user_sessions.findUnique({
            where: { id }
        });
    }
    async updateRefreshToken(id, newRefreshTokenHash, newExpiresAt, tx = database_1.prisma) {
        return tx.user_sessions.update({
            where: { id },
            data: {
                refresh_token_hash: newRefreshTokenHash,
                expires_at: newExpiresAt,
                last_active_at: new Date()
            }
        });
    }
    async revokeSession(id, tx = database_1.prisma) {
        return tx.user_sessions.update({
            where: { id },
            data: {
                revoked_at: new Date()
            }
        });
    }
    async revokeAllUserSessions(userId, tx = database_1.prisma) {
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
    async findActiveUserSessions(userId, tx = database_1.prisma) {
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
    async touchSession(id, tx = database_1.prisma) {
        await tx.user_sessions.update({
            where: { id },
            data: {
                last_active_at: new Date()
            }
        });
    }
}
exports.SessionRepository = SessionRepository;
exports.sessionRepository = new SessionRepository();
