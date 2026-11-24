import { Router } from 'express';
import { adminAstrologerController } from './admin-astrologer.controller';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  adminReviewApplicationSchema,
  adminRequestChangesSchema,
  adminApproveApplicationSchema,
  adminRejectApplicationSchema,
  adminSuspendAstrologerSchema,
  adminVerifyDocumentSchema
} from './astrologer.schemas';

const router = Router();

// Protect all admin astrologer endpoints with ADMIN or SUPER_ADMIN role
router.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

// List and view applications
router.get('/', adminAstrologerController.listApplications);
router.get('/:astrologerId', adminAstrologerController.getApplicationDetails);
router.get('/:astrologerId/audit-history', adminAstrologerController.getAuditHistory);

// Status transitions & actions
router.post(
  '/:astrologerId/review',
  validate({ body: adminReviewApplicationSchema }),
  adminAstrologerController.startReview
);
router.post(
  '/:astrologerId/request-changes',
  validate({ body: adminRequestChangesSchema }),
  adminAstrologerController.requestChanges
);
router.post(
  '/:astrologerId/approve',
  validate({ body: adminApproveApplicationSchema }),
  adminAstrologerController.approveApplication
);
router.post(
  '/:astrologerId/reject',
  validate({ body: adminRejectApplicationSchema }),
  adminAstrologerController.rejectApplication
);
router.post(
  '/:astrologerId/suspend',
  validate({ body: adminSuspendAstrologerSchema }),
  adminAstrologerController.suspendAstrologer
);
router.post(
  '/:astrologerId/reactivate',
  adminAstrologerController.reactivateAstrologer
);

// Document verification
router.post(
  '/:astrologerId/documents/:docId/verify',
  validate({ body: adminVerifyDocumentSchema }),
  adminAstrologerController.verifyDocument
);

export const adminAstrologerRoutes = router;
