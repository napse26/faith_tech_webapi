import { z } from 'zod';

export const topupOrderSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(100000, 'Maximum topup is ₹1,00,000'),
  currency: z.string().default('INR')
});

export const verifyTopupSchema = z.object({
  orderId: z.string().min(3).max(100),
  paymentId: z.string().min(3).max(100),
  signature: z.string().optional(),
  amount: z.number().positive()
});

export const walletTransactionQuerySchema = z.object({
  page: z.string().optional().transform(v => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform(v => (v ? parseInt(v, 10) : 10)),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});
