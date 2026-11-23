"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const database_1 = require("../../config/database");
const logger_1 = require("../../common/utils/logger");
class AuditService {
    async log(params, tx = database_1.prisma) {
        try {
            let parsedUserId = null;
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
        }
        catch (error) {
            // Never let audit logging failure bring down the primary transaction, but log the failure
            logger_1.logger.error({ error, params }, 'Failed to write auth audit log record');
        }
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
