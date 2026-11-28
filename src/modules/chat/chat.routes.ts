import { Router } from 'express';
import { chatController } from './chat.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  createChatRequestSchema,
  sendChatMessageSchema,
  createAttachmentUploadSchema,
  endChatSessionSchema
} from './chat.schemas';

const router = Router();

router.use(authenticate);

// 1. Request chat with an astrologer
router.post('/requests', validate({ body: createChatRequestSchema }), chatController.requestChat);
router.get('/requests/:sessionId', chatController.getSessionDetails);
router.post('/requests/:sessionId/cancel', chatController.cancelRequest);

// 2. Chat sessions lifecycle
router.get('/sessions', chatController.listCustomerSessions);
router.get('/sessions/:sessionId', chatController.getSessionDetails);
router.post('/sessions/:sessionId/end', validate({ body: endChatSessionSchema }), chatController.endSession);

// 3. Messages & attachments
router.get('/sessions/:sessionId/messages', chatController.getMessages);
router.post('/sessions/:sessionId/messages', validate({ body: sendChatMessageSchema }), chatController.sendMessage);
router.post('/sessions/:sessionId/attachments/upload-url', validate({ body: createAttachmentUploadSchema }), chatController.createAttachmentUpload);

// 4. User-wise Chat Transaction History
router.get('/transactions', chatController.getChatTransactions);

export const chatRoutes = router;
