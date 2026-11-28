"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = exports.ChatService = void 0;
const database_1 = require("../../config/database");
const app_error_1 = require("../../common/errors/app-error");
const wallet_service_1 = require("../wallet/wallet.service");
const chat_billing_service_1 = require("./chat-billing.service");
const socket_1 = require("../../realtime/socket");
class ChatService {
    /**
     * Helper: Resolves astrologer profile by user_id
     */
    async getAstrologerByUserId(userId) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { user_id: userId }
        });
        if (!astro) {
            throw new app_error_1.ForbiddenError('Authenticated user does not have an active astrologer profile', 'NOT_AN_ASTROLOGER');
        }
        return astro;
    }
    /**
     * 1. Customer initiates a chat request
     */
    async requestChat(customerUserId, dto) {
        const astrologerId = BigInt(dto.astrologerId);
        // 1. Validate astrologer exists & is approved
        const astrologer = await database_1.prisma.astrologers.findFirst({
            where: {
                astrologer_id: astrologerId,
                onboarding_status: 'APPROVED'
            },
            include: {
                users_astrologers_user_idTousers: {
                    select: { user_id: true, full_name: true }
                }
            }
        });
        if (!astrologer) {
            throw new app_error_1.NotFoundError('Astrologer not found or not approved', 'ASTROLOGER_NOT_FOUND');
        }
        if (astrologer.is_busy) {
            throw new app_error_1.BadRequestError('Astrologer is currently busy in another consultation. Please try again shortly.', 'ASTROLOGER_BUSY');
        }
        // 2. Validate customer doesn't have an active or pending request already
        const existingActive = await database_1.prisma.chat_sessions.findFirst({
            where: {
                customer_user_id: customerUserId,
                status: { in: ['PENDING', 'ACTIVE'] }
            }
        });
        if (existingActive) {
            throw new app_error_1.ConflictError('You already have a pending or active chat consultation. Please conclude it first.', 'CONCURRENT_SESSION_NOT_ALLOWED');
        }
        // 3. Snapshot rate and commission
        const ratePerMinute = Number(astrologer.chat_rate && Number(astrologer.chat_rate) > 0 ? astrologer.chat_rate : 20);
        const commissionPercent = Number(astrologer.commission_percentage && Number(astrologer.commission_percentage) >= 0 ? astrologer.commission_percentage : 20);
        // 4. Verify wallet has at least 1 minute of funds
        const wallet = await wallet_service_1.walletService.getBalance(customerUserId);
        if (wallet.balance < ratePerMinute) {
            throw new app_error_1.BadRequestError(`Insufficient wallet balance. You need at least ₹${ratePerMinute.toFixed(2)} for the first minute. Your balance is ₹${wallet.balance.toFixed(2)}.`, 'INSUFFICIENT_BALANCE');
        }
        // 5. Create PENDING session with 30s timeout
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 30000); // 30 seconds expiry
        const session = await database_1.prisma.chat_sessions.create({
            data: {
                customer_user_id: customerUserId,
                astrologer_id: astrologerId,
                status: 'PENDING',
                billing_status: 'NOT_STARTED',
                rate_per_minute: ratePerMinute,
                currency: 'INR',
                commission_percentage: commissionPercent,
                requested_at: now,
                expires_at: expiresAt,
                client_request_id: dto.clientRequestId
            },
            include: {
                customer: {
                    select: { user_id: true, full_name: true, mobile_no: true }
                },
                astrologers: {
                    select: { astrologer_id: true, display_name: true, profile_image: true }
                }
            }
        });
        // 6. Record audit event
        await database_1.prisma.chat_session_events.create({
            data: {
                chat_session_id: session.chat_session_id,
                actor_user_id: customerUserId,
                event_type: 'REQUEST_CREATED',
                payload: {
                    ratePerMinute,
                    expiresAt: expiresAt.toISOString()
                }
            }
        });
        // 7. Emit Socket.IO notification to astrologer channel
        const io = (0, socket_1.getSocketIO)();
        if (io) {
            io.to(`astrologer:${astrologer.astrologer_id}`).emit('chat:request:incoming', {
                chat_session_id: session.chat_session_id,
                customer_name: session.customer.full_name || 'Devotee',
                customer_user_id: Number(session.customer.user_id),
                rate_per_minute: ratePerMinute,
                expires_at: expiresAt.toISOString(),
                timeout_seconds: 30
            });
        }
        return {
            chat_session_id: session.chat_session_id,
            status: session.status,
            rate_per_minute: ratePerMinute,
            currency: session.currency,
            expires_at: session.expires_at,
            timeout_seconds: 30,
            astrologer: {
                astrologer_id: Number(astrologer.astrologer_id),
                display_name: astrologer.display_name,
                profile_image: astrologer.profile_image
            }
        };
    }
    /**
     * 2. Astrologer fetches incoming pending requests
     */
    async getPendingRequestsForAstrologer(astrologerUserId) {
        const astro = await this.getAstrologerByUserId(astrologerUserId);
        const now = new Date();
        const requests = await database_1.prisma.chat_sessions.findMany({
            where: {
                astrologer_id: astro.astrologer_id,
                status: 'PENDING',
                expires_at: { gt: now }
            },
            orderBy: { requested_at: 'desc' },
            include: {
                customer: {
                    select: { user_id: true, full_name: true, mobile_no: true }
                }
            }
        });
        return requests.map(r => ({
            chat_session_id: r.chat_session_id,
            customer_user_id: Number(r.customer_user_id),
            customer_name: r.customer.full_name || 'Devotee',
            rate_per_minute: Number(r.rate_per_minute),
            requested_at: r.requested_at,
            expires_at: r.expires_at,
            remaining_seconds: Math.max(0, Math.ceil((r.expires_at.getTime() - now.getTime()) / 1000))
        }));
    }
    /**
     * 3. Astrologer manually accepts a pending chat request
     */
    async acceptChat(astrologerUserId, sessionId) {
        const astro = await this.getAstrologerByUserId(astrologerUserId);
        const now = new Date();
        const session = await database_1.prisma.chat_sessions.findUnique({
            where: { chat_session_id: sessionId }
        });
        if (!session) {
            throw new app_error_1.NotFoundError('Chat session not found', 'CHAT_SESSION_NOT_FOUND');
        }
        if (session.astrologer_id !== astro.astrologer_id) {
            throw new app_error_1.ForbiddenError('You are not authorized to accept this chat session', 'FORBIDDEN');
        }
        if (session.status !== 'PENDING') {
            throw new app_error_1.ConflictError(`Chat request is already ${session.status.toLowerCase()}`, 'CHAT_ALREADY_DECIDED');
        }
        if (session.expires_at < now) {
            await database_1.prisma.chat_sessions.update({
                where: { chat_session_id: sessionId },
                data: { status: 'EXPIRED', end_reason: 'TIMEOUT' }
            });
            throw new app_error_1.BadRequestError('Chat request has expired', 'CHAT_REQUEST_EXPIRED');
        }
        // Re-verify customer balance before activation
        const rate = Number(session.rate_per_minute);
        const wallet = await wallet_service_1.walletService.getBalance(session.customer_user_id);
        if (wallet.balance < rate) {
            await database_1.prisma.chat_sessions.update({
                where: { chat_session_id: sessionId },
                data: { status: 'FAILED', end_reason: 'INSUFFICIENT_FUNDS' }
            });
            throw new app_error_1.BadRequestError('Customer balance is no longer sufficient to begin chat', 'INSUFFICIENT_BALANCE');
        }
        // Atomic acceptance & status lock
        const updated = await database_1.prisma.$transaction(async (tx) => {
            const activeSession = await tx.chat_sessions.update({
                where: { chat_session_id: sessionId },
                data: {
                    status: 'ACTIVE',
                    accepted_at: now,
                    billing_started_at: now,
                    updated_at: now
                }
            });
            await tx.astrologers.update({
                where: { astrologer_id: astro.astrologer_id },
                data: { is_busy: true }
            });
            await tx.chat_session_events.create({
                data: {
                    chat_session_id: sessionId,
                    actor_user_id: astrologerUserId,
                    event_type: 'REQUEST_ACCEPTED',
                    payload: { acceptedAt: now.toISOString() }
                }
            });
            return activeSession;
        });
        // Debit first minute upfront
        await chat_billing_service_1.chatBillingService.startBilling(sessionId);
        // Socket.IO notification to customer and astrologer
        const io = (0, socket_1.getSocketIO)();
        if (io) {
            io.to(`user:${session.customer_user_id}`).emit('chat:request:accepted', {
                chat_session_id: sessionId,
                astrologer_id: Number(astro.astrologer_id),
                astrologer_name: astro.display_name,
                billing_started_at: now.toISOString(),
                rate_per_minute: rate
            });
            io.to(`chat:${sessionId}`).emit('chat:session:started', {
                chat_session_id: sessionId,
                billing_started_at: now.toISOString(),
                rate_per_minute: rate
            });
        }
        return {
            chat_session_id: updated.chat_session_id,
            status: updated.status,
            accepted_at: updated.accepted_at,
            billing_started_at: updated.billing_started_at,
            rate_per_minute: Number(updated.rate_per_minute)
        };
    }
    /**
     * 4. Astrologer manually rejects a pending chat request
     */
    async rejectChat(astrologerUserId, sessionId, reason) {
        const astro = await this.getAstrologerByUserId(astrologerUserId);
        const session = await database_1.prisma.chat_sessions.findUnique({
            where: { chat_session_id: sessionId }
        });
        if (!session) {
            throw new app_error_1.NotFoundError('Chat session not found', 'CHAT_SESSION_NOT_FOUND');
        }
        if (session.astrologer_id !== astro.astrologer_id) {
            throw new app_error_1.ForbiddenError('You are not authorized to reject this chat session', 'FORBIDDEN');
        }
        if (session.status !== 'PENDING') {
            throw new app_error_1.ConflictError(`Chat request is already ${session.status.toLowerCase()}`, 'CHAT_ALREADY_DECIDED');
        }
        const updated = await database_1.prisma.chat_sessions.update({
            where: { chat_session_id: sessionId },
            data: {
                status: 'REJECTED',
                end_reason: reason || 'ASTROLOGER_REJECTED',
                ended_at: new Date(),
                updated_at: new Date()
            }
        });
        await database_1.prisma.chat_session_events.create({
            data: {
                chat_session_id: sessionId,
                actor_user_id: astrologerUserId,
                event_type: 'REQUEST_REJECTED',
                payload: { reason }
            }
        });
        const io = (0, socket_1.getSocketIO)();
        if (io) {
            io.to(`user:${session.customer_user_id}`).emit('chat:request:rejected', {
                chat_session_id: sessionId,
                reason: reason || 'Astrologer is unable to take consultation at this moment'
            });
        }
        return {
            chat_session_id: updated.chat_session_id,
            status: updated.status,
            reason: updated.end_reason
        };
    }
    /**
     * 5. Customer cancels pending request before response
     */
    async cancelRequest(customerUserId, sessionId) {
        const session = await database_1.prisma.chat_sessions.findUnique({
            where: { chat_session_id: sessionId }
        });
        if (!session) {
            throw new app_error_1.NotFoundError('Chat session not found', 'CHAT_SESSION_NOT_FOUND');
        }
        if (session.customer_user_id !== customerUserId) {
            throw new app_error_1.ForbiddenError('You can only cancel your own requests', 'FORBIDDEN');
        }
        if (session.status !== 'PENDING') {
            throw new app_error_1.BadRequestError(`Cannot cancel session in ${session.status} status`, 'INVALID_SESSION_STATUS');
        }
        const updated = await database_1.prisma.chat_sessions.update({
            where: { chat_session_id: sessionId },
            data: {
                status: 'CANCELLED',
                end_reason: 'CUSTOMER_CANCELLED',
                ended_at: new Date(),
                updated_at: new Date()
            }
        });
        const io = (0, socket_1.getSocketIO)();
        if (io) {
            io.to(`astrologer:${session.astrologer_id}`).emit('chat:request:cancelled', {
                chat_session_id: sessionId
            });
        }
        return {
            chat_session_id: updated.chat_session_id,
            status: updated.status
        };
    }
    /**
     * 6. End an active chat session (Customer or Astrologer)
     */
    async endSession(userId, sessionId, reason) {
        const session = await database_1.prisma.chat_sessions.findUnique({
            where: { chat_session_id: sessionId },
            include: { astrologers: true }
        });
        if (!session) {
            throw new app_error_1.NotFoundError('Chat session not found', 'CHAT_SESSION_NOT_FOUND');
        }
        const isCustomer = session.customer_user_id === userId;
        const isAstrologer = session.astrologers.user_id === userId;
        if (!isCustomer && !isAstrologer) {
            throw new app_error_1.ForbiddenError('You are not a participant in this chat session', 'FORBIDDEN');
        }
        const endReason = reason || (isCustomer ? 'CUSTOMER_ENDED' : 'ASTROLOGER_ENDED');
        const settled = await chat_billing_service_1.chatBillingService.settleSession(sessionId, endReason, userId);
        const io = (0, socket_1.getSocketIO)();
        if (io) {
            io.to(`chat:${sessionId}`).emit('chat:session:ended', {
                chat_session_id: sessionId,
                ended_at: settled?.ended_at?.toISOString(),
                billable_minutes: settled?.billable_minutes,
                gross_amount: Number(settled?.gross_amount ?? 0),
                reason: endReason
            });
        }
        return {
            chat_session_id: session.chat_session_id,
            status: 'COMPLETED',
            billable_minutes: settled?.billable_minutes,
            gross_amount: Number(settled?.gross_amount ?? 0),
            ended_at: settled?.ended_at,
            end_reason: endReason
        };
    }
    /**
     * 7. Get sessions list for user (Customer or Astrologer)
     */
    async getSessions(userId, role, filter) {
        const page = Math.max(1, filter.page || 1);
        const limit = Math.min(50, Math.max(1, filter.limit || 10));
        const skip = (page - 1) * limit;
        const where = {};
        if (role === 'CUSTOMER') {
            where.customer_user_id = userId;
        }
        else {
            const astro = await this.getAstrologerByUserId(userId);
            where.astrologer_id = astro.astrologer_id;
        }
        if (filter.status) {
            where.status = filter.status;
        }
        const [total, list] = await Promise.all([
            database_1.prisma.chat_sessions.count({ where }),
            database_1.prisma.chat_sessions.findMany({
                where,
                skip,
                take: limit,
                orderBy: { requested_at: 'desc' },
                include: {
                    customer: {
                        select: { user_id: true, full_name: true, mobile_no: true }
                    },
                    astrologers: {
                        select: { astrologer_id: true, display_name: true, profile_image: true }
                    }
                }
            })
        ]);
        return {
            sessions: list.map(s => ({
                chat_session_id: s.chat_session_id,
                status: s.status,
                billing_status: s.billing_status,
                rate_per_minute: Number(s.rate_per_minute),
                billable_minutes: s.billable_minutes,
                gross_amount: Number(s.gross_amount),
                requested_at: s.requested_at,
                billing_started_at: s.billing_started_at,
                ended_at: s.ended_at,
                end_reason: s.end_reason,
                customer: {
                    user_id: Number(s.customer.user_id),
                    name: s.customer.full_name
                },
                astrologer: {
                    astrologer_id: Number(s.astrologers.astrologer_id),
                    display_name: s.astrologers.display_name,
                    profile_image: s.astrologers.profile_image
                }
            })),
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * 8. Get session details and billing summary
     */
    async getSessionDetails(userId, sessionId) {
        const session = await database_1.prisma.chat_sessions.findUnique({
            where: { chat_session_id: sessionId },
            include: {
                customer: {
                    select: { user_id: true, full_name: true, mobile_no: true }
                },
                astrologers: {
                    select: { astrologer_id: true, user_id: true, display_name: true, profile_image: true, chat_rate: true }
                },
                chat_billing_entries: {
                    orderBy: { minute_number: 'asc' }
                }
            }
        });
        if (!session) {
            throw new app_error_1.NotFoundError('Chat session not found', 'CHAT_SESSION_NOT_FOUND');
        }
        const isCustomer = session.customer_user_id === userId;
        const isAstrologer = session.astrologers.user_id === userId;
        if (!isCustomer && !isAstrologer) {
            throw new app_error_1.ForbiddenError('You are not authorized to view this session', 'FORBIDDEN');
        }
        return {
            chat_session_id: session.chat_session_id,
            status: session.status,
            billing_status: session.billing_status,
            rate_per_minute: Number(session.rate_per_minute),
            billable_minutes: session.billable_minutes,
            gross_amount: Number(session.gross_amount),
            astrologer_earning: isAstrologer ? Number(session.astrologer_earning) : undefined,
            requested_at: session.requested_at,
            accepted_at: session.accepted_at,
            billing_started_at: session.billing_started_at,
            ended_at: session.ended_at,
            end_reason: session.end_reason,
            customer: {
                user_id: Number(session.customer.user_id),
                name: session.customer.full_name
            },
            astrologer: {
                astrologer_id: Number(session.astrologers.astrologer_id),
                display_name: session.astrologers.display_name,
                profile_image: session.astrologers.profile_image
            },
            billing_intervals: session.chat_billing_entries.map(b => ({
                minute: b.minute_number,
                amount: Number(b.amount),
                status: b.status,
                billed_at: b.billed_at
            }))
        };
    }
    /**
     * 9. Send a message (REST fallback)
     */
    async sendMessage(senderUserId, sessionId, dto) {
        const session = await database_1.prisma.chat_sessions.findUnique({
            where: { chat_session_id: sessionId },
            include: { astrologers: true }
        });
        if (!session) {
            throw new app_error_1.NotFoundError('Chat session not found', 'CHAT_SESSION_NOT_FOUND');
        }
        if (session.status !== 'ACTIVE') {
            throw new app_error_1.BadRequestError(`Cannot send message to chat in ${session.status} state`, 'CHAT_NOT_ACTIVE');
        }
        const isCustomer = session.customer_user_id === senderUserId;
        const isAstrologer = session.astrologers.user_id === senderUserId;
        if (!isCustomer && !isAstrologer) {
            throw new app_error_1.ForbiddenError('You are not a participant in this chat session', 'FORBIDDEN');
        }
        // Client idempotency check
        if (dto.clientMessageId) {
            const existing = await database_1.prisma.chat_messages.findFirst({
                where: {
                    chat_session_id: sessionId,
                    client_message_id: dto.clientMessageId
                }
            });
            if (existing) {
                return {
                    chat_message_id: existing.chat_message_id,
                    chat_session_id: existing.chat_session_id,
                    sender_user_id: Number(existing.sender_user_id),
                    message_type: existing.message_type,
                    message_text: existing.message_text,
                    sent_at: existing.sent_at
                };
            }
        }
        const msg = await database_1.prisma.chat_messages.create({
            data: {
                chat_session_id: sessionId,
                sender_user_id: senderUserId,
                message_type: dto.messageType || 'TEXT',
                message_text: dto.text || dto.messageText,
                attachment_id: dto.attachmentId,
                client_message_id: dto.clientMessageId
            },
            include: {
                attachment: true
            }
        });
        const formatted = {
            chat_message_id: msg.chat_message_id,
            chat_session_id: msg.chat_session_id,
            sender_user_id: Number(msg.sender_user_id),
            message_type: msg.message_type,
            message_text: msg.message_text,
            attachment: msg.attachment ? {
                attachment_id: msg.attachment.attachment_id,
                filename: msg.attachment.original_filename,
                media_type: msg.attachment.media_type,
                storage_key: msg.attachment.storage_key,
                duration_seconds: msg.attachment.duration_seconds
            } : null,
            sent_at: msg.sent_at
        };
        // Emit live message to Socket.IO room
        const io = (0, socket_1.getSocketIO)();
        if (io) {
            io.to(`chat:${sessionId}`).emit('chat:message:new', formatted);
        }
        return formatted;
    }
    /**
     * 10. Fetch paginated message history
     */
    async getMessages(userId, sessionId, filter) {
        const session = await database_1.prisma.chat_sessions.findUnique({
            where: { chat_session_id: sessionId },
            include: { astrologers: true }
        });
        if (!session) {
            throw new app_error_1.NotFoundError('Chat session not found', 'CHAT_SESSION_NOT_FOUND');
        }
        const isCustomer = session.customer_user_id === userId;
        const isAstrologer = session.astrologers.user_id === userId;
        if (!isCustomer && !isAstrologer) {
            throw new app_error_1.ForbiddenError('You are not authorized to view this session', 'FORBIDDEN');
        }
        const page = Math.max(1, filter.page || 1);
        const limit = Math.min(100, Math.max(1, filter.limit || 50));
        const skip = (page - 1) * limit;
        const where = {
            chat_session_id: sessionId
        };
        if (filter.before) {
            where.sent_at = { lt: new Date(filter.before) };
        }
        const [total, messages] = await Promise.all([
            database_1.prisma.chat_messages.count({ where }),
            database_1.prisma.chat_messages.findMany({
                where,
                skip,
                take: limit,
                orderBy: { sent_at: 'asc' },
                include: {
                    attachment: true
                }
            })
        ]);
        return {
            chat_session_id: sessionId,
            messages: messages.map(m => ({
                chat_message_id: m.chat_message_id,
                sender_user_id: Number(m.sender_user_id),
                message_type: m.message_type,
                message_text: m.message_text,
                sent_at: m.sent_at,
                attachment: m.attachment ? {
                    attachment_id: m.attachment.attachment_id,
                    filename: m.attachment.original_filename,
                    media_type: m.attachment.media_type,
                    storage_key: m.attachment.storage_key,
                    duration_seconds: m.attachment.duration_seconds
                } : null
            })),
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * 11. Create attachment record for uploaded media
     */
    async createAttachment(userId, sessionId, dto) {
        const session = await database_1.prisma.chat_sessions.findUnique({
            where: { chat_session_id: sessionId },
            include: { astrologers: true }
        });
        if (!session || session.status !== 'ACTIVE') {
            throw new app_error_1.BadRequestError('Attachments can only be uploaded to an active chat session', 'CHAT_NOT_ACTIVE');
        }
        const isCustomer = session.customer_user_id === userId;
        const isAstrologer = session.astrologers.user_id === userId;
        if (!isCustomer && !isAstrologer) {
            throw new app_error_1.ForbiddenError('You are not a participant in this chat session', 'FORBIDDEN');
        }
        const storageKey = `chat/${sessionId}/${Date.now()}_${dto.filename}`;
        const attachment = await database_1.prisma.chat_attachments.create({
            data: {
                chat_session_id: sessionId,
                uploaded_by_user_id: userId,
                storage_provider: 'LOCAL',
                storage_key: storageKey,
                original_filename: dto.filename,
                mime_type: dto.mimeType,
                file_size_bytes: BigInt(dto.sizeBytes),
                media_type: dto.mediaType,
                duration_seconds: dto.durationSeconds,
                scan_status: 'CLEAN'
            }
        });
        return {
            attachment_id: attachment.attachment_id,
            upload_url: `/api/v1/chat/media-upload-simulated?key=${encodeURIComponent(storageKey)}`,
            storage_key: storageKey,
            filename: attachment.original_filename,
            media_type: attachment.media_type
        };
    }
}
exports.ChatService = ChatService;
exports.chatService = new ChatService();
