"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerFamilyController = exports.CustomerFamilyController = void 0;
const customer_family_service_1 = require("./customer-family.service");
const customer_follow_service_1 = require("./customer-follow.service");
const api_response_1 = require("../../common/types/api-response");
class CustomerFamilyController {
    // =========================================================================
    // FAMILY MEMBERS
    // =========================================================================
    async addFamilyMember(req, res, next) {
        try {
            const result = await customer_family_service_1.customerFamilyService.addFamilyMember(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Family member added successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getFamilyMembers(req, res, next) {
        try {
            const result = await customer_family_service_1.customerFamilyService.getFamilyMembers(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Family members retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getFamilyMemberById(req, res, next) {
        try {
            const memberId = BigInt(String(req.params.member_id || req.params.memberId));
            const result = await customer_family_service_1.customerFamilyService.getFamilyMemberById(req.user.userId, memberId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Family member retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateFamilyMember(req, res, next) {
        try {
            const memberId = BigInt(String(req.params.member_id || req.params.memberId));
            const result = await customer_family_service_1.customerFamilyService.updateFamilyMember(req.user.userId, memberId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Family member updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deleteFamilyMember(req, res, next) {
        try {
            const memberId = BigInt(String(req.params.member_id || req.params.memberId));
            const result = await customer_family_service_1.customerFamilyService.deleteFamilyMember(req.user.userId, memberId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Family member deleted successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // ASTROLOGER FOLLOW / UNFOLLOW
    // =========================================================================
    async followAstrologer(req, res, next) {
        try {
            const astrologerId = BigInt(String(req.params.astrologer_id || req.params.astrologerId));
            const result = await customer_follow_service_1.customerFollowService.followAstrologer(req.user.userId, astrologerId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer followed successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async unfollowAstrologer(req, res, next) {
        try {
            const astrologerId = BigInt(String(req.params.astrologer_id || req.params.astrologerId));
            const result = await customer_follow_service_1.customerFollowService.unfollowAstrologer(req.user.userId, astrologerId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer unfollowed successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getFollowedAstrologers(req, res, next) {
        try {
            const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
            const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
            const result = await customer_follow_service_1.customerFollowService.getFollowedAstrologers(req.user.userId, page, limit);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Followed astrologers retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CustomerFamilyController = CustomerFamilyController;
exports.customerFamilyController = new CustomerFamilyController();
