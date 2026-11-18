import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../common/utils/logger';

export interface AuditParams {
  userId?: string | null;
  action: string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditService {
  async log(params: AuditParams, tx: Prisma.TransactionClient = prisma): Promise<void> {
    try {
      await tx.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          resource: params.resource,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
          metadata: params.metadata || {}
        }
      });
    } catch (error) {
      // Never let audit logging failure bring down the primary transaction, but log the failure
      logger.error({ error, params }, 'Failed to write audit log record');
    }
  }
}

export const auditService = new AuditService();

