"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = exports.WalletService = void 0;
const database_1 = require("../../config/database");
const app_error_1 = require("../../common/errors/app-error");
class WalletService {
    /**
     * Helper: Resolves existing wallet or creates one if it doesn't exist yet.
     */
    async getOrCreateWallet(userId) {
        let wallet = await database_1.prisma.wallets.findUnique({
            where: { user_id: userId }
        });
        if (!wallet) {
            // Fetch user's current mirror balance if present
            const user = await database_1.prisma.users.findUnique({
                where: { user_id: userId },
                select: { wallet_balance: true }
            });
            const initialBalance = user?.wallet_balance !== null && user?.wallet_balance !== undefined
                ? Number(user.wallet_balance)
                : 0;
            wallet = await database_1.prisma.wallets.create({
                data: {
                    user_id: userId,
                    balance: initialBalance
                }
            });
            // Synchronize user mirror balance
            await database_1.prisma.users.update({
                where: { user_id: userId },
                data: { wallet_balance: initialBalance }
            });
        }
        return wallet;
    }
    /**
     * Authoritative wallet balance retrieval.
     */
    async getBalance(userId) {
        const wallet = await this.getOrCreateWallet(userId);
        const balance = Number(wallet.balance ?? 0);
        return {
            currency: 'INR',
            balance,
            userId: Number(userId),
            walletId: Number(wallet.wallet_id),
            updatedAt: wallet.created_on?.toISOString()
        };
    }
    /**
     * Atomic wallet credit operation with idempotency protection.
     */
    async credit(input) {
        const { userId, amount, transactionType, referenceNo, idempotencyKey, remarks } = input;
        if (amount <= 0) {
            throw new app_error_1.BadRequestError('Credit amount must be greater than zero', 'INVALID_AMOUNT');
        }
        // Check idempotency if key provided
        if (idempotencyKey) {
            const existingRecord = await database_1.prisma.wallet_idempotency_records.findUnique({
                where: {
                    user_id_idempotency_key: {
                        user_id: userId,
                        idempotency_key: idempotencyKey
                    }
                }
            });
            if (existingRecord && existingRecord.status === 'SUCCEEDED' && existingRecord.response_json) {
                return existingRecord.response_json;
            }
        }
        const wallet = await this.getOrCreateWallet(userId);
        const result = await database_1.prisma.$transaction(async (tx) => {
            // Re-fetch current balance within transaction
            const currentWallet = await tx.wallets.findUnique({
                where: { wallet_id: wallet.wallet_id }
            });
            const balanceBefore = Number(currentWallet?.balance ?? 0);
            const balanceAfter = Number((balanceBefore + amount).toFixed(2));
            // 1. Update wallet balance
            await tx.wallets.update({
                where: { wallet_id: wallet.wallet_id },
                data: { balance: balanceAfter }
            });
            // 2. Synchronize user balance mirror
            await tx.users.update({
                where: { user_id: userId },
                data: { wallet_balance: balanceAfter }
            });
            // 3. Insert immutable ledger transaction
            const txn = await tx.wallet_transactions.create({
                data: {
                    wallet_id: wallet.wallet_id,
                    transaction_type: transactionType,
                    amount,
                    reference_no: referenceNo,
                    remarks: remarks || `Wallet credit of ₹${amount}`
                }
            });
            const mutationResult = {
                walletId: Number(wallet.wallet_id),
                transactionId: Number(txn.wallet_transaction_id),
                balanceBefore,
                balanceAfter,
                amount,
                transactionType,
                referenceNo,
                duplicate: false
            };
            // 4. Record idempotency if key exists
            if (idempotencyKey) {
                await tx.wallet_idempotency_records.upsert({
                    where: {
                        user_id_idempotency_key: {
                            user_id: userId,
                            idempotency_key: idempotencyKey
                        }
                    },
                    create: {
                        user_id: userId,
                        idempotency_key: idempotencyKey,
                        operation_type: 'CREDIT',
                        wallet_transaction_id: txn.wallet_transaction_id,
                        status: 'SUCCEEDED',
                        response_json: mutationResult
                    },
                    update: {
                        status: 'SUCCEEDED',
                        wallet_transaction_id: txn.wallet_transaction_id,
                        response_json: mutationResult,
                        updated_at: new Date()
                    }
                });
            }
            return mutationResult;
        });
        return result;
    }
    /**
     * Atomic wallet debit operation with balance check and idempotency protection.
     */
    async debit(input) {
        const { userId, amount, transactionType, referenceNo, idempotencyKey, remarks } = input;
        if (amount <= 0) {
            throw new app_error_1.BadRequestError('Debit amount must be greater than zero', 'INVALID_AMOUNT');
        }
        // Check idempotency if key provided
        if (idempotencyKey) {
            const existingRecord = await database_1.prisma.wallet_idempotency_records.findUnique({
                where: {
                    user_id_idempotency_key: {
                        user_id: userId,
                        idempotency_key: idempotencyKey
                    }
                }
            });
            if (existingRecord && existingRecord.status === 'SUCCEEDED' && existingRecord.response_json) {
                return existingRecord.response_json;
            }
        }
        const wallet = await this.getOrCreateWallet(userId);
        const result = await database_1.prisma.$transaction(async (tx) => {
            // Re-fetch current balance within transaction
            const currentWallet = await tx.wallets.findUnique({
                where: { wallet_id: wallet.wallet_id }
            });
            const balanceBefore = Number(currentWallet?.balance ?? 0);
            if (balanceBefore < amount) {
                throw new app_error_1.BadRequestError(`Insufficient wallet balance. Current balance is ₹${balanceBefore.toFixed(2)}, required ₹${amount.toFixed(2)}`, 'INSUFFICIENT_BALANCE');
            }
            const balanceAfter = Number((balanceBefore - amount).toFixed(2));
            // 1. Update wallet balance
            await tx.wallets.update({
                where: { wallet_id: wallet.wallet_id },
                data: { balance: balanceAfter }
            });
            // 2. Synchronize user balance mirror
            await tx.users.update({
                where: { user_id: userId },
                data: { wallet_balance: balanceAfter }
            });
            // 3. Insert immutable ledger transaction
            const txn = await tx.wallet_transactions.create({
                data: {
                    wallet_id: wallet.wallet_id,
                    transaction_type: transactionType,
                    amount,
                    reference_no: referenceNo,
                    remarks: remarks || `Wallet debit of ₹${amount}`
                }
            });
            const mutationResult = {
                walletId: Number(wallet.wallet_id),
                transactionId: Number(txn.wallet_transaction_id),
                balanceBefore,
                balanceAfter,
                amount,
                transactionType,
                referenceNo,
                duplicate: false
            };
            // 4. Record idempotency if key exists
            if (idempotencyKey) {
                await tx.wallet_idempotency_records.upsert({
                    where: {
                        user_id_idempotency_key: {
                            user_id: userId,
                            idempotency_key: idempotencyKey
                        }
                    },
                    create: {
                        user_id: userId,
                        idempotency_key: idempotencyKey,
                        operation_type: 'DEBIT',
                        wallet_transaction_id: txn.wallet_transaction_id,
                        status: 'SUCCEEDED',
                        response_json: mutationResult
                    },
                    update: {
                        status: 'SUCCEEDED',
                        wallet_transaction_id: txn.wallet_transaction_id,
                        response_json: mutationResult,
                        updated_at: new Date()
                    }
                });
            }
            return mutationResult;
        });
        return result;
    }
    /**
     * Paginated transaction history for the user.
     */
    async getTransactions(userId, filter) {
        const wallet = await this.getOrCreateWallet(userId);
        const page = Math.max(1, filter.page || 1);
        const limit = Math.min(50, Math.max(1, filter.limit || 10));
        const skip = (page - 1) * limit;
        const where = {
            wallet_id: wallet.wallet_id
        };
        if (filter.type) {
            where.transaction_type = filter.type;
        }
        if (filter.startDate || filter.endDate) {
            where.created_on = {};
            if (filter.startDate)
                where.created_on.gte = new Date(filter.startDate);
            if (filter.endDate)
                where.created_on.lte = new Date(filter.endDate);
        }
        const [total, transactions] = await Promise.all([
            database_1.prisma.wallet_transactions.count({ where }),
            database_1.prisma.wallet_transactions.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_on: 'desc' }
            })
        ]);
        return {
            wallet_id: Number(wallet.wallet_id),
            current_balance: Number(wallet.balance ?? 0),
            transactions: transactions.map(t => ({
                transaction_id: Number(t.wallet_transaction_id),
                type: t.transaction_type,
                amount: Number(t.amount),
                reference_no: t.reference_no,
                remarks: t.remarks,
                created_at: t.created_on
            })),
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * User-wise Chat Transaction History.
     * Lists all debits/credits specific to chat consultations for the authenticated user.
     */
    async getChatTransactions(userId, filter) {
        const wallet = await this.getOrCreateWallet(userId);
        const page = Math.max(1, filter.page || 1);
        const limit = Math.min(50, Math.max(1, filter.limit || 10));
        const skip = (page - 1) * limit;
        // Filter for chat consultations:
        // Either transaction_type is CHAT_DEBIT/CHAT_REFUND, or reference_no starts with CHAT or CONS_SESS, or remarks include 'chat'
        const where = {
            wallet_id: wallet.wallet_id,
            OR: [
                { transaction_type: { in: ['CHAT_DEBIT', 'CHAT_REFUND'] } },
                { reference_no: { startsWith: 'CHAT' } },
                { reference_no: { startsWith: 'CONS_SESS' } },
                { remarks: { contains: 'chat', mode: 'insensitive' } }
            ]
        };
        const [total, transactions] = await Promise.all([
            database_1.prisma.wallet_transactions.count({ where }),
            database_1.prisma.wallet_transactions.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_on: 'desc' },
                include: {
                    chat_billing_entries: {
                        include: {
                            chat_sessions: {
                                include: {
                                    astrologers: {
                                        select: {
                                            astrologer_id: true,
                                            display_name: true,
                                            profile_image: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })
        ]);
        const mapped = transactions.map(t => {
            const billingEntry = t.chat_billing_entries && t.chat_billing_entries[0];
            const session = billingEntry?.chat_sessions;
            const astro = session?.astrologers;
            return {
                transaction_id: Number(t.wallet_transaction_id),
                type: t.transaction_type,
                amount: Number(t.amount),
                reference_no: t.reference_no,
                remarks: t.remarks,
                created_at: t.created_on,
                chat_details: session ? {
                    chat_session_id: session.chat_session_id,
                    minute_number: billingEntry?.minute_number,
                    rate_per_minute: Number(session.rate_per_minute),
                    astrologer_id: astro ? Number(astro.astrologer_id) : undefined,
                    astrologer_name: astro?.display_name,
                    astrologer_image: astro?.profile_image
                } : null
            };
        });
        return {
            user_id: Number(userId),
            wallet_id: Number(wallet.wallet_id),
            current_balance: Number(wallet.balance ?? 0),
            chat_transactions: mapped,
            transactions: mapped,
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * Top-up order initiation.
     */
    async createTopupOrder(userId, dto) {
        if (dto.amount <= 0) {
            throw new app_error_1.BadRequestError('Top-up amount must be greater than zero', 'INVALID_AMOUNT');
        }
        const orderId = `ORDER_WALLET_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        return {
            orderId,
            amount: dto.amount,
            currency: dto.currency || 'INR',
            userId: Number(userId),
            merchantName: 'DharmaDarshan Astrology',
            notes: {
                purpose: 'Wallet Recharge',
                userId: Number(userId)
            }
        };
    }
    /**
     * Top-up verification and wallet credit.
     */
    async verifyTopupPayment(userId, dto) {
        const idempotencyKey = `topup:${dto.orderId}:${dto.paymentId}`;
        const creditResult = await this.credit({
            userId,
            amount: dto.amount,
            transactionType: 'TOPUP',
            referenceNo: dto.paymentId,
            idempotencyKey,
            remarks: `Wallet recharge via payment order ${dto.orderId}`
        });
        return {
            orderId: dto.orderId,
            paymentId: dto.paymentId,
            amount: creditResult.amount,
            balanceAfter: creditResult.balanceAfter,
            status: 'SUCCESS',
            message: 'Wallet recharge successful'
        };
    }
}
exports.WalletService = WalletService;
exports.walletService = new WalletService();
