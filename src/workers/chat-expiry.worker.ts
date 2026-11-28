import { prisma } from '../config/database';
import { getSocketIO } from '../realtime/socket';
import { logger } from '../common/utils/logger';

let timer: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Sweeps and expires PENDING chat requests that have exceeded their 30-second response window.
 */
export async function sweepExpiredChatRequests(): Promise<number> {
  if (isRunning) return 0;
  isRunning = true;

  try {
    const now = new Date();
    const expiredSessions = await prisma.chat_sessions.findMany({
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

    const io = getSocketIO();

    for (const session of expiredSessions) {
      try {
        await prisma.$transaction(async (tx) => {
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

        logger.info(
          { sessionId: session.chat_session_id, astrologerId: session.astrologer_id },
          'Chat request expired due to astrologer response timeout'
        );
      } catch (sessionErr) {
        logger.error({ err: sessionErr, sessionId: session.chat_session_id }, 'Error expiring chat session');
      }
    }

    isRunning = false;
    return expiredSessions.length;
  } catch (err) {
    logger.error({ err }, 'Error running chat expiry sweeper');
    isRunning = false;
    return 0;
  }
}

export function startChatExpiryWorker(intervalMs = 3000): void {
  if (timer) return;
  logger.info(`Starting Chat Expiry Worker (interval: ${intervalMs}ms)...`);
  timer = setInterval(async () => {
    await sweepExpiredChatRequests();
  }, intervalMs);
}

export function stopChatExpiryWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('Chat Expiry Worker stopped.');
  }
}
