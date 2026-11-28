"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.astrologerChatController = exports.AstrologerChatController = void 0;
const chat_service_1 = require("./chat.service");
const api_response_1 = require("../../common/types/api-response");
class AstrologerChatController {
    async getPendingRequests(req, res, next) {
        try {
            const result = await chat_service_1.chatService.getPendingRequestsForAstrologer(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Pending chat requests retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async acceptRequest(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const result = await chat_service_1.chatService.acceptChat(req.user.userId, sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Chat request accepted and consultation started', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async rejectRequest(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const reason = req.body?.reason;
            const result = await chat_service_1.chatService.rejectChat(req.user.userId, sessionId, reason);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Chat request rejected', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async listAstrologerSessions(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const status = req.query.status;
            const result = await chat_service_1.chatService.getSessions(req.user.userId, 'ASTROLOGER', { page, limit, status });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer chat consultations retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async endSession(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const reason = req.body?.reason || 'ASTROLOGER_ENDED';
            const result = await chat_service_1.chatService.endSession(req.user.userId, sessionId, reason);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Chat consultation concluded successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AstrologerChatController = AstrologerChatController;
exports.astrologerChatController = new AstrologerChatController();
