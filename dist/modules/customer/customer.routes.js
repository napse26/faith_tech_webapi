"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerRoutes = void 0;
const express_1 = require("express");
const customer_controller_1 = require("./customer.controller");
const customer_family_controller_1 = require("./customer-family.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const customer_family_schemas_1 = require("./customer-family.schemas");
const customer_schemas_1 = require("./customer.schemas");
const rate_limiter_1 = require("../../common/middleware/rate-limiter");
const router = (0, express_1.Router)();
// Apply authentication to all /customers/me/* endpoints
router.use(auth_middleware_1.authenticate);
// =========================================================================
// 3. CORE CUSTOMER PROFILE
// =========================================================================
router.get('/', customer_controller_1.customerController.getProfile);
router.patch('/', (0, validate_1.validate)({ body: customer_schemas_1.updateCustomerProfileSchema }), customer_controller_1.customerController.updateProfile);
router.get('/status', customer_controller_1.customerController.getStatus);
router.post('/profile-photo', customer_controller_1.customerController.uploadProfilePhoto);
router.delete('/profile-photo', customer_controller_1.customerController.removeProfilePhoto);
// =========================================================================
// 4. BIRTH PROFILES
// =========================================================================
router.get('/birth-profiles', customer_controller_1.customerController.listBirthProfiles);
router.post('/birth-profiles', (0, validate_1.validate)({ body: customer_schemas_1.createBirthProfileSchema }), customer_controller_1.customerController.createBirthProfile);
router.get('/birth-profiles/:profileId', customer_controller_1.customerController.getBirthProfile);
router.put('/birth-profiles/:profileId', (0, validate_1.validate)({ body: customer_schemas_1.updateBirthProfileSchema }), customer_controller_1.customerController.updateBirthProfile);
router.delete('/birth-profiles/:profileId', customer_controller_1.customerController.deleteBirthProfile);
router.patch('/birth-profiles/:profileId/default', (0, validate_1.validate)({ body: customer_schemas_1.setDefaultBirthProfileSchema }), customer_controller_1.customerController.setDefaultBirthProfile);
// =========================================================================
// 5. CONTACT VERIFICATION / CHANGE
// =========================================================================
router.post('/mobile/change/initiate', rate_limiter_1.otpInitiateLimiter, (0, validate_1.validate)({ body: customer_schemas_1.initiateMobileChangeSchema }), customer_controller_1.customerController.initiateMobileChange);
router.post('/mobile/change/verify', rate_limiter_1.otpVerifyLimiter, (0, validate_1.validate)({ body: customer_schemas_1.verifyMobileChangeSchema }), customer_controller_1.customerController.verifyMobileChange);
router.post('/email/verification/initiate', rate_limiter_1.otpInitiateLimiter, (0, validate_1.validate)({ body: customer_schemas_1.initiateEmailVerificationSchema }), customer_controller_1.customerController.initiateEmailVerification);
router.post('/email/verification/verify', rate_limiter_1.otpVerifyLimiter, (0, validate_1.validate)({ body: customer_schemas_1.verifyEmailVerificationSchema }), customer_controller_1.customerController.verifyEmailVerification);
router.delete('/email', customer_controller_1.customerController.removeEmail);
// =========================================================================
// 6. PREFERENCES & NOTIFICATION SETTINGS
// =========================================================================
router.get('/preferences', customer_controller_1.customerController.getPreferences);
router.put('/preferences', (0, validate_1.validate)({ body: customer_schemas_1.updateCustomerPreferencesSchema }), customer_controller_1.customerController.updatePreferences);
router.get('/notification-preferences', customer_controller_1.customerController.getNotificationPreferences);
router.put('/notification-preferences', (0, validate_1.validate)({ body: customer_schemas_1.updateNotificationPreferencesSchema }), customer_controller_1.customerController.updateNotificationPreferences);
// =========================================================================
// 7. SESSIONS AND DEVICES
// =========================================================================
router.get('/sessions', customer_controller_1.customerController.getSessions);
router.delete('/sessions/:sessionId', customer_controller_1.customerController.revokeSession);
router.post('/sessions/revoke-all', customer_controller_1.customerController.revokeOtherSessions);
router.get('/devices', customer_controller_1.customerController.getDevices);
router.delete('/devices/:deviceId', customer_controller_1.customerController.removeDevice);
// =========================================================================
// 8. SECURITY & LOGOUT
// =========================================================================
router.get('/security', customer_controller_1.customerController.getSecurityOverview);
router.post('/security/logout', customer_controller_1.customerController.logout);
router.post('/security/logout-all', customer_controller_1.customerController.logoutAll);
// =========================================================================
// 9. PRIVACY AND CONSENT (Phase 3)
// =========================================================================
router.get('/consents', customer_controller_1.customerController.getConsents);
router.put('/consents', (0, validate_1.validate)({ body: customer_schemas_1.updateConsentsSchema }), customer_controller_1.customerController.updateConsents);
router.post('/consents/accept', (0, validate_1.validate)({ body: customer_schemas_1.acceptConsentSchema }), customer_controller_1.customerController.acceptConsent);
router.get('/privacy', customer_controller_1.customerController.getPrivacyOverview);
// =========================================================================
// 10. ACCOUNT LIFECYCLE (Phase 3)
// =========================================================================
router.post('/deactivation', (0, validate_1.validate)({ body: customer_schemas_1.deactivateAccountSchema }), customer_controller_1.customerController.deactivateAccount);
router.post('/reactivation', (0, validate_1.validate)({ body: customer_schemas_1.reactivateAccountSchema }), customer_controller_1.customerController.reactivateAccount);
router.post('/deletion-request', (0, validate_1.validate)({ body: customer_schemas_1.requestDeletionSchema }), customer_controller_1.customerController.requestAccountDeletion);
router.get('/deletion-request', customer_controller_1.customerController.getDeletionRequest);
router.delete('/deletion-request', customer_controller_1.customerController.cancelAccountDeletion);
// =========================================================================
// 11. SUPPORT REQUESTS (Phase 4)
// =========================================================================
router.get('/support-requests', customer_controller_1.customerController.listSupportTickets);
router.post('/support-requests', (0, validate_1.validate)({ body: customer_schemas_1.createSupportTicketSchema }), customer_controller_1.customerController.createSupportTicket);
router.get('/support-requests/:ticketId', customer_controller_1.customerController.getSupportTicket);
router.post('/support-requests/:ticketId/messages', (0, validate_1.validate)({ body: customer_schemas_1.addTicketMessageSchema }), customer_controller_1.customerController.addTicketMessage);
// =========================================================================
// 12. ASTROLOGER FAVORITES & RECENTS (Phase 4)
// =========================================================================
router.get('/favorites/astrologers', customer_controller_1.customerController.listFavorites);
router.post('/favorites/astrologers/:astrologerId', customer_controller_1.customerController.addFavorite);
router.delete('/favorites/astrologers/:astrologerId', customer_controller_1.customerController.removeFavorite);
router.get('/recent-astrologers', customer_controller_1.customerController.listRecentAstrologers);
// =========================================================================
// 13. CUSTOMER ACTIVITY (Phase 4)
// =========================================================================
router.get('/activity', customer_controller_1.customerController.getCustomerActivity);
// =========================================================================
// 14. FAMILY MEMBERS (Spec)
// =========================================================================
router.post('/family-members', (0, validate_1.validate)({ body: customer_family_schemas_1.addFamilyMemberSchema }), customer_family_controller_1.customerFamilyController.addFamilyMember);
router.get('/family-members', customer_family_controller_1.customerFamilyController.getFamilyMembers);
router.get('/family-members/:member_id', customer_family_controller_1.customerFamilyController.getFamilyMemberById);
router.put('/family-members/:member_id', (0, validate_1.validate)({ body: customer_family_schemas_1.updateFamilyMemberSchema }), customer_family_controller_1.customerFamilyController.updateFamilyMember);
router.delete('/family-members/:member_id', customer_family_controller_1.customerFamilyController.deleteFamilyMember);
// =========================================================================
// 15. ASTROLOGER FOLLOW / UNFOLLOW (Spec)
// =========================================================================
router.post('/astrologers/:astrologer_id/follow', customer_family_controller_1.customerFamilyController.followAstrologer);
router.delete('/astrologers/:astrologer_id/follow', customer_family_controller_1.customerFamilyController.unfollowAstrologer);
router.get('/astrologers/following', (0, validate_1.validate)({ query: customer_family_schemas_1.getFollowingQuerySchema }), customer_family_controller_1.customerFamilyController.getFollowedAstrologers);
exports.customerRoutes = router;
