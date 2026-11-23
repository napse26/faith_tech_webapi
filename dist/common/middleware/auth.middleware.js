"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const session_service_1 = require("../../modules/sessions/session.service");
const database_1 = require("../../config/database");
const app_error_1 = require("../errors/app-error");
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next(new app_error_1.UnauthorizedError('Missing or malformed Authorization header', 'UNAUTHORIZED'));
        return;
    }
    const token = authHeader.substring(7).trim();
    try {
        const payload = session_service_1.sessionService.verifyAccessToken(token);
        // Verify session is active in database (revocation check)
        const session = await database_1.prisma.user_sessions.findUnique({
            where: { id: payload.sid },
            select: { id: true, revoked_at: true, expires_at: true }
        });
        if (!session || session.revoked_at !== null || session.expires_at < new Date()) {
            next(new app_error_1.UnauthorizedError('Session has been revoked or expired', 'SESSION_REVOKED'));
            return;
        }
        // Touch session activity asynchronously
        database_1.prisma.user_sessions.update({
            where: { id: session.id },
            data: { last_active_at: new Date() }
        }).catch(() => { });
        // Verify user in DB with their roles
        const user = await database_1.prisma.users.findUnique({
            where: { user_id: BigInt(payload.sub) },
            include: {
                user_roles: {
                    include: {
                        roles: true
                    }
                }
            }
        });
        if (!user) {
            next(new app_error_1.UnauthorizedError('User account not found', 'USER_NOT_FOUND'));
            return;
        }
        const accountStatus = user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE');
        if (accountStatus === 'BLOCKED') {
            next(new app_error_1.ForbiddenError('Account has been blocked', 'ACCOUNT_BLOCKED'));
            return;
        }
        if (accountStatus === 'SUSPENDED') {
            next(new app_error_1.ForbiddenError('Account has been suspended', 'ACCOUNT_SUSPENDED'));
            return;
        }
        const primaryRole = user.user_roles[0]?.roles?.role_name || 'CUSTOMER';
        req.user = {
            id: user.user_id.toString(),
            userId: user.user_id,
            sessionId: payload.sid,
            mobileNumber: user.mobile_no,
            role: primaryRole,
            status: accountStatus
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
