"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatController = exports.ChatController = void 0;
const chat_service_1 = require("./chat.service");
const wallet_service_1 = require("../wallet/wallet.service");
const api_response_1 = require("../../common/types/api-response");
class ChatController {
    async requestChat(req, res, next) {
        try {
            const result = await chat_service_1.chatService.requestChat(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Chat request sent to astrologer. Waiting for acceptance.', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getSessionDetails(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const result = await chat_service_1.chatService.getSessionDetails(req.user.userId, sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Chat session details retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async cancelRequest(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const result = await chat_service_1.chatService.cancelRequest(req.user.userId, sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Chat request cancelled successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async listCustomerSessions(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const status = req.query.status;
            const result = await chat_service_1.chatService.getSessions(req.user.userId, 'CUSTOMER', { page, limit, status });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Customer chat sessions retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async sendMessage(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const result = await chat_service_1.chatService.sendMessage(req.user.userId, sessionId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Chat message sent successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getMessages(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const before = req.query.before;
            const result = await chat_service_1.chatService.getMessages(req.user.userId, sessionId, { page, limit, before });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Chat messages retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async endSession(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const reason = req.body?.reason;
            const result = await chat_service_1.chatService.endSession(req.user.userId, sessionId, reason);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Chat consultation concluded successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async createAttachmentUpload(req, res, next) {
        try {
            const sessionId = req.params.sessionId;
            const result = await chat_service_1.chatService.createAttachment(req.user.userId, sessionId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(result, 'Attachment upload initialized', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getChatTransactions(req, res, next) {
        try {
            const page = req.query.page ? parseInt(req.query.page, 10) : 1;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
            const result = await wallet_service_1.walletService.getChatTransactions(req.user.userId, { page, limit });
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'User chat transaction history retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ChatController = ChatController;
exports.chatController = new ChatController();
