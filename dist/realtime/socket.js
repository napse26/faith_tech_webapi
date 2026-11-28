"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocketIO = initSocketIO;
exports.getSocketIO = getSocketIO;
exports.closeSocketIO = closeSocketIO;
const socket_io_1 = require("socket.io");
const session_service_1 = require("../modules/sessions/session.service");
const database_1 = require("../config/database");
const logger_1 = require("../common/utils/logger");
let io = null;
/**
 * Initializes the Socket.IO server and binds authentication and event handlers.
 */
function initSocketIO(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        pingTimeout: 30000,
        pingInterval: 10000
    });
    // Socket Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                (socket.handshake.headers?.authorization?.startsWith('Bearer ')
                    ? socket.handshake.headers.authorization.substring(7)
                    : null);
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            const payload = session_service_1.sessionService.verifyAccessToken(token);
            if (!payload || !payload.sub) {
                return next(new Error('Invalid or expired authentication token'));
            }
            const userId = BigInt(payload.sub);
            socket.userId = userId;
            socket.userRole = payload.role || payload.roles?.[0] || 'CUSTOMER';
            // Check if user is also an astrologer
            const astro = await database_1.prisma.astrologers.findUnique({
                where: { user_id: userId },
                select: { astrologer_id: true }
            });
            if (astro) {
                socket.astrologerId = astro.astrologer_id;
            }
            next();
        }
        catch (err) {
            logger_1.logger.warn({ error: err.message }, 'Socket.IO handshake authentication failed');
            next(new Error('Authentication failed'));
        }
    });
    // Socket Connection Handler
    io.on('connection', (socket) => {
        const userId = socket.userId?.toString();
        const astrologerId = socket.astrologerId?.toString();
        logger_1.logger.info({ socketId: socket.id, userId, astrologerId }, 'Socket.IO client connected');
        // Automatically join personal user notification room
        if (userId) {
            socket.join(`user:${userId}`);
        }
        // Automatically join astrologer notification room if user is an astrologer
        if (astrologerId) {
            socket.join(`astrologer:${astrologerId}`);
        }
        // Join a specific chat room
        socket.on('chat:join', async (data) => {
            try {
                if (!data?.sessionId)
                    return;
                const session = await database_1.prisma.chat_sessions.findUnique({
                    where: { chat_session_id: data.sessionId },
                    select: {
                        customer_user_id: true,
                        astrologer_id: true,
                        status: true
                    }
                });
                if (!session) {
                    socket.emit('chat:error', { message: 'Chat session not found' });
                    return;
                }
                // Verify participant authorization
                const isCustomer = socket.userId && session.customer_user_id === socket.userId;
                const isAstrologer = socket.astrologerId && session.astrologer_id === socket.astrologerId;
                if (!isCustomer && !isAstrologer) {
                    socket.emit('chat:error', { message: 'Unauthorized to join this chat session' });
                    return;
                }
                socket.join(`chat:${data.sessionId}`);
                logger_1.logger.info({ socketId: socket.id, sessionId: data.sessionId }, 'Socket joined chat room');
                socket.emit('chat:joined', { sessionId: data.sessionId });
            }
            catch (err) {
                logger_1.logger.error({ err, sessionId: data?.sessionId }, 'Error in chat:join handler');
            }
        });
        // Leave a specific chat room
        socket.on('chat:leave', (data) => {
            if (data?.sessionId) {
                socket.leave(`chat:${data.sessionId}`);
                logger_1.logger.info({ socketId: socket.id, sessionId: data.sessionId }, 'Socket left chat room');
            }
        });
        // Typing indicators
        socket.on('chat:typing', (data) => {
            if (!data?.sessionId)
                return;
            socket.to(`chat:${data.sessionId}`).emit('chat:typing', {
                sessionId: data.sessionId,
                userId: socket.userId?.toString(),
                isAstrologer: !!socket.astrologerId,
                isTyping: !!data.isTyping
            });
        });
        // Read receipt event
        socket.on('chat:read', async (data) => {
            if (!data?.sessionId || !socket.userId)
                return;
            try {
                const now = new Date();
                await database_1.prisma.chat_messages.updateMany({
                    where: {
                        chat_session_id: data.sessionId,
                        sender_user_id: { not: socket.userId },
                        is_read: false
                    },
                    data: {
                        is_read: true
                    }
                });
                socket.to(`chat:${data.sessionId}`).emit('chat:messages:read', {
                    sessionId: data.sessionId,
                    readByUserId: socket.userId.toString(),
                    readAt: now.toISOString()
                });
            }
            catch (err) {
                logger_1.logger.error({ err, sessionId: data.sessionId }, 'Error in chat:read handler');
            }
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.info({ socketId: socket.id, userId, reason }, 'Socket.IO client disconnected');
        });
    });
    logger_1.logger.info('Socket.IO realtime server initialized');
    return io;
}
/**
 * Returns the active Socket.IO server instance, or null if not yet initialized.
 */
function getSocketIO() {
    return io;
}
/**
 * Closes the Socket.IO instance cleanly on shutdown.
 */
async function closeSocketIO() {
    if (io) {
        await new Promise((resolve) => {
            io.close(() => {
                logger_1.logger.info('Socket.IO server closed');
                io = null;
                resolve();
            });
        });
    }
}
