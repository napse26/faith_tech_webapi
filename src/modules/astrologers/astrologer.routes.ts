import { Router } from 'express';
import { astrologerController } from './astrologer.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  applyAstrologerSchema,
  updateAstrologerProfileSchema,
  updateExpertiseSchema,
  updateAstrologerPricingSchema,
  addQualificationSchema,
  updateQualificationSchema,
  uploadDocumentSchema,
  updatePayoutDetailsSchema,
  setWeeklyAvailabilitySchema,
  addDateExceptionSchema,
  toggleOnlineStatusSchema,
  updatePhotoSchema,
  createAstrologerServiceSchema,
  updateAstrologerServiceSchema
} from './astrologer.schemas';

const router = Router();

// =========================================================================
// 1. PUBLIC DISCOVERY ENDPOINTS (Devotees / Customers / Public)
// =========================================================================
router.get('/', astrologerController.listPublicAstrologers);
router.get('/:astrologerId/profile', astrologerController.getPublicProfile);
router.get('/:astrologerId/availability', astrologerController.getPublicAvailability);

// =========================================================================
// 2. AUTHENTICATED ASTROLOGER ONBOARDING & PROFILE (Self)
// =========================================================================
router.use(authenticate);

// Application Lifecycle
router.post('/apply', validate({ body: applyAstrologerSchema }), astrologerController.apply);
router.get('/application', astrologerController.getApplication);
router.patch('/application', validate({ body: updateAstrologerProfileSchema }), astrologerController.updateDraft);
router.post('/application/submit', astrologerController.submitApplication);
router.post('/application/resubmit', astrologerController.resubmitApplication);
router.get('/application/status', astrologerController.getApplicationStatus);

// Profile
router.get('/profile', astrologerController.getProfile);
router.patch('/profile', validate({ body: updateAstrologerProfileSchema }), astrologerController.updateProfile);
router.post('/profile/photo', validate({ body: updatePhotoSchema }), astrologerController.updatePhoto);
router.delete('/profile/photo', astrologerController.deletePhoto);

// Expertise & Services & Pricing
router.get('/expertise', astrologerController.getExpertise);
router.put('/expertise', validate({ body: updateExpertiseSchema }), astrologerController.updateExpertise);
router.get('/services', astrologerController.getServices);
router.post('/services', validate({ body: createAstrologerServiceSchema }), astrologerController.createService);
router.put('/services/:serviceId', validate({ body: updateAstrologerServiceSchema }), astrologerController.updateService);
router.delete('/services/:serviceId', astrologerController.deleteService);
router.get('/pricing', astrologerController.getPricing);
router.patch('/pricing', validate({ body: updateAstrologerPricingSchema }), astrologerController.updatePricing);

// Qualifications
router.get('/qualifications', astrologerController.getQualifications);
router.post('/qualifications', validate({ body: addQualificationSchema }), astrologerController.addQualification);
router.put('/qualifications/:qualificationId', validate({ body: updateQualificationSchema }), astrologerController.updateQualification);
router.delete('/qualifications/:qualificationId', astrologerController.deleteQualification);

// Documents
router.get('/documents', astrologerController.getDocuments);
router.post('/documents', validate({ body: uploadDocumentSchema }), astrologerController.uploadDocument);
router.get('/documents/:documentId', astrologerController.getDocument);
router.delete('/documents/:documentId', astrologerController.deleteDocument);

// Payout / Bank Details
router.get('/payout', astrologerController.getPayoutDetails);
router.put('/payout', validate({ body: updatePayoutDetailsSchema }), astrologerController.updatePayoutDetails);

// Availability & Schedule
router.get('/availability', astrologerController.getAvailability);
router.put('/availability', validate({ body: setWeeklyAvailabilitySchema }), astrologerController.setWeeklyAvailability);
router.post('/availability/exceptions', validate({ body: addDateExceptionSchema }), astrologerController.addDateException);
router.delete('/availability/exceptions/:exceptionId', astrologerController.deleteDateException);

// Status & Dashboard
router.get('/status', astrologerController.getOnlineStatus);
router.patch('/status', validate({ body: toggleOnlineStatusSchema }), astrologerController.setOnlineStatus);
router.get('/dashboard', astrologerController.getDashboard);

export const astrologerRoutes = router;
