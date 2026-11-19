import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

export interface AuthAuditParams {
  userId?: bigint | number | string | null;
  phoneNumber?: string | null;
  eventType: string;
  ipAddress?: string | null;
  deviceId?: string | null;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  failureReason?: string | null;
}

export class AuditService {
  async log(params: AuthAuditParams, tx: Prisma.TransactionClient = prisma): Promise<void> {
    try {
      let parsedUserId: bigint | null = null;
      if (params.userId !== undefined && params.userId !== null) {
        parsedUserId = BigInt(params.userId.toString());
      }

      await tx.auth_audit_logs.create({
        data: {
          user_id: parsedUserId,
          phone_number: params.phoneNumber ? params.phoneNumber.slice(0, 20) : null,
          event_type: params.eventType,
          ip_address: params.ipAddress ? params.ipAddress.slice(0, 45) : null,
          device_id: params.deviceId ? params.deviceId.slice(0, 255) : null,
          status: params.status,
          failure_reason: params.failureReason ? params.failureReason.slice(0, 100) : null
        }
      });
    } catch (error) {
      // Never let audit logging failure bring down the primary transaction, but log the failure
      logger.error({ error, params }, 'Failed to write auth audit log record');
    }
  }
}

export const auditService = new AuditService();
