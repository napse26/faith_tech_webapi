"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poojaController = exports.PoojaController = void 0;
const pooja_service_1 = require("./pooja.service");
const api_response_1 = require("../../common/types/api-response");
class PoojaController {
    // =========================================================================
    // 1. PUBLIC POOJA CATALOG
    // =========================================================================
    async getCategories(req, res, next) {
        try {
            const categories = await pooja_service_1.poojaService.getCategories();
            res.status(200).json((0, api_response_1.createSuccessResponse)(categories, 'Pooja categories retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async listPoojas(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const categoryId = req.query.categoryId ? parseInt(req.query.categoryId, 10) : undefined;
            const category = req.query.category ? req.query.category : undefined;
            const isFeatured = req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : undefined;
            const isScheduled = req.query.isScheduled !== undefined ? req.query.isScheduled === 'true' : undefined;
            const liveStreamingOnly = req.query.liveStreamingOnly !== undefined ? req.query.liveStreamingOnly === 'true' : undefined;
            const minRating = req.query.minRating ? parseFloat(req.query.minRating) : undefined;
            const sankalpFee = req.query.sankalpFee;
            const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : undefined;
            const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : undefined;
            const result = await pooja_service_1.poojaService.listPoojas({
                page,
                limit,
                categoryId,
                category,
                isFeatured,
                isScheduled,
                liveStreamingOnly,
                minRating,
                sankalpFee,
                minPrice,
                maxPrice,
                language: req.query.language,
                deliveryMode: req.query.deliveryMode,
                search: req.query.search
            });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Pooja catalog retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaDetails(req, res, next) {
        try {
            const pooja = await pooja_service_1.poojaService.getPoojaDetails(req.params.poojaIdOrSlug);
            res.status(200).json((0, api_response_1.createSuccessResponse)(pooja, 'Pooja details retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaProcess(req, res, next) {
        try {
            const processInfo = await pooja_service_1.poojaService.getPoojaProcess(req.params.poojaIdOrSlug);
            res.status(200).json((0, api_response_1.createSuccessResponse)(processInfo, 'Pooja process details retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaParticipants(req, res, next) {
        try {
            const participants = await pooja_service_1.poojaService.getPoojaParticipants(req.params.poojaIdOrSlug);
            res.status(200).json((0, api_response_1.createSuccessResponse)(participants, 'Pooja participants count retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaPackages(req, res, next) {
        try {
            const param = (req.params.poojaId || req.params.poojaIdOrSlug);
            const packages = await pooja_service_1.poojaService.getPoojaPackages(param);
            res.status(200).json((0, api_response_1.createSuccessResponse)(packages, 'Pooja packages retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaAddons(req, res, next) {
        try {
            const addons = await pooja_service_1.poojaService.getPoojaAddons(req.params.poojaId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(addons, 'Pooja addons retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaAvailability(req, res, next) {
        try {
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;
            const availability = await pooja_service_1.poojaService.getPoojaAvailability(req.params.poojaId, startDate, endDate);
            res.status(200).json((0, api_response_1.createSuccessResponse)(availability, 'Pooja availability dates retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaSlots(req, res, next) {
        try {
            const dateStr = req.query.date || new Date().toISOString().split('T')[0];
            const slots = await pooja_service_1.poojaService.getPoojaSlots(req.params.poojaId, dateStr);
            res.status(200).json((0, api_response_1.createSuccessResponse)(slots, `Slots retrieved for ${dateStr}`, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPoojaRequirements(req, res, next) {
        try {
            const requirements = await pooja_service_1.poojaService.getPoojaRequirements(req.params.poojaId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(requirements, 'Pooja requirements and sankalp fields retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 2. QUOTE ENGINE
    // =========================================================================
    async generateQuote(req, res, next) {
        try {
            const quote = await pooja_service_1.poojaService.generateQuote(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(quote, 'Pooja booking quote generated with 15-minute slot lock', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getQuote(req, res, next) {
        try {
            const quote = await pooja_service_1.poojaService.getQuote(req.user.userId, req.params.quoteId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(quote, 'Quote details retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 3. CUSTOMER BOOKINGS
    // =========================================================================
    async createBooking(req, res, next) {
        try {
            const booking = await pooja_service_1.poojaService.createBooking(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(booking, 'Pooja booking created successfully. Awaiting payment.', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async listBookings(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const status = req.query.status;
            const result = await pooja_service_1.poojaService.listCustomerBookings(req.user.userId, { page, limit, status });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Customer bookings retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getBookingDetails(req, res, next) {
        try {
            const booking = await pooja_service_1.poojaService.getBookingDetails(req.user.userId, req.params.bookingId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(booking, 'Booking details retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async initiatePayment(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.initiatePayment(req.user.userId, req.params.bookingId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async cancelBooking(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.cancelBooking(req.user.userId, req.params.bookingId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, result.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async rescheduleBooking(req, res, next) {
        try {
            const result = await pooja_service_1.poojaService.rescheduleBooking(req.user.userId, req.params.bookingId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Booking rescheduled successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getReceipt(req, res, next) {
        try {
            const receipt = await pooja_service_1.poojaService.getReceipt(req.user.userId, req.params.bookingId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(receipt, 'Digital invoice and receipt retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getLiveSession(req, res, next) {
        try {
            const session = await pooja_service_1.poojaService.getLiveSession(req.user.userId, req.params.bookingId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(session, 'Live pooja session stream details retrieved', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async submitFeedback(req, res, next) {
        try {
            const feedback = await pooja_service_1.poojaService.submitFeedback(req.user.userId, req.params.bookingId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(feedback, feedback.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 4. PRIESTS
    // =========================================================================
    async listPriests(req, res, next) {
        try {
            const priests = await pooja_service_1.poojaService.listPriests();
            res.status(200).json((0, api_response_1.createSuccessResponse)(priests, 'Priests retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPriestDetails(req, res, next) {
        try {
            const priest = await pooja_service_1.poojaService.getPriestDetails(req.params.priestId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(priest, 'Priest details retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 5. DEVOTEE REVIEWS & CHECKOUT CONTEXT
    // =========================================================================
    async getCheckoutContext(req, res, next) {
        try {
            const context = await pooja_service_1.poojaService.getCheckoutContext(req.user.userId, req.params.poojaId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(context, 'Checkout context retrieved with family profiles and wallet info', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async addCheckoutFamilyMember(req, res, next) {
        try {
            const member = await pooja_service_1.poojaService.addCheckoutFamilyMember(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(member, member.message, req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PoojaController = PoojaController;
exports.poojaController = new PoojaController();
