"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAstrologerController = exports.AdminAstrologerController = void 0;
const astrologer_service_1 = require("./astrologer.service");
const api_response_1 = require("../../common/types/api-response");
class AdminAstrologerController {
    async listApplications(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const onboardingStatus = req.query.status;
            const search = req.query.search;
            const result = await astrologer_service_1.astrologerService.adminListApplications({
                page,
                limit,
                onboardingStatus,
                search
            });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer applications retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getApplicationDetails(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const result = await astrologer_service_1.astrologerService.adminGetApplicationDetails(astrologerId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Application details retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async startReview(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const result = await astrologer_service_1.astrologerService.adminStartReview(astrologerId, req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async requestChanges(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const result = await astrologer_service_1.astrologerService.adminRequestChanges(astrologerId, req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async approveApplication(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const result = await astrologer_service_1.astrologerService.adminApproveApplication(astrologerId, req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async rejectApplication(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const result = await astrologer_service_1.astrologerService.adminRejectApplication(astrologerId, req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async suspendAstrologer(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const result = await astrologer_service_1.astrologerService.adminSuspendAstrologer(astrologerId, req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async reactivateAstrologer(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const result = await astrologer_service_1.astrologerService.adminReactivateAstrologer(astrologerId, req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async verifyDocument(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const docId = req.params.docId;
            const result = await astrologer_service_1.astrologerService.adminVerifyDocument(astrologerId, docId, req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, `Document marked as ${req.body.status}`, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getAuditHistory(req, res, next) {
        try {
            const astrologerId = BigInt(req.params.astrologerId);
            const result = await astrologer_service_1.astrologerService.adminGetAuditHistory(astrologerId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Audit history retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AdminAstrologerController = AdminAstrologerController;
exports.adminAstrologerController = new AdminAstrologerController();
