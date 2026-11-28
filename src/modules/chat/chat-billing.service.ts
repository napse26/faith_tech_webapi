import { prisma } from '../../config/database';
import { walletService } from '../wallet/wallet.service';
import { logger } from '../../common/utils/logger';

export class ChatBillingService {
  /**
   * Initializes billing upon astrologer acceptance.
   * Debits minute 1 upfront and marks billing RUNNING.
   */
  async startBilling(sessionId: string) {
    const session = await prisma.chat_sessions.findUnique({
      where: { chat_session_id: sessionId }
    });

    if (!session || session.status !== 'ACTIVE') {
      return;
    }

    const rate = Number(session.rate_per_minute);
    const minuteNumber = 1;
    const idempotencyKey = `chat:${session.chat_session_id}:minute:${minuteNumber}`;
    const referenceNo = `CHAT_M1_${session.chat_session_id.substring(0, 8).toUpperCase()}`;

    // Atomic debit for first minute
    const debitResult = await walletService.debit({
      userId: session.customer_user_id,
      amount: rate,
      transactionType: 'CHAT_DEBIT',
      referenceNo,
      idempotencyKey,
      remarks: `Minute 1 charge for chat consultation`
    });

    // Record billing entry
    await prisma.chat_billing_entries.create({
      data: {
        chat_session_id: session.chat_session_id,
        minute_number: minuteNumber,
        amount: rate,
        wallet_transaction_id: BigInt(debitResult.transactionId),
        status: 'CHARGED',
        idempotency_key: idempotencyKey,
        billed_at: new Date()
      }
    });

    // Update session state
    await prisma.chat_sessions.update({
      where: { chat_session_id: session.chat_session_id },
      data: {
        last_billed_minute: 1,
        billable_minutes: 1,
        gross_amount: rate,
        billing_status: 'RUNNING',
        updated_at: new Date()
      }
    });

    logger.info({ sessionId, rate }, 'Started billing minute 1 successfully');
  }

  /**
   * Charges the next billable started minute.
   * If customer wallet has insufficient funds, safely terminates the chat.
   */
  async processIntervalBilling(sessionId: string) {
    const session = await prisma.chat_sessions.findUnique({
      where: { chat_session_id: sessionId }
    });

    if (!session || session.status !== 'ACTIVE' || !session.billing_started_at) {
      return { active: false };
    }

    const elapsedSeconds = Math.max(0, (Date.now() - session.billing_started_at.getTime()) / 1000);
    const requiredMinute = Math.max(1, Math.ceil(elapsedSeconds / 60));

    if (requiredMinute <= session.last_billed_minute) {
      return { active: true, billedMinute: session.last_billed_minute };
    }

    const nextMinute = session.last_billed_minute + 1;
    const rate = Number(session.rate_per_minute);

    // Check customer wallet balance first
    const walletBalance = await walletService.getBalance(session.customer_user_id);
    if (walletBalance.balance < rate) {
      logger.warn({ sessionId, balance: walletBalance.balance, rate }, 'Insufficient balance for next minute, ending chat');
      await this.settleSession(sessionId, 'INSUFFICIENT_FUNDS');
      return { active: false, ended: true, reason: 'INSUFFICIENT_FUNDS' };
    }

    const idempotencyKey = `chat:${session.chat_session_id}:minute:${nextMinute}`;
    const referenceNo = `CHAT_M${nextMinute}_${session.chat_session_id.substring(0, 8).toUpperCase()}`;

    try {
      const debitResult = await walletService.debit({
        userId: session.customer_user_id,
        amount: rate,
        transactionType: 'CHAT_DEBIT',
        referenceNo,
        idempotencyKey,
        remarks: `Minute ${nextMinute} charge for chat consultation`
      });

      await prisma.chat_billing_entries.create({
        data: {
          chat_session_id: session.chat_session_id,
          minute_number: nextMinute,
          amount: rate,
          wallet_transaction_id: BigInt(debitResult.transactionId),
          status: 'CHARGED',
          idempotency_key: idempotencyKey,
          billed_at: new Date()
        }
      });

      const updatedGross = Number((Number(session.gross_amount) + rate).toFixed(2));

      await prisma.chat_sessions.update({
        where: { chat_session_id: session.chat_session_id },
        data: {
          last_billed_minute: nextMinute,
          billable_minutes: nextMinute,
          gross_amount: updatedGross,
          updated_at: new Date()
        }
      });

      return { active: true, billedMinute: nextMinute, grossAmount: updatedGross };
    } catch (err) {
      logger.error({ err, sessionId, nextMinute }, 'Failed to debit next minute, stopping chat');
      await this.settleSession(sessionId, 'BILLING_FAILURE');
      return { active: false, ended: true, reason: 'BILLING_FAILURE' };
    }
  }

  /**
   * Finalizes and settles a chat session.
   * Updates duration, commission, astrologer earnings, and releases astrologer busy status.
   */
  async settleSession(sessionId: string, endReason: string, endedByUserId?: bigint) {
    const session = await prisma.chat_sessions.findUnique({
      where: { chat_session_id: sessionId }
    });

    if (!session || session.status === 'COMPLETED' || session.status === 'CANCELLED' || session.status === 'REJECTED') {
      return session;
    }

    const now = new Date();
    const rate = Number(session.rate_per_minute);
    const billableMinutes = session.billable_minutes > 0 ? session.billable_minutes : (session.billing_started_at ? 1 : 0);
    const grossAmount = Number((billableMinutes * rate).toFixed(2));

    const commissionPercent = Number(session.commission_percentage ?? 20);
    const platformCommission = Number(((grossAmount * commissionPercent) / 100).toFixed(2));
    const astrologerEarning = Number((grossAmount - platformCommission).toFixed(2));

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mark session COMPLETED & SETTLED
      const res = await tx.chat_sessions.update({
        where: { chat_session_id: sessionId },
        data: {
          status: 'COMPLETED',
          billing_status: 'SETTLED',
          ended_at: now,
          ended_by_user_id: endedByUserId,
          end_reason: endReason,
          billable_minutes: billableMinutes,
          gross_amount: grossAmount,
          platform_commission: platformCommission,
          astrologer_earning: astrologerEarning,
          updated_at: now
        }
      });

      // 2. Release astrologer availability
      await tx.astrologers.update({
        where: { astrologer_id: session.astrologer_id },
        data: {
          is_busy: false,
          total_chat_minutes: { increment: billableMinutes },
          total_earnings: { increment: astrologerEarning },
          total_consultations: { increment: 1 }
        }
      });

      // 3. Create session event audit
      await tx.chat_session_events.create({
        data: {
          chat_session_id: sessionId,
          actor_user_id: endedByUserId,
          event_type: 'SESSION_COMPLETED',
          payload: {
            endReason,
            billableMinutes,
            grossAmount,
            astrologerEarning,
            platformCommission
          }
        }
      });

      return res;
    });

    logger.info({ sessionId, billableMinutes, grossAmount, astrologerEarning }, 'Settled chat session successfully');
    return updated;
  }
}

export const chatBillingService = new ChatBillingService();
