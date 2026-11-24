import { Router } from 'express';
import { adminPoojaController } from './admin-pooja.controller';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  createPoojaSchema,
  updatePoojaSchema,
  createPoojaPackageSchema,
  updatePoojaPackageSchema,
  createPoojaAddonSchema,
  updatePoojaAddonSchema,
  bulkCreateSlotsSchema,
  adminAssignPriestSchema,
  adminUpdateBookingStatusSchema,
  adminSetLiveSessionSchema,
  adminProcessRefundSchema
} from './pooja.schemas';

const router = Router();

// Protect all admin endpoints with ADMIN or SUPER_ADMIN role
router.use(authenticate, requireRole('ADMIN', 'SUPER_ADMIN'));

// Catalog Management
router.get('/', adminPoojaController.listPoojas);
router.post('/', validate({ body: createPoojaSchema }), adminPoojaController.createPooja);
router.put('/:poojaId', validate({ body: updatePoojaSchema }), adminPoojaController.updatePooja);
router.patch('/:poojaId/status', adminPoojaController.setPoojaStatus);

// Packages Management
router.post('/:poojaId/packages', validate({ body: createPoojaPackageSchema }), adminPoojaController.createPackage);
router.put('/packages/:packageId', validate({ body: updatePoojaPackageSchema }), adminPoojaController.updatePackage);
router.delete('/packages/:packageId', adminPoojaController.deletePackage);

// Addons Management
router.post('/:poojaId/addons', validate({ body: createPoojaAddonSchema }), adminPoojaController.createAddon);
router.put('/addons/:addonId', validate({ body: updatePoojaAddonSchema }), adminPoojaController.updateAddon);
router.delete('/addons/:addonId', adminPoojaController.deleteAddon);

// Slots Bulk Creation
router.post('/:poojaId/slots/bulk', validate({ body: bulkCreateSlotsSchema }), adminPoojaController.bulkCreateSlots);

export const adminPoojaRoutes = router;
