"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpRepository = exports.OtpRepository = void 0;
const database_1 = require("../../config/database");
class OtpRepository {
    async supersedeActiveChallenges(phoneNumber, purpose, tx = database_1.prisma) {
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
    async createChallenge(data, tx = database_1.prisma) {
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
    async findByChallengeId(challengeId, tx = database_1.prisma) {
        return tx.otp_verification.findUnique({
            where: { challenge_id: challengeId }
        });
    }
    async incrementAttempts(challengeId, maxAttempts = 5, tx = database_1.prisma) {
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
    async markVerified(challengeId, tx = database_1.prisma) {
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
    async markResent(challengeId, otpHash, expiresAt, tx = database_1.prisma) {
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
exports.OtpRepository = OtpRepository;
exports.otpRepository = new OtpRepository();
