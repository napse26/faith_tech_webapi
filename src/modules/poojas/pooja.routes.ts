import { Router } from 'express';
import { poojaController } from './pooja.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { submitPoojaReviewSchema } from './pooja.schemas';

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
router.get('/:poojaIdOrSlug/reviews', poojaController.getPoojaReviews);
router.post(
  '/:poojaId/reviews',
  authenticate,
  validate({ body: submitPoojaReviewSchema }),
  poojaController.submitPoojaReview
);

router.get('/:poojaId/packages', poojaController.getPoojaPackages);
router.get('/:poojaId/addons', poojaController.getPoojaAddons);
router.get('/:poojaId/availability', poojaController.getPoojaAvailability);
router.get('/:poojaId/slots', poojaController.getPoojaSlots);
router.get('/:poojaId/requirements', poojaController.getPoojaRequirements);

export const poojaRoutes = router;
