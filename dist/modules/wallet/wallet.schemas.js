"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletTransactionQuerySchema = exports.verifyTopupSchema = exports.topupOrderSchema = void 0;
const zod_1 = require("zod");
exports.topupOrderSchema = zod_1.z.object({
    amount: zod_1.z.number().positive('Amount must be positive').max(100000, 'Maximum topup is ₹1,00,000'),
    currency: zod_1.z.string().default('INR')
});
exports.verifyTopupSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(3).max(100),
    paymentId: zod_1.z.string().min(3).max(100),
    signature: zod_1.z.string().optional(),
    amount: zod_1.z.number().positive()
});
exports.walletTransactionQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
    limit: zod_1.z.string().optional().transform(v => (v ? parseInt(v, 10) : 10)),
    type: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional()
});
