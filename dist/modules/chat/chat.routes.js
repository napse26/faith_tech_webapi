"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = require("express");
const chat_controller_1 = require("./chat.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const chat_schemas_1 = require("./chat.schemas");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// 1. Request chat with an astrologer
router.post('/requests', (0, validate_1.validate)({ body: chat_schemas_1.createChatRequestSchema }), chat_controller_1.chatController.requestChat);
router.get('/requests/:sessionId', chat_controller_1.chatController.getSessionDetails);
router.post('/requests/:sessionId/cancel', chat_controller_1.chatController.cancelRequest);
// 2. Chat sessions lifecycle
router.get('/sessions', chat_controller_1.chatController.listCustomerSessions);
router.get('/sessions/:sessionId', chat_controller_1.chatController.getSessionDetails);
router.post('/sessions/:sessionId/end', (0, validate_1.validate)({ body: chat_schemas_1.endChatSessionSchema }), chat_controller_1.chatController.endSession);
// 3. Messages & attachments
router.get('/sessions/:sessionId/messages', chat_controller_1.chatController.getMessages);
router.post('/sessions/:sessionId/messages', (0, validate_1.validate)({ body: chat_schemas_1.sendChatMessageSchema }), chat_controller_1.chatController.sendMessage);
router.post('/sessions/:sessionId/attachments/upload-url', (0, validate_1.validate)({ body: chat_schemas_1.createAttachmentUploadSchema }), chat_controller_1.chatController.createAttachmentUpload);
// 4. User-wise Chat Transaction History
router.get('/transactions', chat_controller_1.chatController.getChatTransactions);
exports.chatRoutes = router;
