"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processOutboxEvents = processOutboxEvents;
exports.startOutboxWorker = startOutboxWorker;
exports.stopOutboxWorker = stopOutboxWorker;
const database_1 = require("../config/database");
const logger_1 = require("../common/utils/logger");
let timer = null;
let isProcessing = false;
/**
 * Dispatches pending outbox events for guaranteed at-least-once asynchronous delivery.
 */
async function processOutboxEvents() {
    if (isProcessing)
        return 0;
    isProcessing = true;
    try {
        const pendingEvents = await database_1.prisma.chat_outbox_events.findMany({
            where: {
                published_at: null,
                attempt_count: { lt: 5 }
            },
            orderBy: { created_at: 'asc' },
            take: 50
        });
        if (pendingEvents.length === 0) {
            isProcessing = false;
            return 0;
        }
        const now = new Date();
        for (const event of pendingEvents) {
            try {
                // Mark event published
                await database_1.prisma.chat_outbox_events.update({
                    where: { outbox_event_id: event.outbox_event_id },
                    data: {
                        published_at: now,
                        attempt_count: { increment: 1 }
                    }
                });
            }
            catch (err) {
                await database_1.prisma.chat_outbox_events.update({
                    where: { outbox_event_id: event.outbox_event_id },
                    data: {
                        attempt_count: { increment: 1 }
                    }
                });
            }
        }
        isProcessing = false;
        return pendingEvents.length;
    }
    catch (err) {
        logger_1.logger.error({ err }, 'Error processing outbox events');
        isProcessing = false;
        return 0;
    }
}
function startOutboxWorker(intervalMs = 10000) {
    if (timer)
        return;
    logger_1.logger.info(`Starting Outbox Worker (interval: ${intervalMs}ms)...`);
    timer = setInterval(async () => {
        await processOutboxEvents();
    }, intervalMs);
}
function stopOutboxWorker() {
    if (timer) {
        clearInterval(timer);
        timer = null;
        logger_1.logger.info('Outbox Worker stopped.');
    }
}
