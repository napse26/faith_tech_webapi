import { Router } from 'express';
import { astrologerChatController } from './astrologer-chat.controller';
import { chatController } from './chat.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { rejectChatRequestSchema, endChatSessionSchema, sendChatMessageSchema } from './chat.schemas';

const router = Router();

router.use(authenticate);

// 1. Astrologer incoming request management
router.get('/requests', astrologerChatController.getPendingRequests);
router.post('/requests/:sessionId/accept', astrologerChatController.acceptRequest);
router.post('/requests/:sessionId/reject', validate({ body: rejectChatRequestSchema }), astrologerChatController.rejectRequest);

// 2. Astrologer chat sessions
router.get('/sessions', astrologerChatController.listAstrologerSessions);
router.get('/sessions/:sessionId', chatController.getSessionDetails);
router.post('/sessions/:sessionId/end', validate({ body: endChatSessionSchema }), astrologerChatController.endSession);

// 3. Astrologer messages
router.get('/sessions/:sessionId/messages', chatController.getMessages);
router.post('/sessions/:sessionId/messages', validate({ body: sendChatMessageSchema }), chatController.sendMessage);

export const astrologerChatRoutes = router;
