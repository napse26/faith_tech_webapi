import { z } from 'zod';

export const submitAstrologerReviewSchema = z.object({
  review_type: z.literal('ASTROLOGER'),
  astrologer_id: z.union([z.string(), z.number()]).transform(String),
  service_id: z.union([z.string(), z.number()]).transform(String),
  booking_id: z.string().trim().min(1, 'booking_id is required').max(100),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  review_text: z.string().trim().max(2000).optional().nullable(),
  reviewer_name: z.string().trim().max(150).optional().nullable(),
  reviewer_city: z.string().trim().max(100).optional().nullable(),
  is_anonymous: z.boolean().optional().default(false)
});

export const submitPoojaReviewSchema = z.object({
  review_type: z.literal('POOJA'),
  pooja_id: z.string().trim().min(1, 'pooja_id is required'),
  booking_id: z.string().trim().min(1, 'booking_id is required').max(100),
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  review_text: z.string().trim().max(2000).optional().nullable(),
  reviewer_name: z.string().trim().max(150).optional().nullable(),
  reviewer_city: z.string().trim().max(100).optional().nullable(),
  is_anonymous: z.boolean().optional().default(false)
});

export const submitReviewSchema = z.discriminatedUnion('review_type', [
  submitAstrologerReviewSchema,
  submitPoojaReviewSchema
]);

export const getAstrologerReviewsQuerySchema = z.object({
  service_id: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export const getPoojaReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export type SubmitAstrologerReviewInput = z.infer<typeof submitAstrologerReviewSchema>;
export type SubmitPoojaReviewInput = z.infer<typeof submitPoojaReviewSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type GetAstrologerReviewsQuery = z.infer<typeof getAstrologerReviewsQuerySchema>;
export type GetPoojaReviewsQuery = z.infer<typeof getPoojaReviewsQuerySchema>;
