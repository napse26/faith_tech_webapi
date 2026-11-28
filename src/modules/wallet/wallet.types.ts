export type Money = number | string;

export interface WalletMutationInput {
  userId: bigint;
  amount: number;
  transactionType: 'CREDIT' | 'DEBIT' | 'TOPUP' | 'CHAT_DEBIT' | 'CHAT_REFUND' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT';
  referenceNo: string;
  idempotencyKey?: string;
  remarks?: string;
}

export interface WalletMutationResult {
  walletId: number;
  transactionId: number;
  balanceBefore: number;
  balanceAfter: number;
  amount: number;
  transactionType: string;
  referenceNo: string;
  duplicate: boolean;
}

export interface WalletBalanceResponse {
  currency: 'INR';
  balance: number;
  userId: number;
  walletId: number;
  updatedAt?: string;
}

export interface WalletTransactionFilter {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateTopupOrderDto {
  amount: number;
  currency?: string;
}

export interface VerifyTopupDto {
  orderId: string;
  paymentId: string;
  signature?: string;
  amount: number;
}
