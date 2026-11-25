"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.isConnectionError = exports.basePrisma = void 0;
exports.createResilientPrismaClient = createResilientPrismaClient;
exports.startDatabaseHeartbeat = startDatabaseHeartbeat;
exports.stopDatabaseHeartbeat = stopDatabaseHeartbeat;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("@prisma/client");
const env_1 = require("./env");
const logger_1 = require("../common/utils/logger");
exports.basePrisma = global.basePrisma ||
    new client_1.PrismaClient({
        log: env_1.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
    });
if (env_1.env.NODE_ENV !== 'production') {
    global.basePrisma = exports.basePrisma;
}
/**
 * Detects transient connection drops, pool timeouts, and socket closures
 */
const isConnectionError = (err) => {
    if (!err)
        return false;
    const message = String(err.message || '').toLowerCase();
    const code = String(err.code || '');
    return (code === 'P1001' || // Can't reach database server
        code === 'P1002' || // Database server reached but timed out
        code === 'P1008' || // Operations timed out
        code === 'P1017' || // Server has closed the connection
        code === 'P2024' || // Timed out fetching a connection from pool
        message.includes("can't reach database server") ||
        message.includes('server has closed the connection') ||
        message.includes('server closed the connection') ||
        message.includes('connection terminated unexpectedly') ||
        message.includes('connection closed') ||
        message.includes('connection lost') ||
        message.includes('econnreset') ||
        message.includes('epipe') ||
        message.includes('etimedout') ||
        message.includes('socket hang up') ||
        message.includes('broken pipe'));
};
exports.isConnectionError = isConnectionError;
/**
 * Creates an extended Prisma client with automated query retry on transient connection drops
 */
function createResilientPrismaClient(client) {
    return client.$extends({
        name: 'auto-reconnect-retry',
        query: {
            $allOperations: async ({ model, operation, args, query }) => {
                let attempts = 0;
                const maxRetries = 2;
                while (true) {
                    try {
                        return await query(args);
                    }
                    catch (error) {
                        attempts++;
                        if ((0, exports.isConnectionError)(error) && attempts <= maxRetries) {
                            logger_1.logger.warn({ model: model || 'raw', operation, attempt: attempts, maxRetries }, '[Prisma] Transient connection drop detected. Auto-reconnecting and retrying query...');
                            try {
                                await exports.basePrisma.$disconnect().catch(() => { });
                                await exports.basePrisma.$connect().catch(() => { });
                            }
                            catch (reconnectErr) {
                                logger_1.logger.warn({ err: reconnectErr.message }, '[Prisma] Reconnection attempt failed, retrying...');
                            }
                            // Brief backoff before retrying
                            await new Promise((resolve) => setTimeout(resolve, 150 * attempts));
                            continue;
                        }
                        throw error;
                    }
                }
            }
        }
    });
}
exports.prisma = global.prisma || createResilientPrismaClient(exports.basePrisma);
if (env_1.env.NODE_ENV !== 'production') {
    global.prisma = exports.prisma;
}
let heartbeatInterval = null;
function startDatabaseHeartbeat() {
    if (heartbeatInterval)
        return;
    // Run a lightweight heartbeat every 25 seconds to keep the Supabase connection warm
    // .unref() ensures this timer does not prevent the Node process from terminating
    heartbeatInterval = setInterval(async () => {
        try {
            await exports.basePrisma.$queryRaw `SELECT 1`;
        }
        catch (err) {
            if ((0, exports.isConnectionError)(err)) {
                try {
                    await exports.basePrisma.$disconnect().catch(() => { });
                    await exports.basePrisma.$connect().catch(() => { });
                }
                catch {
                    // Ignored on background keepalive
                }
            }
        }
    }, 25000);
    heartbeatInterval.unref();
}
function stopDatabaseHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}
// Auto-start heartbeat if not in test environment
if (env_1.env.NODE_ENV !== 'test') {
    startDatabaseHeartbeat();
}
async function connectDatabase() {
    await exports.basePrisma.$connect();
    // Warm up connection with active query to ensure connection pool is ready
    await exports.basePrisma.$queryRaw `SELECT 1`;
    startDatabaseHeartbeat();
}
async function disconnectDatabase() {
    stopDatabaseHeartbeat();
    await exports.basePrisma.$disconnect();
}
