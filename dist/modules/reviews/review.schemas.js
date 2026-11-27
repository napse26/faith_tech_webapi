"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPoojaReviewsQuerySchema = exports.getAstrologerReviewsQuerySchema = exports.submitReviewSchema = exports.submitPoojaReviewSchema = exports.submitAstrologerReviewSchema = void 0;
const zod_1 = require("zod");
exports.submitAstrologerReviewSchema = zod_1.z.object({
    review_type: zod_1.z.literal('ASTROLOGER'),
    astrologer_id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(String),
    service_id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).transform(String),
    booking_id: zod_1.z.string().trim().min(1, 'booking_id is required').max(100),
    rating: zod_1.z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
    review_text: zod_1.z.string().trim().max(2000).optional().nullable(),
    reviewer_name: zod_1.z.string().trim().max(150).optional().nullable(),
    reviewer_city: zod_1.z.string().trim().max(100).optional().nullable(),
    is_anonymous: zod_1.z.boolean().optional().default(false)
});
exports.submitPoojaReviewSchema = zod_1.z.object({
    review_type: zod_1.z.literal('POOJA'),
    pooja_id: zod_1.z.string().trim().min(1, 'pooja_id is required'),
    booking_id: zod_1.z.string().trim().min(1, 'booking_id is required').max(100),
    rating: zod_1.z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
    review_text: zod_1.z.string().trim().max(2000).optional().nullable(),
    reviewer_name: zod_1.z.string().trim().max(150).optional().nullable(),
    reviewer_city: zod_1.z.string().trim().max(100).optional().nullable(),
    is_anonymous: zod_1.z.boolean().optional().default(false)
});
exports.submitReviewSchema = zod_1.z.discriminatedUnion('review_type', [
    exports.submitAstrologerReviewSchema,
    exports.submitPoojaReviewSchema
]);
exports.getAstrologerReviewsQuerySchema = zod_1.z.object({
    service_id: zod_1.z.string().trim().optional(),
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10)
});
exports.getPoojaReviewsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10)
});
