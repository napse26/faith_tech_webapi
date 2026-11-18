import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  initiateMobileChangeSchema,
  confirmMobileChangeSchema,
  submitDeletionRequestSchema
} from './user.schemas';
import { otpInitiateLimiter, otpVerifyLimiter } from '../../common/middleware/rate-limiter';

const router = Router();

// All user lifecycle endpoints require authentication
router.use(authenticate);

// Mobile Change
router.post(
  '/me/mobile/change/initiate',
  otpInitiateLimiter,
  validate({ body: initiateMobileChangeSchema }),
  userController.initiateMobileChange
);

router.post(
  '/me/mobile/change/confirm',
  otpVerifyLimiter,
  validate({ body: confirmMobileChangeSchema }),
  userController.confirmMobileChange
);

// Account Lifecycle
router.post('/me/deactivate', userController.deactivate);
router.post(
  '/me/deletion-requests',
  validate({ body: submitDeletionRequestSchema }),
  userController.submitDeletionRequest
);
router.get('/me/deletion-requests/current', userController.getCurrentDeletionRequest);

export const userRoutes = router;
