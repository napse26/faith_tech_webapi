"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileService = exports.ProfileService = void 0;
const database_1 = require("../../config/database");
const app_error_1 = require("../../common/errors/app-error");
const otp_service_1 = require("../otp/otp.service");
const audit_service_1 = require("../audit/audit.service");
class ProfileService {
    /**
     * Retrieves the current user's profile.
     */
    async getProfile(userId) {
        const parsedUserId = BigInt(userId);
        const user = await database_1.prisma.users.findUnique({
            where: { user_id: parsedUserId },
            include: {
                customer_details_customer_details_user_idTousers: true
            }
        });
        if (!user) {
            throw new app_error_1.NotFoundError('User profile not found', 'USER_NOT_FOUND');
        }
        const customer = user.customer_details_customer_details_user_idTousers;
        return {
            userId: user.user_id.toString(),
            mobileNumber: user.mobile_no,
            email: user.email || null,
            isMobileVerified: user.is_mobile_verified ?? true,
            isEmailVerified: user.is_email_verified ?? false,
            fullName: user.full_name || customer?.first_name || null,
            displayName: customer?.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : user.full_name || null,
            gender: customer?.gender || user.gender || null,
            avatarUrl: customer?.profile_image || user.profile_image || null,
            preferredLanguage: customer?.preferred_language || 'en',
            country: user.country_code || null,
            state: null,
            city: customer?.place_of_birth || null,
            timezone: 'Asia/Kolkata',
            isProfileComplete: !!(user.full_name || customer?.first_name),
            createdAt: user.created_on,
            updatedAt: user.updated_on
        };
    }
    /**
     * Updates only permitted profile fields using strict allowlist.
     */
    async updateProfile(userId, input) {
        const parsedUserId = BigInt(userId);
        const user = await database_1.prisma.users.findUnique({
            where: { user_id: parsedUserId },
            include: { customer_details_customer_details_user_idTousers: true }
        });
        if (!user) {
            throw new app_error_1.NotFoundError('User not found', 'USER_NOT_FOUND');
        }
        const names = input.fullName ? input.fullName.split(' ') : [];
        const firstName = names[0] || undefined;
        const lastName = names.slice(1).join(' ') || undefined;
        await database_1.prisma.$transaction(async (tx) => {
            await tx.users.update({
                where: { user_id: parsedUserId },
                data: {
                    full_name: input.fullName !== undefined ? input.fullName : undefined,
                    gender: input.gender !== undefined ? input.gender : undefined,
                    profile_image: input.avatarUrl !== undefined ? input.avatarUrl : undefined,
                    updated_on: new Date()
                }
            });
            await tx.customer_details.upsert({
                where: { user_id: parsedUserId },
                create: {
                    user_id: parsedUserId,
                    first_name: firstName,
                    last_name: lastName,
                    gender: input.gender !== undefined ? input.gender : undefined,
                    preferred_language: input.preferredLanguage !== undefined ? input.preferredLanguage : undefined,
                    profile_image: input.avatarUrl !== undefined ? input.avatarUrl : undefined,
                    place_of_birth: input.city !== undefined ? input.city : undefined,
                    updated_on: new Date()
                },
                update: {
                    first_name: firstName,
                    last_name: lastName,
                    gender: input.gender !== undefined ? input.gender : undefined,
                    preferred_language: input.preferredLanguage !== undefined ? input.preferredLanguage : undefined,
                    profile_image: input.avatarUrl !== undefined ? input.avatarUrl : undefined,
                    place_of_birth: input.city !== undefined ? input.city : undefined,
                    updated_on: new Date()
                }
            });
            await audit_service_1.auditService.log({
                userId: parsedUserId,
                phoneNumber: user.mobile_no,
                eventType: 'PROFILE_UPDATED',
                status: 'SUCCESS'
            }, tx);
        });
        return this.getProfile(userId);
    }
    /**
     * Initiates email verification flow via OTP.
     */
    async initiateEmailUpdate(userId, newEmail) {
        const parsedUserId = BigInt(userId);
        const existing = await database_1.prisma.users.findFirst({
            where: { email: newEmail, NOT: { user_id: parsedUserId } }
        });
        if (existing) {
            throw new app_error_1.ConflictError('Email is already registered to another account', 'EMAIL_IN_USE');
        }
        const challenge = await otp_service_1.otpService.initiateChallenge(newEmail, 'EMAIL_VERIFICATION');
        return { challengeId: challenge.challengeId };
    }
    /**
     * Verifies email change challenge and commits update.
     */
    async verifyEmailUpdate(userId, challengeId, otp) {
        const parsedUserId = BigInt(userId);
        const result = await database_1.prisma.$transaction(async (tx) => {
            const verification = await otp_service_1.otpService.verifyChallenge(challengeId, otp, 'EMAIL_VERIFICATION', tx);
            const existing = await tx.users.findFirst({
                where: { email: verification.phoneNumber, NOT: { user_id: parsedUserId } }
            });
            if (existing) {
                throw new app_error_1.ConflictError('Email is already registered to another account', 'EMAIL_IN_USE');
            }
            await tx.users.update({
                where: { user_id: parsedUserId },
                data: {
                    email: verification.phoneNumber,
                    is_email_verified: true,
                    updated_on: new Date()
                }
            });
            await audit_service_1.auditService.log({
                userId: parsedUserId,
                eventType: 'EMAIL_UPDATED',
                status: 'SUCCESS'
            }, tx);
            return verification.phoneNumber;
        });
        return this.getProfile(userId);
    }
    async initiateProfilePhotoUpload(userId, fileType, fileSize) {
        return {
            uploadUrl: `https://storage.supabase.co/profiles/${userId}/avatar.jpg`,
            cdnUrl: `https://storage.supabase.co/profiles/${userId}/avatar.jpg`,
            expiresIn: 3600
        };
    }
    async initiateEmailVerification(userId, email) {
        return this.initiateEmailUpdate(userId, email);
    }
    async confirmEmailVerification(userId, challengeId, otp) {
        return this.verifyEmailUpdate(userId, challengeId, otp);
    }
}
exports.ProfileService = ProfileService;
exports.profileService = new ProfileService();
