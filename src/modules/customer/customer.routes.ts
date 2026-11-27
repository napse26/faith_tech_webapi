import { Router } from 'express';
import { customerController } from './customer.controller';
import { customerFamilyController } from './customer-family.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  addFamilyMemberSchema,
  updateFamilyMemberSchema,
  getFollowingQuerySchema
} from './customer-family.schemas';
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
  updateNotificationPreferencesSchema,
  updateConsentsSchema,
  acceptConsentSchema,
  deactivateAccountSchema,
  reactivateAccountSchema,
  requestDeletionSchema,
  createSupportTicketSchema,
  addTicketMessageSchema
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

// =========================================================================
// 9. PRIVACY AND CONSENT (Phase 3)
// =========================================================================
router.get('/consents', customerController.getConsents);
router.put('/consents', validate({ body: updateConsentsSchema }), customerController.updateConsents);
router.post('/consents/accept', validate({ body: acceptConsentSchema }), customerController.acceptConsent);
router.get('/privacy', customerController.getPrivacyOverview);

// =========================================================================
// 10. ACCOUNT LIFECYCLE (Phase 3)
// =========================================================================
router.post('/deactivation', validate({ body: deactivateAccountSchema }), customerController.deactivateAccount);
router.post('/reactivation', validate({ body: reactivateAccountSchema }), customerController.reactivateAccount);
router.post('/deletion-request', validate({ body: requestDeletionSchema }), customerController.requestAccountDeletion);
router.get('/deletion-request', customerController.getDeletionRequest);
router.delete('/deletion-request', customerController.cancelAccountDeletion);

// =========================================================================
// 11. SUPPORT REQUESTS (Phase 4)
// =========================================================================
router.get('/support-requests', customerController.listSupportTickets);
router.post('/support-requests', validate({ body: createSupportTicketSchema }), customerController.createSupportTicket);
router.get('/support-requests/:ticketId', customerController.getSupportTicket);
router.post('/support-requests/:ticketId/messages', validate({ body: addTicketMessageSchema }), customerController.addTicketMessage);

// =========================================================================
// 12. ASTROLOGER FAVORITES & RECENTS (Phase 4)
// =========================================================================
router.get('/favorites/astrologers', customerController.listFavorites);
router.post('/favorites/astrologers/:astrologerId', customerController.addFavorite);
router.delete('/favorites/astrologers/:astrologerId', customerController.removeFavorite);
router.get('/recent-astrologers', customerController.listRecentAstrologers);

// =========================================================================
// 13. CUSTOMER ACTIVITY (Phase 4)
// =========================================================================
router.get('/activity', customerController.getCustomerActivity);

// =========================================================================
// 14. FAMILY MEMBERS (Spec)
// =========================================================================
router.post('/family-members', validate({ body: addFamilyMemberSchema }), customerFamilyController.addFamilyMember);
router.get('/family-members', customerFamilyController.getFamilyMembers);
router.get('/family-members/:member_id', customerFamilyController.getFamilyMemberById);
router.put('/family-members/:member_id', validate({ body: updateFamilyMemberSchema }), customerFamilyController.updateFamilyMember);
router.delete('/family-members/:member_id', customerFamilyController.deleteFamilyMember);

// =========================================================================
// 15. ASTROLOGER FOLLOW / UNFOLLOW (Spec)
// =========================================================================
router.post('/astrologers/:astrologer_id/follow', customerFamilyController.followAstrologer);
router.delete('/astrologers/:astrologer_id/follow', customerFamilyController.unfollowAstrologer);
router.get('/astrologers/following', validate({ query: getFollowingQuerySchema }), customerFamilyController.getFollowedAstrologers);

export const customerRoutes = router;
