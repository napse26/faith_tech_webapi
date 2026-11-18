import { Router } from 'express';
import { profileController } from './profile.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  updateProfileSchema,
  profilePhotoUploadSchema,
  initiateEmailVerificationSchema,
  confirmEmailVerificationSchema
} from './profile.schemas';

const router = Router();

// All profile endpoints require authentication
router.use(authenticate);

router.get('/me', profileController.getProfile);
router.put('/me', validate({ body: updateProfileSchema }), profileController.updateProfile);
router.patch('/me', validate({ body: updateProfileSchema }), profileController.updateProfile);

router.post(
  '/me/profile-photo',
  validate({ body: profilePhotoUploadSchema }),
  profileController.uploadPhoto
);

router.post(
  '/me/email/verification/initiate',
  validate({ body: initiateEmailVerificationSchema }),
  profileController.initiateEmailVerification
);

router.post(
  '/me/email/verification/confirm',
  validate({ body: confirmEmailVerificationSchema }),
  profileController.confirmEmailVerification
);

export const profileRoutes = router;
