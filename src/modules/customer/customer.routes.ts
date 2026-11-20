import { Router } from 'express';
import { customerController } from './customer.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  updateCustomerProfileSchema,
  createBirthProfileSchema,
  updateBirthProfileSchema,
  setDefaultBirthProfileSchema,
  initiateMobileChangeSchema,
  verifyMobileChangeSchema,
  initiateEmailVerificationSchema,
  verifyEmailVerificationSchema,
  updateCustomerPreferencesSchema,
  updateNotificationPreferencesSchema
} from './customer.schemas';
import { otpInitiateLimiter, otpVerifyLimiter } from '../../common/middleware/rate-limiter';

const router = Router();

// Apply authentication to all /customers/me/* endpoints
router.use(authenticate);

// =========================================================================
// 3. CORE CUSTOMER PROFILE
// =========================================================================
router.get('/', customerController.getProfile);
router.patch('/', validate({ body: updateCustomerProfileSchema }), customerController.updateProfile);
router.get('/status', customerController.getStatus);
router.post('/profile-photo', customerController.uploadProfilePhoto);
router.delete('/profile-photo', customerController.removeProfilePhoto);

// =========================================================================
// 4. BIRTH PROFILES
// =========================================================================
router.get('/birth-profiles', customerController.listBirthProfiles);
router.post('/birth-profiles', validate({ body: createBirthProfileSchema }), customerController.createBirthProfile);
router.get('/birth-profiles/:profileId', customerController.getBirthProfile);
router.put('/birth-profiles/:profileId', validate({ body: updateBirthProfileSchema }), customerController.updateBirthProfile);
router.delete('/birth-profiles/:profileId', customerController.deleteBirthProfile);
router.patch(
  '/birth-profiles/:profileId/default',
  validate({ body: setDefaultBirthProfileSchema }),
  customerController.setDefaultBirthProfile
);

// =========================================================================
// 5. CONTACT VERIFICATION / CHANGE
// =========================================================================
router.post(
  '/mobile/change/initiate',
  otpInitiateLimiter,
  validate({ body: initiateMobileChangeSchema }),
  customerController.initiateMobileChange
);

router.post(
  '/mobile/change/verify',
  otpVerifyLimiter,
  validate({ body: verifyMobileChangeSchema }),
  customerController.verifyMobileChange
);

router.post(
  '/email/verification/initiate',
  otpInitiateLimiter,
  validate({ body: initiateEmailVerificationSchema }),
  customerController.initiateEmailVerification
);

router.post(
  '/email/verification/verify',
  otpVerifyLimiter,
  validate({ body: verifyEmailVerificationSchema }),
  customerController.verifyEmailVerification
);

router.delete('/email', customerController.removeEmail);

// =========================================================================
// 6. PREFERENCES & NOTIFICATION SETTINGS
// =========================================================================
router.get('/preferences', customerController.getPreferences);
router.put(
  '/preferences',
  validate({ body: updateCustomerPreferencesSchema }),
  customerController.updatePreferences
);

router.get('/notification-preferences', customerController.getNotificationPreferences);
router.put(
  '/notification-preferences',
  validate({ body: updateNotificationPreferencesSchema }),
  customerController.updateNotificationPreferences
);

// =========================================================================
// 7. SESSIONS AND DEVICES
// =========================================================================
router.get('/sessions', customerController.getSessions);
router.delete('/sessions/:sessionId', customerController.revokeSession);
router.post('/sessions/revoke-all', customerController.revokeOtherSessions);

router.get('/devices', customerController.getDevices);
router.delete('/devices/:deviceId', customerController.removeDevice);

// =========================================================================
// 8. SECURITY & LOGOUT
// =========================================================================
router.get('/security', customerController.getSecurityOverview);
router.post('/security/logout', customerController.logout);
router.post('/security/logout-all', customerController.logoutAll);

export const customerRoutes = router;
