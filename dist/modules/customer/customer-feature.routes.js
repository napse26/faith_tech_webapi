"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerV1Router = void 0;
const express_1 = require("express");
const customer_family_controller_1 = require("./customer-family.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const customer_family_schemas_1 = require("./customer-family.schemas");
const router = (0, express_1.Router)();
// Apply JWT authentication
router.use(auth_middleware_1.authenticate);
// =========================================================================
// FAMILY MEMBERS API
// =========================================================================
router.post('/family-members', (0, validate_1.validate)({ body: customer_family_schemas_1.addFamilyMemberSchema }), customer_family_controller_1.customerFamilyController.addFamilyMember);
router.get('/family-members', customer_family_controller_1.customerFamilyController.getFamilyMembers);
router.get('/family-members/:member_id', customer_family_controller_1.customerFamilyController.getFamilyMemberById);
router.put('/family-members/:member_id', (0, validate_1.validate)({ body: customer_family_schemas_1.updateFamilyMemberSchema }), customer_family_controller_1.customerFamilyController.updateFamilyMember);
router.delete('/family-members/:member_id', customer_family_controller_1.customerFamilyController.deleteFamilyMember);
// =========================================================================
// FOLLOW / UNFOLLOW ASTROLOGER API
// =========================================================================
router.post('/astrologers/:astrologer_id/follow', customer_family_controller_1.customerFamilyController.followAstrologer);
router.delete('/astrologers/:astrologer_id/follow', customer_family_controller_1.customerFamilyController.unfollowAstrologer);
router.get('/astrologers/following', (0, validate_1.validate)({ query: customer_family_schemas_1.getFollowingQuerySchema }), customer_family_controller_1.customerFamilyController.getFollowedAstrologers);
exports.customerV1Router = router;
