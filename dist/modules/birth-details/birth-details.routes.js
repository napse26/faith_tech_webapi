"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.birthDetailsRoutes = void 0;
const express_1 = require("express");
const birth_details_controller_1 = require("./birth-details.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const birth_details_schemas_1 = require("./birth-details.schemas");
const router = (0, express_1.Router)();
// All birth details endpoints require authentication
router.use(auth_middleware_1.authenticate);
router.get('/me/birth-details', birth_details_controller_1.birthDetailsController.getBirthDetails);
router.put('/me/birth-details', (0, validate_1.validate)({ body: birth_details_schemas_1.upsertBirthDetailsSchema }), birth_details_controller_1.birthDetailsController.upsertBirthDetails);
exports.birthDetailsRoutes = router;
