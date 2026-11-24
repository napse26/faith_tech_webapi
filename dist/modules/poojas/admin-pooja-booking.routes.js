"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPoojaBookingRoutes = void 0;
const express_1 = require("express");
const admin_pooja_controller_1 = require("./admin-pooja.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const pooja_schemas_1 = require("./pooja.schemas");
const router = (0, express_1.Router)();
// Protect all admin booking endpoints
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('ADMIN', 'SUPER_ADMIN'));
// Bookings management
router.get('/', admin_pooja_controller_1.adminPoojaController.listBookings);
router.get('/:bookingId', admin_pooja_controller_1.adminPoojaController.getBookingDetails);
router.get('/:bookingId/audit', admin_pooja_controller_1.adminPoojaController.getBookingAudit);
router.post('/:bookingId/assign-priest', (0, validate_1.validate)({ body: pooja_schemas_1.adminAssignPriestSchema }), admin_pooja_controller_1.adminPoojaController.assignPriest);
router.patch('/:bookingId/status', (0, validate_1.validate)({ body: pooja_schemas_1.adminUpdateBookingStatusSchema }), admin_pooja_controller_1.adminPoojaController.updateBookingStatus);
router.patch('/:bookingId/live-stream', (0, validate_1.validate)({ body: pooja_schemas_1.adminSetLiveSessionSchema }), admin_pooja_controller_1.adminPoojaController.setLiveSession);
router.post('/:bookingId/refund', (0, validate_1.validate)({ body: pooja_schemas_1.adminProcessRefundSchema }), admin_pooja_controller_1.adminPoojaController.processRefund);
exports.adminPoojaBookingRoutes = router;
