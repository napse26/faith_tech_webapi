"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAstrologerRoutes = void 0;
const express_1 = require("express");
const admin_astrologer_controller_1 = require("./admin-astrologer.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const astrologer_schemas_1 = require("./astrologer.schemas");
const router = (0, express_1.Router)();
// Protect all admin astrologer endpoints with ADMIN or SUPER_ADMIN role
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('ADMIN', 'SUPER_ADMIN'));
// List and view applications
router.get('/', admin_astrologer_controller_1.adminAstrologerController.listApplications);
router.get('/:astrologerId', admin_astrologer_controller_1.adminAstrologerController.getApplicationDetails);
router.get('/:astrologerId/audit-history', admin_astrologer_controller_1.adminAstrologerController.getAuditHistory);
// Status transitions & actions
router.post('/:astrologerId/review', (0, validate_1.validate)({ body: astrologer_schemas_1.adminReviewApplicationSchema }), admin_astrologer_controller_1.adminAstrologerController.startReview);
router.post('/:astrologerId/request-changes', (0, validate_1.validate)({ body: astrologer_schemas_1.adminRequestChangesSchema }), admin_astrologer_controller_1.adminAstrologerController.requestChanges);
router.post('/:astrologerId/approve', (0, validate_1.validate)({ body: astrologer_schemas_1.adminApproveApplicationSchema }), admin_astrologer_controller_1.adminAstrologerController.approveApplication);
router.post('/:astrologerId/reject', (0, validate_1.validate)({ body: astrologer_schemas_1.adminRejectApplicationSchema }), admin_astrologer_controller_1.adminAstrologerController.rejectApplication);
router.post('/:astrologerId/suspend', (0, validate_1.validate)({ body: astrologer_schemas_1.adminSuspendAstrologerSchema }), admin_astrologer_controller_1.adminAstrologerController.suspendAstrologer);
router.post('/:astrologerId/reactivate', admin_astrologer_controller_1.adminAstrologerController.reactivateAstrologer);
// Document verification
router.post('/:astrologerId/documents/:docId/verify', (0, validate_1.validate)({ body: astrologer_schemas_1.adminVerifyDocumentSchema }), admin_astrologer_controller_1.adminAstrologerController.verifyDocument);
exports.adminAstrologerRoutes = router;
