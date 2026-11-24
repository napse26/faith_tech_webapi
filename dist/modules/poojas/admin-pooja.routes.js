"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPoojaRoutes = void 0;
const express_1 = require("express");
const admin_pooja_controller_1 = require("./admin-pooja.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const pooja_schemas_1 = require("./pooja.schemas");
const router = (0, express_1.Router)();
// Protect all admin endpoints with ADMIN or SUPER_ADMIN role
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('ADMIN', 'SUPER_ADMIN'));
// Catalog Management
router.get('/', admin_pooja_controller_1.adminPoojaController.listPoojas);
router.post('/', (0, validate_1.validate)({ body: pooja_schemas_1.createPoojaSchema }), admin_pooja_controller_1.adminPoojaController.createPooja);
router.put('/:poojaId', (0, validate_1.validate)({ body: pooja_schemas_1.updatePoojaSchema }), admin_pooja_controller_1.adminPoojaController.updatePooja);
router.patch('/:poojaId/status', admin_pooja_controller_1.adminPoojaController.setPoojaStatus);
// Packages Management
router.post('/:poojaId/packages', (0, validate_1.validate)({ body: pooja_schemas_1.createPoojaPackageSchema }), admin_pooja_controller_1.adminPoojaController.createPackage);
router.put('/packages/:packageId', (0, validate_1.validate)({ body: pooja_schemas_1.updatePoojaPackageSchema }), admin_pooja_controller_1.adminPoojaController.updatePackage);
router.delete('/packages/:packageId', admin_pooja_controller_1.adminPoojaController.deletePackage);
// Addons Management
router.post('/:poojaId/addons', (0, validate_1.validate)({ body: pooja_schemas_1.createPoojaAddonSchema }), admin_pooja_controller_1.adminPoojaController.createAddon);
router.put('/addons/:addonId', (0, validate_1.validate)({ body: pooja_schemas_1.updatePoojaAddonSchema }), admin_pooja_controller_1.adminPoojaController.updateAddon);
router.delete('/addons/:addonId', admin_pooja_controller_1.adminPoojaController.deleteAddon);
// Slots Bulk Creation
router.post('/:poojaId/slots/bulk', (0, validate_1.validate)({ body: pooja_schemas_1.bulkCreateSlotsSchema }), admin_pooja_controller_1.adminPoojaController.bulkCreateSlots);
exports.adminPoojaRoutes = router;
