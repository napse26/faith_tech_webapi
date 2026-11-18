import { Router } from 'express';
import { birthDetailsController } from './birth-details.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { upsertBirthDetailsSchema } from './birth-details.schemas';

const router = Router();

// All birth details endpoints require authentication
router.use(authenticate);

router.get('/me/birth-details', birthDetailsController.getBirthDetails);
router.put(
  '/me/birth-details',
  validate({ body: upsertBirthDetailsSchema }),
  birthDetailsController.upsertBirthDetails
);

export const birthDetailsRoutes = router;
