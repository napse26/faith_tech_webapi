import { Router } from 'express';
import { adminPoojaController } from './admin-pooja.controller';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  adminAssignPriestSchema,
  adminUpdateBookingStatusSchema,
  adminSetLiveSessionSchema,
  adminProcessRefundSchema
} from './pooja.schemas';

const router = Router();

// Protect all admin booking endpoints
router.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

// Bookings management
router.get('/', adminPoojaController.listBookings);
router.get('/:bookingId', adminPoojaController.getBookingDetails);
router.get('/:bookingId/audit', adminPoojaController.getBookingAudit);

router.post(
  '/:bookingId/assign-priest',
  validate({ body: adminAssignPriestSchema }),
  adminPoojaController.assignPriest
);
router.patch(
  '/:bookingId/status',
  validate({ body: adminUpdateBookingStatusSchema }),
  adminPoojaController.updateBookingStatus
);
router.patch(
  '/:bookingId/live-stream',
  validate({ body: adminSetLiveSessionSchema }),
  adminPoojaController.setLiveSession
);
router.post(
  '/:bookingId/refund',
  validate({ body: adminProcessRefundSchema }),
  adminPoojaController.processRefund
);

export const adminPoojaBookingRoutes = router;
