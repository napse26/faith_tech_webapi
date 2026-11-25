import { Router } from 'express';
import { poojaController } from './pooja.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  generateQuoteSchema,
  createBookingSchema,
  rescheduleBookingSchema,
  cancelBookingSchema,
  simulatePaymentSchema,
  bookingFeedbackSchema,
  addCheckoutFamilyMemberSchema
} from './pooja.schemas';

const router = Router();

// Devotee Authentication required for all quotes and bookings
router.use(authenticate);

// =========================================================================
// 1. CHECKOUT CONTEXT & FAMILY PROFILES
// =========================================================================
router.get('/checkout-context/:poojaId', poojaController.getCheckoutContext);
router.post(
  '/family-members',
  validate({ body: addCheckoutFamilyMemberSchema }),
  poojaController.addCheckoutFamilyMember
);

// =========================================================================
// 2. QUOTE ENGINE
// =========================================================================
router.post('/quotes', validate({ body: generateQuoteSchema }), poojaController.generateQuote);
router.get('/quotes/:quoteId', poojaController.getQuote);

// =========================================================================
// 3. BOOKING LIFECYCLE
// =========================================================================
router.post('/', validate({ body: createBookingSchema }), poojaController.createBooking);
router.get('/', poojaController.listBookings);
router.get('/:bookingId', poojaController.getBookingDetails);
router.post('/:bookingId/payment', validate({ body: simulatePaymentSchema }), poojaController.initiatePayment);
router.post('/:bookingId/cancel', validate({ body: cancelBookingSchema }), poojaController.cancelBooking);
router.post('/:bookingId/reschedule', validate({ body: rescheduleBookingSchema }), poojaController.rescheduleBooking);
router.get('/:bookingId/receipt', poojaController.getReceipt);
router.get('/:bookingId/live-session', poojaController.getLiveSession);
router.post('/:bookingId/feedback', validate({ body: bookingFeedbackSchema }), poojaController.submitFeedback);

export const poojaBookingRoutes = router;
