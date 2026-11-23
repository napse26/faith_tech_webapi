"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const database_1 = require("../../config/database");
const phone_1 = require("../../common/utils/phone");
const otp_service_1 = require("../otp/otp.service");
const session_service_1 = require("../sessions/session.service");
const audit_service_1 = require("../audit/audit.service");
const app_error_1 = require("../../common/errors/app-error");
const uuid_1 = require("uuid");
class UserService {
    /**
     * Initiates mobile number change for authenticated user. Dispatches OTP to the NEW mobile number.
     */
    async initiateMobileChange(userId, newMobileNumber, countryCallingCode = '+91') {
        const normalized = (0, phone_1.normalizePhoneNumber)(newMobileNumber, countryCallingCode);
        const parsedUserId = BigInt(userId);
        // Ensure new number is not already used
        const existing = await database_1.prisma.users.findUnique({
            where: { mobile_no: normalized.e164 }
        });
        if (existing && existing.user_id !== parsedUserId) {
            throw new app_error_1.ConflictError('The requested mobile number is already assigned to another account', 'MOBILE_ALREADY_EXISTS');
        }
        const result = await otp_service_1.otpService.initiateChallenge(normalized.e164, 'CHANGE_PHONE');
        return result;
    }
    /**
     * Confirms mobile number change with OTP and updates user record atomically.
     */
    async confirmMobileChange(userId, challengeId, otp) {
        const parsedUserId = BigInt(userId);
        return database_1.prisma.$transaction(async (tx) => {
            const verification = await otp_service_1.otpService.verifyChallenge(challengeId, otp, 'CHANGE_PHONE', tx);
            // Check conflict again inside transaction
            const existing = await tx.users.findUnique({
                where: { mobile_no: verification.phoneNumber }
            });
            if (existing && existing.user_id !== parsedUserId) {
                throw new app_error_1.ConflictError('The requested mobile number is already assigned to another account', 'MOBILE_ALREADY_EXISTS');
            }
            const updatedUser = await tx.users.update({
                where: { user_id: parsedUserId },
                data: {
                    mobile_no: verification.phoneNumber,
                    is_mobile_verified: true,
                    updated_on: new Date()
                }
            });
            await audit_service_1.auditService.log({
                userId: parsedUserId,
                phoneNumber: verification.phoneNumber,
                eventType: 'MOBILE_NUMBER_CHANGED',
                status: 'SUCCESS'
            }, tx);
            return {
                userId: updatedUser.user_id.toString(),
                mobileNumber: updatedUser.mobile_no,
                isMobileVerified: updatedUser.is_mobile_verified
            };
        });
    }
    /**
     * Deactivates the user account and revokes all active sessions.
     */
    async deactivateAccount(userId, reason) {
        const parsedUserId = BigInt(userId);
        return database_1.prisma.$transaction(async (tx) => {
            const user = await tx.users.update({
                where: { user_id: parsedUserId },
                data: {
                    status: 'INACTIVE',
                    is_active: false,
                    updated_on: new Date()
                }
            });
            await session_service_1.sessionService.logoutAll(parsedUserId);
            await audit_service_1.auditService.log({
                userId: parsedUserId,
                phoneNumber: user.mobile_no,
                eventType: 'ACCOUNT_DEACTIVATED',
                status: 'SUCCESS'
            }, tx);
            return {
                userId: user.user_id.toString(),
                status: user.status,
                message: 'Account has been deactivated. You can reactivate anytime by logging in.'
            };
        });
    }
    /**
     * Requests deletion of the user account.
     */
    async requestAccountDeletion(userId, reason) {
        const parsedUserId = BigInt(userId);
        const scheduledPurgeAt = new Date();
        scheduledPurgeAt.setDate(scheduledPurgeAt.getDate() + 30);
        return database_1.prisma.$transaction(async (tx) => {
            const user = await tx.users.update({
                where: { user_id: parsedUserId },
                data: {
                    status: 'DELETION_PENDING',
                    updated_on: new Date()
                }
            });
            await session_service_1.sessionService.logoutAll(parsedUserId);
            await audit_service_1.auditService.log({
                userId: parsedUserId,
                phoneNumber: user.mobile_no,
                eventType: 'ACCOUNT_DELETION_REQUESTED',
                status: 'SUCCESS'
            }, tx);
            return {
                id: (0, uuid_1.v4)(),
                userId,
                status: 'PENDING',
                reason: reason || null,
                scheduledPurgeAt,
                createdAt: new Date(),
                daysRemaining: 30
            };
        });
    }
    /**
     * Cancels a pending account deletion request.
     */
    async cancelAccountDeletion(userId) {
        const parsedUserId = BigInt(userId);
        return database_1.prisma.$transaction(async (tx) => {
            const user = await tx.users.update({
                where: { user_id: parsedUserId },
                data: {
                    status: 'ACTIVE',
                    is_active: true,
                    updated_on: new Date()
                }
            });
            await audit_service_1.auditService.log({
                userId: parsedUserId,
                phoneNumber: user.mobile_no,
                eventType: 'ACCOUNT_DELETION_CANCELLED',
                status: 'SUCCESS'
            }, tx);
            return {
                userId,
                status: user.status,
                message: 'Account deletion has been cancelled. Your account is active.'
            };
        });
    }
    /**
     * Gets deletion status for the user.
     */
    async getDeletionStatus(userId) {
        const parsedUserId = BigInt(userId);
        const user = await database_1.prisma.users.findUnique({
            where: { user_id: parsedUserId }
        });
        if (!user || user.status !== 'DELETION_PENDING') {
            return null;
        }
        const scheduled = new Date(user.updated_on || new Date());
        scheduled.setDate(scheduled.getDate() + 30);
        const now = new Date();
        const daysRemaining = Math.max(0, Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return {
            id: (0, uuid_1.v4)(),
            userId,
            status: 'PENDING',
            reason: null,
            scheduledPurgeAt: scheduled,
            createdAt: user.updated_on || new Date(),
            daysRemaining
        };
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
