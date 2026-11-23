"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const user_controller_1 = require("./user.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const user_schemas_1 = require("./user.schemas");
const rate_limiter_1 = require("../../common/middleware/rate-limiter");
const router = (0, express_1.Router)();
// All user lifecycle endpoints require authentication
router.use(auth_middleware_1.authenticate);
// Mobile Change
router.post('/me/mobile/change/initiate', rate_limiter_1.otpInitiateLimiter, (0, validate_1.validate)({ body: user_schemas_1.initiateMobileChangeSchema }), user_controller_1.userController.initiateMobileChange);
router.post('/me/mobile/change/confirm', rate_limiter_1.otpVerifyLimiter, (0, validate_1.validate)({ body: user_schemas_1.confirmMobileChangeSchema }), user_controller_1.userController.confirmMobileChange);
// Account Lifecycle
router.post('/me/deactivate', user_controller_1.userController.deactivate);
router.post('/me/deletion-requests', (0, validate_1.validate)({ body: user_schemas_1.submitDeletionRequestSchema }), user_controller_1.userController.submitDeletionRequest);
router.get('/me/deletion-requests/current', user_controller_1.userController.getCurrentDeletionRequest);
exports.userRoutes = router;
