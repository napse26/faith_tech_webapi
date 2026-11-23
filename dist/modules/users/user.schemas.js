"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitDeletionRequestSchema = exports.confirmMobileChangeSchema = exports.initiateMobileChangeSchema = void 0;
const zod_1 = require("zod");
exports.initiateMobileChangeSchema = zod_1.z.object({
    newMobileNumber: zod_1.z
        .string({ required_error: 'New mobile number is required' })
        .min(5, 'Mobile number is too short')
        .max(20, 'Mobile number is too long'),
    countryCode: zod_1.z.string().min(1).max(5).default('+91')
});
exports.confirmMobileChangeSchema = zod_1.z.object({
    challengeId: zod_1.z.string().uuid('Invalid challenge ID format'),
    otp: zod_1.z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
});
exports.submitDeletionRequestSchema = zod_1.z.object({
    reason: zod_1.z.string().max(500).optional(),
    confirmText: zod_1.z.literal('DELETE MY ACCOUNT', {
        errorMap: () => ({ message: 'Please type "DELETE MY ACCOUNT" to confirm deletion request' })
    })
});
