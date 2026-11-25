"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poojaBookingRoutes = void 0;
const express_1 = require("express");
const pooja_controller_1 = require("./pooja.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const pooja_schemas_1 = require("./pooja.schemas");
const router = (0, express_1.Router)();
// Devotee Authentication required for all quotes and bookings
router.use(auth_middleware_1.authenticate);
// =========================================================================
// 1. CHECKOUT CONTEXT & FAMILY PROFILES
// =========================================================================
router.get('/checkout-context/:poojaId', pooja_controller_1.poojaController.getCheckoutContext);
router.post('/family-members', (0, validate_1.validate)({ body: pooja_schemas_1.addCheckoutFamilyMemberSchema }), pooja_controller_1.poojaController.addCheckoutFamilyMember);
// =========================================================================
// 2. QUOTE ENGINE
// =========================================================================
router.post('/quotes', (0, validate_1.validate)({ body: pooja_schemas_1.generateQuoteSchema }), pooja_controller_1.poojaController.generateQuote);
router.get('/quotes/:quoteId', pooja_controller_1.poojaController.getQuote);
// =========================================================================
// 3. BOOKING LIFECYCLE
// =========================================================================
router.post('/', (0, validate_1.validate)({ body: pooja_schemas_1.createBookingSchema }), pooja_controller_1.poojaController.createBooking);
router.get('/', pooja_controller_1.poojaController.listBookings);
router.get('/:bookingId', pooja_controller_1.poojaController.getBookingDetails);
router.post('/:bookingId/payment', (0, validate_1.validate)({ body: pooja_schemas_1.simulatePaymentSchema }), pooja_controller_1.poojaController.initiatePayment);
router.post('/:bookingId/cancel', (0, validate_1.validate)({ body: pooja_schemas_1.cancelBookingSchema }), pooja_controller_1.poojaController.cancelBooking);
router.post('/:bookingId/reschedule', (0, validate_1.validate)({ body: pooja_schemas_1.rescheduleBookingSchema }), pooja_controller_1.poojaController.rescheduleBooking);
router.get('/:bookingId/receipt', pooja_controller_1.poojaController.getReceipt);
router.get('/:bookingId/live-session', pooja_controller_1.poojaController.getLiveSession);
router.post('/:bookingId/feedback', (0, validate_1.validate)({ body: pooja_schemas_1.bookingFeedbackSchema }), pooja_controller_1.poojaController.submitFeedback);
exports.poojaBookingRoutes = router;
