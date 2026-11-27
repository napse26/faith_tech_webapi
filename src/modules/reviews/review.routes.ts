import { Router } from 'express';
import { reviewController } from './review.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  submitReviewSchema,
  getAstrologerReviewsQuerySchema,
  getPoojaReviewsQuerySchema
} from './review.schemas';

const router = Router();

// Submit review (Customer authenticated)
router.post(
  '/customer/reviews',
  authenticate,
  validate({ body: submitReviewSchema }),
  reviewController.submitReview
);

// Astrologer reviews
router.get(
  '/astrologers/:astrologer_id/reviews',
  validate({ query: getAstrologerReviewsQuerySchema }),
  reviewController.getAstrologerReviews
);

// Pooja reviews
router.get(
  '/poojas/:pooja_id/reviews',
  validate({ query: getPoojaReviewsQuerySchema }),
  reviewController.getPoojaReviews
);

export const reviewRoutes = router;
