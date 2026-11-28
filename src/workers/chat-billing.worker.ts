import { prisma } from '../config/database';
import { chatBillingService } from '../modules/chat/chat-billing.service';
import { getSocketIO } from '../realtime/socket';
import { logger } from '../common/utils/logger';

let timer: NodeJS.Timeout | null = null;
let isProcessing = false;

/**
 * Periodically processes started-minute debits for all ACTIVE chat sessions.
 * Gracefully terminates sessions whose customer has insufficient wallet balance.
 */
export async function processActiveChatBilling(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const activeSessions = await prisma.chat_sessions.findMany({
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

    const io = getSocketIO();

    for (const session of activeSessions) {
      try {
        const result = await chatBillingService.processIntervalBilling(session.chat_session_id);

        if (result.ended) {
          logger.info(
            { sessionId: session.chat_session_id, reason: result.reason },
            'Active chat consultation terminated automatically by billing engine'
          );

          if (io) {
            const payload = {
              sessionId: session.chat_session_id,
              status: 'COMPLETED',
              endReason: result.reason,
              message:
                result.reason === 'INSUFFICIENT_FUNDS'
                  ? 'Chat consultation ended due to insufficient wallet balance.'
                  : 'Chat consultation ended due to a billing issue.'
            };

            io.to(`chat:${session.chat_session_id}`).emit('chat:session:ended', payload);
            io.to(`user:${session.customer_user_id}`).emit('chat:session:ended', payload);
            io.to(`astrologer:${session.astrologer_id}`).emit('chat:session:ended', payload);
          }
        }
      } catch (itemErr) {
        logger.error({ err: itemErr, sessionId: session.chat_session_id }, 'Error processing session billing tick');
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error in chat billing worker sweep');
  } finally {
    isProcessing = false;
  }
}

export function startChatBillingWorker(intervalMs = 5000): void {
  if (timer) return;
  logger.info(`Starting Chat Billing Worker (interval: ${intervalMs}ms)...`);
  timer = setInterval(async () => {
    await processActiveChatBilling();
  }, intervalMs);
}

export function stopChatBillingWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('Chat Billing Worker stopped.');
  }
}
