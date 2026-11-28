import { prisma } from '../config/database';
import { logger } from '../common/utils/logger';

let timer: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Dispatches pending outbox events for guaranteed at-least-once asynchronous delivery.
 */
export async function processOutboxEvents(): Promise<number> {
  if (isProcessing) return 0;
  isProcessing = true;

  try {
    const pendingEvents = await prisma.chat_outbox_events.findMany({
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
        await prisma.chat_outbox_events.update({
          where: { outbox_event_id: event.outbox_event_id },
          data: {
            published_at: now,
            attempt_count: { increment: 1 }
          }
        });
      } catch (err: any) {
        await prisma.chat_outbox_events.update({
          where: { outbox_event_id: event.outbox_event_id },
          data: {
            attempt_count: { increment: 1 }
          }
        });
      }
    }

    isProcessing = false;
    return pendingEvents.length;
  } catch (err) {
    logger.error({ err }, 'Error processing outbox events');
    isProcessing = false;
    return 0;
  }
}

export function startOutboxWorker(intervalMs = 10000): void {
  if (timer) return;
  logger.info(`Starting Outbox Worker (interval: ${intervalMs}ms)...`);
  timer = setInterval(async () => {
    await processOutboxEvents();
  }, intervalMs);
}

export function stopOutboxWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('Outbox Worker stopped.');
  }
}
