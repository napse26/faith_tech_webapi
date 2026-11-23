"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const database_1 = require("../../config/database");
const phone_1 = require("../../common/utils/phone");
const otp_service_1 = require("../otp/otp.service");
const session_service_1 = require("../sessions/session.service");
const audit_service_1 = require("../audit/audit.service");
const app_error_1 = require("../../common/errors/app-error");
class AuthService {
    /**
     * Send OTP: supports mobile login/signup for new and existing customers.
     */
    async sendOtp(mobileNumber, countryCallingCode = '+91', purpose = 'LOGIN', channel = 'SMS', ipAddress) {
        const normalized = (0, phone_1.normalizePhoneNumber)(mobileNumber, countryCallingCode);
        const existingUser = await database_1.prisma.users.findUnique({
            where: { mobile_no: normalized.e164 }
        });
        const result = await otp_service_1.otpService.initiateChallenge(normalized.e164, purpose, ipAddress);
        return {
            ...result,
            isExistingUser: !!existingUser
        };
    }
    /**
     * Verify OTP flow:
     * - If user exists: validates status, updates verification, creates session & tokens (isNewUser: false).
     * - If user does not exist: creates user, assigns CUSTOMER role, creates customer_details, creates session & tokens (isNewUser: true).
     */
    async verifyOtp(challengeId, otp, deviceInfo) {
        return database_1.prisma.$transaction(async (tx) => {
            const verification = await otp_service_1.otpService.verifyChallenge(challengeId, otp, undefined, tx);
            let user = await tx.users.findUnique({
                where: { mobile_no: verification.phoneNumber },
                include: {
                    user_roles: {
                        include: { roles: true }
                    },
                    customer_details_customer_details_user_idTousers: true
                }
            });
            let isNewUser = false;
            let primaryRole = 'CUSTOMER';
            if (!user) {
                // Customer does not exist: create user record
                isNewUser = true;
                user = await tx.users.create({
                    data: {
                        mobile_no: verification.phoneNumber,
                        country_code: verification.phoneNumber.startsWith('+91') ? '+91' : '+91',
                        is_mobile_verified: true,
                        status: 'ACTIVE',
                        is_active: true
                    },
                    include: {
                        user_roles: {
                            include: { roles: true }
                        },
                        customer_details_customer_details_user_idTousers: true
                    }
                });
                // Assign default CUSTOMER role (role_id = 1)
                await tx.user_roles.create({
                    data: {
                        user_id: user.user_id,
                        role_id: 1
                    }
                });
                // Create empty customer profile
                await tx.customer_details.create({
                    data: {
                        user_id: user.user_id
                    }
                });
                primaryRole = 'CUSTOMER';
                await audit_service_1.auditService.log({
                    userId: user.user_id,
                    phoneNumber: user.mobile_no,
                    eventType: 'LOGIN_SUCCESS',
                    ipAddress: deviceInfo.ipAddress,
                    deviceId: deviceInfo.deviceId,
                    status: 'SUCCESS'
                }, tx);
            }
            else {
                // Existing customer: validate account status
                const status = user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE');
                if (status === 'BLOCKED') {
                    throw new app_error_1.ForbiddenError('Account has been blocked. Please contact support.', 'ACCOUNT_BLOCKED');
                }
                if (status === 'SUSPENDED') {
                    throw new app_error_1.ForbiddenError('Account is suspended. Please contact support.', 'ACCOUNT_SUSPENDED');
                }
                // Mark mobile as verified if not already
                if (!user.is_mobile_verified) {
                    await tx.users.update({
                        where: { user_id: user.user_id },
                        data: { is_mobile_verified: true }
                    });
                }
                primaryRole = user.user_roles[0]?.roles?.role_name || 'CUSTOMER';
                await audit_service_1.auditService.log({
                    userId: user.user_id,
                    phoneNumber: user.mobile_no,
                    eventType: 'LOGIN_SUCCESS',
                    ipAddress: deviceInfo.ipAddress,
                    deviceId: deviceInfo.deviceId,
                    status: 'SUCCESS'
                }, tx);
            }
            // Create authenticated device session & token pair
            const tokens = await session_service_1.sessionService.issueTokenPair({
                userId: user.user_id,
                deviceId: deviceInfo.deviceId,
                deviceType: deviceInfo.platform,
                deviceName: deviceInfo.deviceName,
                ipAddress: deviceInfo.ipAddress,
                userAgent: deviceInfo.userAgent
            }, tx);
            const customerProfile = user.customer_details_customer_details_user_idTousers;
            const customerName = user.full_name ||
                (customerProfile?.first_name ? `${customerProfile.first_name} ${customerProfile.last_name || ''}`.trim() : null);
            const isProfileComplete = !!(customerName && customerProfile?.gender && customerProfile?.date_of_birth);
            const userSummary = {
                customerId: Number(user.user_id),
                name: customerName,
                phoneNumber: user.mobile_no,
                email: user.email || null,
                role: primaryRole,
                status: user.status || 'ACTIVE',
                isMobileVerified: user.is_mobile_verified ?? true,
                isProfileComplete
            };
            return {
                isNewUser,
                isProfileComplete,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                tokenType: 'Bearer',
                expiresIn: 900,
                user: userSummary
            };
        });
    }
    /**
     * Resend OTP subject to cooldown and max attempts
     */
    async resendOtp(challengeId, ipAddress) {
        return otp_service_1.otpService.resendOtp(challengeId, ipAddress);
    }
    /**
     * Refresh Token rotation with reuse detection
     */
    async refreshToken(refreshToken, ipAddress, userAgent) {
        return session_service_1.sessionService.rotateRefreshToken(refreshToken, ipAddress, userAgent);
    }
    /**
     * Logout current session
     */
    async logout(sessionId, userId) {
        await session_service_1.sessionService.logout(sessionId, userId);
    }
    /**
     * Logout from all devices
     */
    async logoutAll(userId) {
        return session_service_1.sessionService.logoutAll(userId);
    }
    /**
     * Get current authenticated user details
     */
    async getCurrentUser(userId) {
        const parsedUserId = BigInt(userId.toString());
        const user = await database_1.prisma.users.findUnique({
            where: { user_id: parsedUserId },
            include: {
                user_roles: {
                    include: { roles: true }
                },
                customer_details_customer_details_user_idTousers: true
            }
        });
        if (!user) {
            throw new app_error_1.NotFoundError('User not found', 'USER_NOT_FOUND');
        }
        const customerProfile = user.customer_details_customer_details_user_idTousers;
        const customerName = user.full_name ||
            (customerProfile?.first_name ? `${customerProfile.first_name} ${customerProfile.last_name || ''}`.trim() : null);
        const primaryRole = user.user_roles[0]?.roles?.role_name || 'CUSTOMER';
        const isProfileComplete = !!(customerName && customerProfile?.gender && customerProfile?.date_of_birth);
        return {
            customerId: Number(user.user_id),
            name: customerName,
            phoneNumber: user.mobile_no,
            email: user.email || null,
            role: primaryRole,
            status: user.status || 'ACTIVE',
            isMobileVerified: user.is_mobile_verified ?? true,
            isProfileComplete
        };
    }
    /**
     * Get all active sessions for current user
     */
    async getSessions(userId, currentSessionId) {
        return session_service_1.sessionService.getUserSessions(userId, currentSessionId);
    }
    /**
     * Revoke specific user session
     */
    async revokeSession(sessionId, userId) {
        return session_service_1.sessionService.revokeUserSession(sessionId, userId);
    }
    /**
     * Mobile number change: Send OTP to new mobile number
     */
    async changeMobileSendOtp(userId, newPhoneNumber, countryCode = '+91', ipAddress) {
        const normalized = (0, phone_1.normalizePhoneNumber)(newPhoneNumber, countryCode);
        // Verify whether new number is already in use by another user
        const existingUser = await database_1.prisma.users.findUnique({
            where: { mobile_no: normalized.e164 }
        });
        const parsedUserId = BigInt(userId.toString());
        if (existingUser && existingUser.user_id !== parsedUserId) {
            throw new app_error_1.ConflictError('Mobile number already registered to another account', 'PHONE_NUMBER_IN_USE');
        }
        return otp_service_1.otpService.initiateChallenge(normalized.e164, 'CHANGE_PHONE', ipAddress);
    }
    /**
     * Mobile number change: Verify OTP and update mobile number transactionally
     */
    async changeMobileVerifyOtp(userId, challengeId, otp, ipAddress) {
        const parsedUserId = BigInt(userId.toString());
        return database_1.prisma.$transaction(async (tx) => {
            const verification = await otp_service_1.otpService.verifyChallenge(challengeId, otp, 'CHANGE_PHONE', tx);
            // Re-verify uniqueness
            const existing = await tx.users.findUnique({
                where: { mobile_no: verification.phoneNumber }
            });
            if (existing && existing.user_id !== parsedUserId) {
                throw new app_error_1.ConflictError('Mobile number already registered to another account', 'PHONE_NUMBER_IN_USE');
            }
            await tx.users.update({
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
                ipAddress,
                status: 'SUCCESS'
            }, tx);
            return {
                customerId: Number(parsedUserId),
                phoneNumber: verification.phoneNumber
            };
        });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
