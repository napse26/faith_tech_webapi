"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sweepExpiredChatRequests = sweepExpiredChatRequests;
exports.startChatExpiryWorker = startChatExpiryWorker;
exports.stopChatExpiryWorker = stopChatExpiryWorker;
const database_1 = require("../config/database");
const socket_1 = require("../realtime/socket");
const logger_1 = require("../common/utils/logger");
let timer = null;
let isRunning = false;
/**
 * Sweeps and expires PENDING chat requests that have exceeded their 30-second response window.
 */
async function sweepExpiredChatRequests() {
    if (isRunning)
        return 0;
    isRunning = true;
    try {
        const now = new Date();
        const expiredSessions = await database_1.prisma.chat_sessions.findMany({
            where: {
                status: 'PENDING',
                expires_at: { lte: now }
            },
            include: {
                astrologers: {
                    select: { astrologer_id: true, display_name: true }
                }
            },
            take: 50
        });
        if (expiredSessions.length === 0) {
            isRunning = false;
            return 0;
        }
        const io = (0, socket_1.getSocketIO)();
        for (const session of expiredSessions) {
            try {
                await database_1.prisma.$transaction(async (tx) => {
                    // 1. Update session status
                    await tx.chat_sessions.update({
                        where: { chat_session_id: session.chat_session_id },
                        data: {
                            status: 'EXPIRED',
                            billing_status: 'NOT_STARTED',
                            end_reason: 'ASTROLOGER_TIMEOUT',
                            ended_at: now,
                            updated_at: now
                        }
                    });
                    // 2. Ensure astrologer busy flag is reset
                    await tx.astrologers.update({
                        where: { astrologer_id: session.astrologer_id },
                        data: { is_busy: false }
                    });
                    // 3. Record audit event
                    await tx.chat_session_events.create({
                        data: {
                            chat_session_id: session.chat_session_id,
                            event_type: 'REQUEST_EXPIRED',
                            payload: {
                                reason: 'ASTROLOGER_TIMEOUT',
                                expiredAt: now.toISOString()
                            }
                        }
                    });
                });
                // 4. Notify customer and astrologer via realtime socket
                if (io) {
                    const payload = {
                        sessionId: session.chat_session_id,
                        status: 'EXPIRED',
                        reason: 'ASTROLOGER_TIMEOUT',
                        message: 'Astrologer did not respond within the time limit. No amount was charged.'
                    };
                    io.to(`user:${session.customer_user_id}`).emit('chat:request:expired', payload);
                    io.to(`astrologer:${session.astrologer_id}`).emit('chat:request:expired', payload);
                }
                logger_1.logger.info({ sessionId: session.chat_session_id, astrologerId: session.astrologer_id }, 'Chat request expired due to astrologer response timeout');
            }
            catch (sessionErr) {
                logger_1.logger.error({ err: sessionErr, sessionId: session.chat_session_id }, 'Error expiring chat session');
            }
        }
        isRunning = false;
        return expiredSessions.length;
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Error running chat expiry sweeper');
        isRunning = false;
        return 0;
    }
}
function startChatExpiryWorker(intervalMs = 3000) {
    if (timer)
        return;
    logger_1.logger.info(`Starting Chat Expiry Worker (interval: ${intervalMs}ms)...`);
    timer = setInterval(async () => {
        await sweepExpiredChatRequests();
    }, intervalMs);
}
function stopChatExpiryWorker() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        logger_1.logger.info('Chat Expiry Worker stopped.');
    }
}
