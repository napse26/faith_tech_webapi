"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = exports.OtpService = void 0;
const env_1 = require("../../config/env");
const database_1 = require("../../config/database");
const otp_repository_1 = require("./otp.repository");
const crypto_1 = require("../../common/utils/crypto");
const phone_1 = require("../../common/utils/phone");
const sms_factory_1 = require("../../integrations/sms/sms.factory");
const app_error_1 = require("../../common/errors/app-error");
const audit_service_1 = require("../audit/audit.service");
class OtpService {
    smsProvider = (0, sms_factory_1.getSmsProvider)();
    /**
     * Encodes salt and HMAC hash into single string: "salt:hash"
     */
    formatOtpHash(otp) {
        const salt = (0, crypto_1.generateSalt)(16);
        const digest = (0, crypto_1.hashOtp)(otp, salt);
        return `${salt}:${digest}`;
    }
    /**
     * Verifies candidate OTP against stored "salt:hash"
     */
    verifyStoredOtpHash(candidateOtp, storedHash) {
        if (env_1.env.USE_SAMPLE_OTP && env_1.env.NODE_ENV !== 'production' && candidateOtp === env_1.env.DEV_SAMPLE_OTP) {
            return true;
        }
        const parts = storedHash.split(':');
        if (parts.length !== 2) {
            return false;
        }
        const [salt, expectedDigest] = parts;
        return (0, crypto_1.verifyOtpHash)(candidateOtp, salt, expectedDigest);
    }
    /**
     * Initiates an OTP challenge: generates CSPRNG OTP, calculates HMAC, saves challenge, sends SMS.
     */
    async initiateChallenge(phoneNumber, purpose = 'LOGIN', ipAddress) {
        const now = new Date();
        const expirySeconds = env_1.env.OTP_EXPIRY_SECONDS || env_1.env.OTP_TTL_SECONDS || 300;
        const cooldownSeconds = env_1.env.OTP_RESEND_COOLDOWN || env_1.env.OTP_RESEND_COOLDOWN_SECONDS || 90;
        const expiresAt = new Date(now.getTime() + expirySeconds * 1000);
        const rawOtp = (0, crypto_1.generateOtp)(env_1.env.OTP_LENGTH || 4);
        const storedOtpHash = this.formatOtpHash(rawOtp);
        // Supersede any existing pending challenges for this phone and purpose
        const challenge = await database_1.prisma.$transaction(async (tx) => {
            await otp_repository_1.otpRepository.supersedeActiveChallenges(phoneNumber, purpose, tx);
            return otp_repository_1.otpRepository.createChallenge({
                phoneNumber,
                purpose,
                channel: 'SMS',
                otpHash: storedOtpHash,
                expiresAt
            }, tx);
        });
        // Send through configured SMS provider
        try {
            await this.smsProvider.sendOtp(phoneNumber, rawOtp, `Your DharmaDarshan verification code is ${rawOtp}. Valid for ${Math.floor(expirySeconds / 60)} minutes.`);
            await audit_service_1.auditService.log({
                phoneNumber,
                eventType: 'OTP_SENT',
                ipAddress,
                status: 'SUCCESS'
            });
        }
        catch (err) {
            await audit_service_1.auditService.log({
                phoneNumber,
                eventType: 'OTP_DELIVERY_FAILED',
                ipAddress,
                status: 'FAILED',
                failureReason: err?.message || 'SMS delivery failure'
            });
            // In dev mode, we do not throw if sample OTP is active
            if (env_1.env.NODE_ENV === 'production') {
                throw new app_error_1.BadRequestError('Failed to deliver SMS. Please try again.', 'SMS_DELIVERY_FAILED');
            }
        }
        return {
            challengeId: challenge.challenge_id,
            maskedPhoneNumber: (0, phone_1.maskPhoneNumber)(phoneNumber),
            otpLength: env_1.env.OTP_LENGTH || 4,
            expiresIn: expirySeconds,
            resendAfter: cooldownSeconds,
            ...(env_1.env.USE_SAMPLE_OTP && env_1.env.NODE_ENV !== 'production' && { sampleOtp: env_1.env.DEV_SAMPLE_OTP || rawOtp })
        };
    }
    /**
     * Verifies an OTP challenge atomically within a caller-provided transaction or stand-alone.
     */
    async verifyChallenge(challengeId, otp, expectedPurpose, tx = database_1.prisma) {
        const challenge = await otp_repository_1.otpRepository.findByChallengeId(challengeId, tx);
        if (!challenge) {
            throw new app_error_1.NotFoundError('Invalid verification challenge', 'INVALID_CHALLENGE');
        }
        if (challenge.status === 'CONSUMED') {
            throw new app_error_1.ConflictError('OTP has already been used', 'OTP_ALREADY_USED');
        }
        if (challenge.status === 'LOCKED') {
            throw new app_error_1.RateLimitError('Maximum verification attempts exceeded for this OTP', 'OTP_ATTEMPTS_EXCEEDED');
        }
        if (challenge.status !== 'PENDING') {
            throw new app_error_1.BadRequestError('Invalid or expired verification code', 'INVALID_OTP');
        }
        if (expectedPurpose && challenge.purpose !== expectedPurpose && expectedPurpose !== 'AUTHENTICATION') {
            throw new app_error_1.BadRequestError('Verification purpose mismatch', 'PURPOSE_MISMATCH');
        }
        if (challenge.expires_at < new Date()) {
            await tx.otp_verification.update({
                where: { challenge_id: challengeId },
                data: { status: 'EXPIRED', updated_at: new Date() }
            });
            await audit_service_1.auditService.log({
                phoneNumber: challenge.phone_number,
                eventType: 'OTP_EXPIRED',
                status: 'FAILED',
                failureReason: 'OTP expired'
            }, tx);
            throw new app_error_1.BadRequestError('OTP has expired', 'OTP_EXPIRED');
        }
        if (challenge.attempts >= (env_1.env.OTP_MAX_ATTEMPTS || 5)) {
            throw new app_error_1.RateLimitError('Maximum verification attempts exceeded. Please request a new OTP.', 'OTP_ATTEMPTS_EXCEEDED');
        }
        const isValid = this.verifyStoredOtpHash(otp, challenge.otp_hash);
        if (!isValid) {
            const updated = await otp_repository_1.otpRepository.incrementAttempts(challengeId, env_1.env.OTP_MAX_ATTEMPTS || 5, tx);
            await audit_service_1.auditService.log({
                phoneNumber: challenge.phone_number,
                eventType: 'OTP_VERIFICATION_FAILED',
                status: 'FAILED',
                failureReason: `Invalid OTP entry. Attempt ${updated.attempts}/${env_1.env.OTP_MAX_ATTEMPTS || 5}`
            }, tx);
            if (updated.attempts >= (env_1.env.OTP_MAX_ATTEMPTS || 5)) {
                throw new app_error_1.RateLimitError('Maximum verification attempts exceeded. Please request a new OTP.', 'OTP_ATTEMPTS_EXCEEDED');
            }
            throw new app_error_1.BadRequestError('Invalid verification code entered', 'INVALID_OTP');
        }
        // Atomically mark consumed / verified
        await otp_repository_1.otpRepository.markVerified(challengeId, tx);
        await audit_service_1.auditService.log({
            phoneNumber: challenge.phone_number,
            eventType: 'OTP_VERIFICATION_SUCCESS',
            status: 'SUCCESS'
        }, tx);
        return {
            valid: true,
            phoneNumber: challenge.phone_number,
            purpose: challenge.purpose,
            challengeId: challenge.challenge_id
        };
    }
    /**
     * Resends an OTP challenge subject to cooldown and quota checks.
     */
    async resendOtp(challengeId, ipAddress) {
        const challenge = await otp_repository_1.otpRepository.findByChallengeId(challengeId);
        if (!challenge) {
            throw new app_error_1.NotFoundError('Invalid challenge identifier', 'INVALID_CHALLENGE');
        }
        if (challenge.status === 'CONSUMED') {
            throw new app_error_1.ConflictError('Cannot resend code for an already consumed challenge', 'OTP_ALREADY_USED');
        }
        if (challenge.status !== 'PENDING') {
            throw new app_error_1.BadRequestError('Cannot resend code for an inactive or expired challenge', 'CHALLENGE_INACTIVE');
        }
        const cooldownSeconds = env_1.env.OTP_RESEND_COOLDOWN || env_1.env.OTP_RESEND_COOLDOWN_SECONDS || 90;
        const expirySeconds = env_1.env.OTP_EXPIRY_SECONDS || env_1.env.OTP_TTL_SECONDS || 300;
        const now = new Date();
        // Check cooldown based on created_at or updated_at
        const lastIssuedAt = challenge.updated_at || challenge.created_at;
        const elapsedSeconds = Math.floor((now.getTime() - lastIssuedAt.getTime()) / 1000);
        if (elapsedSeconds < cooldownSeconds) {
            const remainingWait = cooldownSeconds - elapsedSeconds;
            throw new app_error_1.RateLimitError(`Please wait ${remainingWait} seconds before requesting a new OTP`, 'RESEND_COOLDOWN_ACTIVE');
        }
        if (challenge.resend_count >= 5) {
            throw new app_error_1.RateLimitError('Maximum resend limit reached for this session. Please restart.', 'RESEND_LIMIT_EXCEEDED');
        }
        const rawOtp = (0, crypto_1.generateOtp)(env_1.env.OTP_LENGTH || 4);
        const storedOtpHash = this.formatOtpHash(rawOtp);
        const expiresAt = new Date(now.getTime() + expirySeconds * 1000);
        await otp_repository_1.otpRepository.markResent(challengeId, storedOtpHash, expiresAt);
        try {
            await this.smsProvider.sendOtp(challenge.phone_number, rawOtp, `Your new DharmaDarshan verification code is ${rawOtp}. Valid for ${Math.floor(expirySeconds / 60)} minutes.`);
            await audit_service_1.auditService.log({
                phoneNumber: challenge.phone_number,
                eventType: 'OTP_RESENT',
                ipAddress,
                status: 'SUCCESS'
            });
        }
        catch (err) {
            await audit_service_1.auditService.log({
                phoneNumber: challenge.phone_number,
                eventType: 'OTP_DELIVERY_FAILED',
                ipAddress,
                status: 'FAILED',
                failureReason: err?.message || 'SMS resend delivery failed'
            });
            if (env_1.env.NODE_ENV === 'production') {
                throw new app_error_1.BadRequestError('Failed to deliver SMS. Please try again.', 'SMS_DELIVERY_FAILED');
            }
        }
        return {
            challengeId: challenge.challenge_id,
            maskedPhoneNumber: (0, phone_1.maskPhoneNumber)(challenge.phone_number),
            otpLength: env_1.env.OTP_LENGTH || 4,
            expiresIn: expirySeconds,
            resendAfter: cooldownSeconds,
            ...(env_1.env.USE_SAMPLE_OTP && env_1.env.NODE_ENV !== 'production' && { sampleOtp: env_1.env.DEV_SAMPLE_OTP || rawOtp })
        };
    }
}
exports.OtpService = OtpService;
exports.otpService = new OtpService();
