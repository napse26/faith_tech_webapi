"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.astrologerChatRoutes = void 0;
const express_1 = require("express");
const astrologer_chat_controller_1 = require("./astrologer-chat.controller");
const chat_controller_1 = require("./chat.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const chat_schemas_1 = require("./chat.schemas");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// 1. Astrologer incoming request management
router.get('/requests', astrologer_chat_controller_1.astrologerChatController.getPendingRequests);
router.post('/requests/:sessionId/accept', astrologer_chat_controller_1.astrologerChatController.acceptRequest);
router.post('/requests/:sessionId/reject', (0, validate_1.validate)({ body: chat_schemas_1.rejectChatRequestSchema }), astrologer_chat_controller_1.astrologerChatController.rejectRequest);
// 2. Astrologer chat sessions
router.get('/sessions', astrologer_chat_controller_1.astrologerChatController.listAstrologerSessions);
router.get('/sessions/:sessionId', chat_controller_1.chatController.getSessionDetails);
router.post('/sessions/:sessionId/end', (0, validate_1.validate)({ body: chat_schemas_1.endChatSessionSchema }), astrologer_chat_controller_1.astrologerChatController.endSession);
// 3. Astrologer messages
router.get('/sessions/:sessionId/messages', chat_controller_1.chatController.getMessages);
router.post('/sessions/:sessionId/messages', (0, validate_1.validate)({ body: chat_schemas_1.sendChatMessageSchema }), chat_controller_1.chatController.sendMessage);
exports.astrologerChatRoutes = router;
