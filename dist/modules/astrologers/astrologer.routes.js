"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.astrologerRoutes = void 0;
const express_1 = require("express");
const astrologer_controller_1 = require("./astrologer.controller");
const review_controller_1 = require("../reviews/review.controller");
const review_schemas_1 = require("../reviews/review.schemas");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const astrologer_schemas_1 = require("./astrologer.schemas");
const router = (0, express_1.Router)();
// =========================================================================
// 1. PUBLIC DISCOVERY ENDPOINTS (Devotees / Customers / Public)
// =========================================================================
router.get('/', astrologer_controller_1.astrologerController.listPublicAstrologers);
router.get('/:astrologerId/profile', astrologer_controller_1.astrologerController.getPublicProfile);
router.get('/:astrologerId/availability', astrologer_controller_1.astrologerController.getPublicAvailability);
router.get('/:astrologerId/reviews', (0, validate_1.validate)({ query: review_schemas_1.getAstrologerReviewsQuerySchema }), review_controller_1.reviewController.getAstrologerReviews);
router.get('/:astrologer_id/reviews', (0, validate_1.validate)({ query: review_schemas_1.getAstrologerReviewsQuerySchema }), review_controller_1.reviewController.getAstrologerReviews);
// =========================================================================
// 2. AUTHENTICATED ASTROLOGER ONBOARDING & PROFILE (Self)
// =========================================================================
router.use(auth_middleware_1.authenticate);
// Application Lifecycle
router.post('/apply', (0, validate_1.validate)({ body: astrologer_schemas_1.applyAstrologerSchema }), astrologer_controller_1.astrologerController.apply);
router.get('/application', astrologer_controller_1.astrologerController.getApplication);
router.patch('/application', (0, validate_1.validate)({ body: astrologer_schemas_1.updateAstrologerProfileSchema }), astrologer_controller_1.astrologerController.updateDraft);
router.post('/application/submit', astrologer_controller_1.astrologerController.submitApplication);
router.post('/application/resubmit', astrologer_controller_1.astrologerController.resubmitApplication);
router.get('/application/status', astrologer_controller_1.astrologerController.getApplicationStatus);
// Profile
router.get('/profile', astrologer_controller_1.astrologerController.getProfile);
router.patch('/profile', (0, validate_1.validate)({ body: astrologer_schemas_1.updateAstrologerProfileSchema }), astrologer_controller_1.astrologerController.updateProfile);
router.post('/profile/photo', (0, validate_1.validate)({ body: astrologer_schemas_1.updatePhotoSchema }), astrologer_controller_1.astrologerController.updatePhoto);
router.delete('/profile/photo', astrologer_controller_1.astrologerController.deletePhoto);
// Expertise & Services & Pricing
router.get('/expertise', astrologer_controller_1.astrologerController.getExpertise);
router.put('/expertise', (0, validate_1.validate)({ body: astrologer_schemas_1.updateExpertiseSchema }), astrologer_controller_1.astrologerController.updateExpertise);
router.get('/services', astrologer_controller_1.astrologerController.getServices);
router.post('/services', (0, validate_1.validate)({ body: astrologer_schemas_1.createAstrologerServiceSchema }), astrologer_controller_1.astrologerController.createService);
router.put('/services/:serviceId', (0, validate_1.validate)({ body: astrologer_schemas_1.updateAstrologerServiceSchema }), astrologer_controller_1.astrologerController.updateService);
router.delete('/services/:serviceId', astrologer_controller_1.astrologerController.deleteService);
router.get('/pricing', astrologer_controller_1.astrologerController.getPricing);
router.patch('/pricing', (0, validate_1.validate)({ body: astrologer_schemas_1.updateAstrologerPricingSchema }), astrologer_controller_1.astrologerController.updatePricing);
// Qualifications
router.get('/qualifications', astrologer_controller_1.astrologerController.getQualifications);
router.post('/qualifications', (0, validate_1.validate)({ body: astrologer_schemas_1.addQualificationSchema }), astrologer_controller_1.astrologerController.addQualification);
router.put('/qualifications/:qualificationId', (0, validate_1.validate)({ body: astrologer_schemas_1.updateQualificationSchema }), astrologer_controller_1.astrologerController.updateQualification);
router.delete('/qualifications/:qualificationId', astrologer_controller_1.astrologerController.deleteQualification);
// Documents
router.get('/documents', astrologer_controller_1.astrologerController.getDocuments);
router.post('/documents', (0, validate_1.validate)({ body: astrologer_schemas_1.uploadDocumentSchema }), astrologer_controller_1.astrologerController.uploadDocument);
router.get('/documents/:documentId', astrologer_controller_1.astrologerController.getDocument);
router.delete('/documents/:documentId', astrologer_controller_1.astrologerController.deleteDocument);
// Payout / Bank Details
router.get('/payout', astrologer_controller_1.astrologerController.getPayoutDetails);
router.put('/payout', (0, validate_1.validate)({ body: astrologer_schemas_1.updatePayoutDetailsSchema }), astrologer_controller_1.astrologerController.updatePayoutDetails);
// Availability & Schedule
router.get('/availability', astrologer_controller_1.astrologerController.getAvailability);
router.put('/availability', (0, validate_1.validate)({ body: astrologer_schemas_1.setWeeklyAvailabilitySchema }), astrologer_controller_1.astrologerController.setWeeklyAvailability);
router.post('/availability/exceptions', (0, validate_1.validate)({ body: astrologer_schemas_1.addDateExceptionSchema }), astrologer_controller_1.astrologerController.addDateException);
router.delete('/availability/exceptions/:exceptionId', astrologer_controller_1.astrologerController.deleteDateException);
// Status & Dashboard
router.get('/status', astrologer_controller_1.astrologerController.getOnlineStatus);
router.patch('/status', (0, validate_1.validate)({ body: astrologer_schemas_1.toggleOnlineStatusSchema }), astrologer_controller_1.astrologerController.setOnlineStatus);
router.get('/dashboard', astrologer_controller_1.astrologerController.getDashboard);
exports.astrologerRoutes = router;
