"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileRoutes = void 0;
const express_1 = require("express");
const profile_controller_1 = require("./profile.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const profile_schemas_1 = require("./profile.schemas");
const router = (0, express_1.Router)();
// All profile endpoints require authentication
router.use(auth_middleware_1.authenticate);
router.get('/me', profile_controller_1.profileController.getProfile);
router.put('/me', (0, validate_1.validate)({ body: profile_schemas_1.updateProfileSchema }), profile_controller_1.profileController.updateProfile);
router.patch('/me', (0, validate_1.validate)({ body: profile_schemas_1.updateProfileSchema }), profile_controller_1.profileController.updateProfile);
router.post('/me/profile-photo', (0, validate_1.validate)({ body: profile_schemas_1.profilePhotoUploadSchema }), profile_controller_1.profileController.uploadPhoto);
router.post('/me/email/verification/initiate', (0, validate_1.validate)({ body: profile_schemas_1.initiateEmailVerificationSchema }), profile_controller_1.profileController.initiateEmailVerification);
router.post('/me/email/verification/confirm', (0, validate_1.validate)({ body: profile_schemas_1.confirmEmailVerificationSchema }), profile_controller_1.profileController.confirmEmailVerification);
exports.profileRoutes = router;
