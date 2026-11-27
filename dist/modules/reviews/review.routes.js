"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRoutes = void 0;
const express_1 = require("express");
const review_controller_1 = require("./review.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const review_schemas_1 = require("./review.schemas");
const router = (0, express_1.Router)();
// Submit review (Customer authenticated)
router.post('/customer/reviews', auth_middleware_1.authenticate, (0, validate_1.validate)({ body: review_schemas_1.submitReviewSchema }), review_controller_1.reviewController.submitReview);
// Astrologer reviews
router.get('/astrologers/:astrologer_id/reviews', (0, validate_1.validate)({ query: review_schemas_1.getAstrologerReviewsQuerySchema }), review_controller_1.reviewController.getAstrologerReviews);
// Pooja reviews
router.get('/poojas/:pooja_id/reviews', (0, validate_1.validate)({ query: review_schemas_1.getPoojaReviewsQuerySchema }), review_controller_1.reviewController.getPoojaReviews);
exports.reviewRoutes = router;
