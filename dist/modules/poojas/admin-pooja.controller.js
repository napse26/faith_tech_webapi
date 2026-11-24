"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPoojaController = exports.AdminPoojaController = void 0;
const pooja_service_1 = require("./pooja.service");
const api_response_1 = require("../../common/types/api-response");
class AdminPoojaController {
    // Catalog Management
    async listPoojas(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const status = req.query.status;
            const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined;
            const search = req.query.search;
            const result = await pooja_service_1.poojaService.adminListPoojas({ page, limit, status, categoryId, search });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Admin poojas retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async createPooja(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminCreatePooja(req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Pooja created successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updatePooja(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminUpdatePooja(req.params.poojaId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Pooja updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async setPoojaStatus(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminSetPoojaStatus(req.params.poojaId, req.body.status);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, `Pooja status updated to ${req.body.status}`, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async createPackage(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminCreatePackage(req.params.poojaId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Pooja package created successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updatePackage(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminUpdatePackage(req.params.packageId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Pooja package updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deletePackage(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminDeletePackage(req.params.packageId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async createAddon(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminCreateAddon(req.params.poojaId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Pooja addon created successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateAddon(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminUpdateAddon(req.params.addonId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Pooja addon updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAddon(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminDeleteAddon(req.params.addonId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async bulkCreateSlots(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminBulkCreateSlots(req.params.poojaId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // Booking Administration
    async listBookings(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const status = req.query.status;
            const poojaId = req.query.poojaId;
            const priestId = req.query.priestId;
            const result = await pooja_service_1.poojaService.adminListBookings({ page, limit, status, poojaId, priestId });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Admin pooja bookings retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getBookingDetails(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.getBookingDetails(req.user.userId, req.params.bookingId, true);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Booking details retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async assignPriest(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminAssignPriest(req.params.bookingId, req.body.priestId, req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateBookingStatus(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminUpdateBookingStatus(req.params.bookingId, req.body.status, req.user.userId, req.body.reason);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async setLiveSession(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminSetLiveSession(req.params.bookingId, req.body.liveStreamUrl, req.body.liveStreamNotes, req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Live session stream configured', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async processRefund(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminProcessRefund(req.params.bookingId, req.body.refundAmount, req.user.userId, req.body.reason);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getBookingAudit(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.adminGetBookingAudit(req.params.bookingId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Booking audit trail retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AdminPoojaController = AdminPoojaController;
exports.adminPoojaController = new AdminPoojaController();
