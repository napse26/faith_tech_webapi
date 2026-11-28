"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRoutes = void 0;
const express_1 = require("express");
const wallet_controller_1 = require("./wallet.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const wallet_schemas_1 = require("./wallet.schemas");
const router = (0, express_1.Router)();
// All wallet operations require authentication
router.use(auth_middleware_1.authenticate);
// Balance retrieval
router.get('/', wallet_controller_1.walletController.getBalance);
router.get('/balance', wallet_controller_1.walletController.getBalance);
// Transaction history (All and Chat-specific user-wise)
router.get('/transactions', (0, validate_1.validate)({ query: wallet_schemas_1.walletTransactionQuerySchema }), wallet_controller_1.walletController.getTransactions);
router.get('/chat-transactions', wallet_controller_1.walletController.getChatTransactions);
// Topup payment lifecycle
router.post('/topup/order', (0, validate_1.validate)({ body: wallet_schemas_1.topupOrderSchema }), wallet_controller_1.walletController.createTopupOrder);
router.post('/topup/verify', (0, validate_1.validate)({ body: wallet_schemas_1.verifyTopupSchema }), wallet_controller_1.walletController.verifyTopupPayment);
exports.walletRoutes = router;
