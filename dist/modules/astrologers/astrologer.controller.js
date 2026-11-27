"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.astrologerController = exports.AstrologerController = void 0;
const astrologer_service_1 = require("./astrologer.service");
const api_response_1 = require("../../common/types/api-response");
const app_error_1 = require("../../common/errors/app-error");
class AstrologerController {
    // 1. APPLICATION & ONBOARDING
    async apply(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.apply(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer application initiated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getApplication(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getApplication(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer application details retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateDraft(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.updateDraft(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Application draft updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async submitApplication(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.submitApplication(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async resubmitApplication(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.resubmitApplication(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getApplicationStatus(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getApplicationStatus(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Application status retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // 2. PROFILE & PHOTOS
    async getProfile(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getProfile(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer profile retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.updateProfile(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer profile updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updatePhoto(req, res, next) {
        try {
            const { photoType, photoUrl } = req.body;
            const result = await astrologer_service_1.astrologerService.updatePhoto(req.user.userId, photoType, photoUrl);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, `${photoType} photo updated successfully`, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deletePhoto(req, res, next) {
        try {
            const photoType = req.query.photoType?.toUpperCase() === 'COVER' ? 'COVER' : 'PROFILE';
            const result = await astrologer_service_1.astrologerService.deletePhoto(req.user.userId, photoType);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // 3. EXPERTISE & SERVICES & PRICING
    async getExpertise(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getExpertise(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Expertise retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateExpertise(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.updateExpertise(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Expertise updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getServices(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getServices(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer services retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async createService(req, res, next) {
        try {
            const { serviceMasterId, status } = req.body;
            const result = await astrologer_service_1.astrologerService.createService(req.user.userId, serviceMasterId, status);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Service added successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateService(req, res, next) {
        try {
            const serviceId = parseInt(req.params.serviceId, 10);
            const result = await astrologer_service_1.astrologerService.updateService(req.user.userId, serviceId, req.body.status);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Service updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deleteService(req, res, next) {
        try {
            const serviceId = parseInt(req.params.serviceId, 10);
            const result = await astrologer_service_1.astrologerService.deleteService(req.user.userId, serviceId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPricing(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getPricing(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Pricing retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updatePricing(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.updatePricing(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Pricing updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // 4. QUALIFICATIONS
    async getQualifications(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getQualifications(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Qualifications retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async addQualification(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.addQualification(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Qualification added successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateQualification(req, res, next) {
        try {
            const qualificationId = req.params.qualificationId;
            const result = await astrologer_service_1.astrologerService.updateQualification(req.user.userId, qualificationId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Qualification updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deleteQualification(req, res, next) {
        try {
            const qualificationId = req.params.qualificationId;
            const result = await astrologer_service_1.astrologerService.deleteQualification(req.user.userId, qualificationId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // 5. DOCUMENTS
    async getDocuments(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getDocuments(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Documents retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async uploadDocument(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.uploadDocument(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Document uploaded successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getDocument(req, res, next) {
        try {
            const documentId = req.params.documentId;
            const result = await astrologer_service_1.astrologerService.getDocument(req.user.userId, documentId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Document retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deleteDocument(req, res, next) {
        try {
            const documentId = req.params.documentId;
            const result = await astrologer_service_1.astrologerService.deleteDocument(req.user.userId, documentId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // 6. BANK & PAYOUT DETAILS
    async getPayoutDetails(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getPayoutDetails(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Payout details retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updatePayoutDetails(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.updatePayoutDetails(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Payout details updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // 7. AVAILABILITY & SCHEDULE
    async getAvailability(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getAvailability(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Availability schedule retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async setWeeklyAvailability(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.setWeeklyAvailability(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Weekly availability updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async addDateException(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.addDateException(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Date exception added successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deleteDateException(req, res, next) {
        try {
            const exceptionId = req.params.exceptionId;
            const result = await astrologer_service_1.astrologerService.deleteDateException(req.user.userId, exceptionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // 8. ONLINE STATUS & DASHBOARD
    async getOnlineStatus(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getOnlineStatus(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Online status retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async setOnlineStatus(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.setOnlineStatus(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Online status updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getDashboard(req, res, next) {
        try {
            const result = await astrologer_service_1.astrologerService.getDashboard(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer dashboard metrics retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // 9. PUBLIC DISCOVERY (Customers / Unauthenticated)
    async listPublicAstrologers(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const specializationId = req.query.specializationId ? parseInt(req.query.specializationId, 10) : undefined;
            const languageId = req.query.languageId ? parseInt(req.query.languageId, 10) : undefined;
            const isOnline = req.query.isOnline !== undefined ? req.query.isOnline === 'true' : undefined;
            const isFeatured = req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : (req.query.is_featured !== undefined ? req.query.is_featured === 'true' : undefined);
            const isRecommended = req.query.isRecommended !== undefined ? req.query.isRecommended === 'true' : (req.query.is_recommended !== undefined ? req.query.is_recommended === 'true' : undefined);
            const result = await astrologer_service_1.astrologerService.listPublicAstrologers({
                page,
                limit,
                search: req.query.search,
                gender: req.query.gender,
                specializationId,
                languageId,
                sortBy: req.query.sortBy,
                isOnline,
                isFeatured,
                isRecommended
            });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologers retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPublicProfile(req, res, next) {
        try {
            const rawId = req.params.astrologerId || req.params.id;
            const idStr = Array.isArray(rawId) ? rawId[0] : (rawId ? String(rawId) : '');
            if (!idStr || isNaN(Number(idStr))) {
                throw new app_error_1.BadRequestError('Invalid astrologer ID', 'INVALID_ASTROLOGER_ID');
            }
            const astrologerId = BigInt(idStr);
            const result = await astrologer_service_1.astrologerService.getPublicProfile(astrologerId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPublicAvailability(req, res, next) {
        try {
            const rawId = req.params.astrologerId;
            const idStr = Array.isArray(rawId) ? rawId[0] : (rawId ? String(rawId) : '');
            if (!idStr || isNaN(Number(idStr))) {
                throw new app_error_1.BadRequestError('Invalid astrologer ID', 'INVALID_ASTROLOGER_ID');
            }
            const astrologerId = BigInt(idStr);
            const result = await astrologer_service_1.astrologerService.getPublicAvailability(astrologerId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer public availability retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AstrologerController = AstrologerController;
exports.astrologerController = new AstrologerController();
