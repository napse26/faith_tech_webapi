"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processActiveChatBilling = processActiveChatBilling;
exports.startChatBillingWorker = startChatBillingWorker;
exports.stopChatBillingWorker = stopChatBillingWorker;
const database_1 = require("../config/database");
const chat_billing_service_1 = require("../modules/chat/chat-billing.service");
const socket_1 = require("../realtime/socket");
const logger_1 = require("../common/utils/logger");
let timer = null;
let isProcessing = false;
/**
 * Periodically processes started-minute debits for all ACTIVE chat sessions.
 * Gracefully terminates sessions whose customer has insufficient wallet balance.
 */
async function processActiveChatBilling() {
    if (isProcessing)
        return;
    isProcessing = true;
    try {
        const activeSessions = await database_1.prisma.chat_sessions.findMany({
            where: {
                status: 'ACTIVE',
                billing_status: 'RUNNING'
            },
            select: {
                chat_session_id: true,
                customer_user_id: true,
                astrologer_id: true,
                billing_started_at: true,
                last_billed_minute: true,
                rate_per_minute: true
            },
            take: 50
        });
        const io = (0, socket_1.getSocketIO)();
        for (const session of activeSessions) {
            try {
                const result = await chat_billing_service_1.chatBillingService.processIntervalBilling(session.chat_session_id);
                if (result.ended) {
                    logger_1.logger.info({ sessionId: session.chat_session_id, reason: result.reason }, 'Active chat consultation terminated automatically by billing engine');
                    if (io) {
                        const payload = {
                            sessionId: session.chat_session_id,
                            status: 'COMPLETED',
                            endReason: result.reason,
                            message: result.reason === 'INSUFFICIENT_FUNDS'
                                ? 'Chat consultation ended due to insufficient wallet balance.'
                                : 'Chat consultation ended due to a billing issue.'
                        };
                        io.to(`chat:${session.chat_session_id}`).emit('chat:session:ended', payload);
                        io.to(`user:${session.customer_user_id}`).emit('chat:session:ended', payload);
                        io.to(`astrologer:${session.astrologer_id}`).emit('chat:session:ended', payload);
                    }
                }
            }
            catch (itemErr) {
                logger_1.logger.error({ err: itemErr, sessionId: session.chat_session_id }, 'Error processing session billing tick');
            }
        }
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Error in chat billing worker sweep');
    }
    finally {
        isProcessing = false;
    }
}
function startChatBillingWorker(intervalMs = 5000) {
    if (timer)
        return;
    logger_1.logger.info(`Starting Chat Billing Worker (interval: ${intervalMs}ms)...`);
    timer = setInterval(async () => {
        await processActiveChatBilling();
    }, intervalMs);
}
function stopChatBillingWorker() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        logger_1.logger.info('Chat Billing Worker stopped.');
    }
}
