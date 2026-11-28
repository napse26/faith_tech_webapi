import { Router } from 'express';
import { walletController } from './wallet.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { topupOrderSchema, verifyTopupSchema, walletTransactionQuerySchema } from './wallet.schemas';

const router = Router();

// All wallet operations require authentication
router.use(authenticate);

// Balance retrieval
router.get('/', walletController.getBalance);
router.get('/balance', walletController.getBalance);

// Transaction history (All and Chat-specific user-wise)
router.get('/transactions', validate({ query: walletTransactionQuerySchema }), walletController.getTransactions);
router.get('/chat-transactions', walletController.getChatTransactions);

// Topup payment lifecycle
router.post('/topup/order', validate({ body: topupOrderSchema }), walletController.createTopupOrder);
router.post('/topup/verify', validate({ body: verifyTopupSchema }), walletController.verifyTopupPayment);

export const walletRoutes = router;
