"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poojaRoutes = void 0;
const express_1 = require("express");
const pooja_controller_1 = require("./pooja.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const pooja_schemas_1 = require("./pooja.schemas");
const router = (0, express_1.Router)();
// =========================================================================
// 1. PUBLIC CATALOG ENDPOINTS (Devotees / Customers / Public)
// =========================================================================
router.get('/categories', pooja_controller_1.poojaController.getCategories);
router.get('/', pooja_controller_1.poojaController.listPoojas);
router.get('/priests', pooja_controller_1.poojaController.listPriests);
router.get('/priests/:priestId', pooja_controller_1.poojaController.getPriestDetails);
// Individual Pooja Details & Availability
router.get('/:poojaIdOrSlug', pooja_controller_1.poojaController.getPoojaDetails);
router.get('/:poojaIdOrSlug/process', pooja_controller_1.poojaController.getPoojaProcess);
router.get('/:poojaIdOrSlug/participants', pooja_controller_1.poojaController.getPoojaParticipants);
router.get('/:poojaIdOrSlug/packages', pooja_controller_1.poojaController.getPoojaPackages);
router.get('/:poojaIdOrSlug/reviews', pooja_controller_1.poojaController.getPoojaReviews);
router.post('/:poojaId/reviews', auth_middleware_1.authenticate, (0, validate_1.validate)({ body: pooja_schemas_1.submitPoojaReviewSchema }), pooja_controller_1.poojaController.submitPoojaReview);
router.get('/:poojaId/packages', pooja_controller_1.poojaController.getPoojaPackages);
router.get('/:poojaId/addons', pooja_controller_1.poojaController.getPoojaAddons);
router.get('/:poojaId/availability', pooja_controller_1.poojaController.getPoojaAvailability);
router.get('/:poojaId/slots', pooja_controller_1.poojaController.getPoojaSlots);
router.get('/:poojaId/requirements', pooja_controller_1.poojaController.getPoojaRequirements);
exports.poojaRoutes = router;
