import { Router } from 'express';
import { poojaController } from './pooja.controller';
import { reviewController } from '../reviews/review.controller';
import { getPoojaReviewsQuerySchema } from '../reviews/review.schemas';
import { validate } from '../../common/middleware/validate';

const router = Router();

// =========================================================================
// 1. PUBLIC CATALOG ENDPOINTS (Devotees / Customers / Public)
// =========================================================================
router.get('/categories', poojaController.getCategories);
router.get('/', poojaController.listPoojas);
router.get('/priests', poojaController.listPriests);
router.get('/priests/:priestId', poojaController.getPriestDetails);

// Individual Pooja Details & Availability
router.get('/:poojaIdOrSlug', poojaController.getPoojaDetails);
router.get('/:poojaIdOrSlug/process', poojaController.getPoojaProcess);
router.get('/:poojaIdOrSlug/participants', poojaController.getPoojaParticipants);
router.get('/:poojaIdOrSlug/packages', poojaController.getPoojaPackages);
router.get('/:poojaIdOrSlug/reviews', validate({ query: getPoojaReviewsQuerySchema }), reviewController.getPoojaReviews);
router.get('/:pooja_id/reviews', validate({ query: getPoojaReviewsQuerySchema }), reviewController.getPoojaReviews);

router.get('/:poojaId/packages', poojaController.getPoojaPackages);
router.get('/:poojaId/addons', poojaController.getPoojaAddons);
router.get('/:poojaId/availability', poojaController.getPoojaAvailability);
router.get('/:poojaId/slots', poojaController.getPoojaSlots);
router.get('/:poojaId/requirements', poojaController.getPoojaRequirements);

export const poojaRoutes = router;
