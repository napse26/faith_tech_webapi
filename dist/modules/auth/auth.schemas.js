"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeMobileVerifyOtpSchema = exports.changeMobileSendOtpSchema = exports.refreshTokenSchema = exports.resendAuthOtpSchema = exports.verifyAuthOtpSchema = exports.initiateAuthSchema = void 0;
const zod_1 = require("zod");
exports.initiateAuthSchema = zod_1.z
    .object({
    phoneNumber: zod_1.z.string().min(5).max(25).optional(),
    mobileNumber: zod_1.z.string().min(5).max(25).optional(),
    countryCode: zod_1.z.string().min(1).max(6).optional().default('+91'),
    purpose: zod_1.z.enum(['LOGIN', 'REGISTER', 'CHANGE_PHONE', 'ACCOUNT_RECOVERY', 'AUTHENTICATION']).optional().default('LOGIN'),
    channel: zod_1.z.enum(['SMS', 'WHATSAPP']).optional().default('SMS')
})
    .refine((data) => data.phoneNumber || data.mobileNumber, {
    message: 'Either phoneNumber or mobileNumber must be provided',
    path: ['phoneNumber']
});
exports.verifyAuthOtpSchema = zod_1.z.object({
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format'),
    otp: zod_1.z.string().regex(/^\d{4,6}$/, 'OTP must be 4 or 6 digits'),
    device: zod_1.z
        .object({
        deviceId: zod_1.z.string().max(255).optional(),
        deviceName: zod_1.z.string().max(255).optional(),
        platform: zod_1.z.string().max(50).optional(),
        appVersion: zod_1.z.string().max(50).optional()
    })
        .optional(),
    deviceId: zod_1.z.string().max(255).optional(),
    deviceName: zod_1.z.string().max(255).optional(),
    platform: zod_1.z.string().max(50).optional()
});
exports.resendAuthOtpSchema = zod_1.z.object({
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format')
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string({ required_error: 'Refresh token is required' }).min(10)
});
exports.changeMobileSendOtpSchema = zod_1.z
    .object({
    newPhoneNumber: zod_1.z.string().min(5).max(25).optional(),
    phoneNumber: zod_1.z.string().min(5).max(25).optional(),
    countryCode: zod_1.z.string().min(1).max(6).optional().default('+91')
})
    .refine((data) => data.newPhoneNumber || data.phoneNumber, {
    message: 'Either newPhoneNumber or phoneNumber must be provided',
    path: ['newPhoneNumber']
});
exports.changeMobileVerifyOtpSchema = zod_1.z.object({
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format'),
    otp: zod_1.z.string().regex(/^\d{4,6}$/, 'OTP must be 4 or 6 digits')
});
