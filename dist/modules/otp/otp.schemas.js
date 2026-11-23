"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendOtpSchema = exports.verifyOtpSchema = exports.initiateOtpSchema = void 0;
const zod_1 = require("zod");
exports.initiateOtpSchema = zod_1.z.object({
    mobileNumber: zod_1.z.string().min(5).max(20),
    countryCode: zod_1.z.string().min(1).max(5).default('+91')
});
exports.verifyOtpSchema = zod_1.z.object({
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format'),
    otp: zod_1.z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
});
exports.resendOtpSchema = zod_1.z.object({
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format')
});
