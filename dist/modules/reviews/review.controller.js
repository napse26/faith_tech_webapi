"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewController = exports.ReviewController = void 0;
const review_service_1 = require("./review.service");
const api_response_1 = require("../../common/types/api-response");
class ReviewController {
    async submitReview(req, res, next) {
        try {
            const result = await review_service_1.reviewService.submitReview(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Review submitted successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getAstrologerReviews(req, res, next) {
        try {
            const astrologerId = BigInt(String(req.params.astrologer_id || req.params.astrologerId));
            const serviceId = req.query.service_id ? String(req.query.service_id) : undefined;
            const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
            const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
            const result = await review_service_1.reviewService.getAstrologerReviews(astrologerId, serviceId, page, limit);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Reviews retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaReviews(req, res, next) {
        try {
            const poojaId = String(req.params.pooja_id || req.params.poojaId || req.params.poojaIdOrSlug);
            const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
            const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
            const result = await review_service_1.reviewService.getPoojaReviews(poojaId, page, limit);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Reviews retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ReviewController = ReviewController;
exports.reviewController = new ReviewController();
