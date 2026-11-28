"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endChatSessionSchema = exports.rejectChatRequestSchema = exports.createAttachmentUploadSchema = exports.sendChatMessageSchema = exports.createChatRequestSchema = void 0;
const zod_1 = require("zod");
exports.createChatRequestSchema = zod_1.z.object({
    astrologerId: zod_1.z.coerce.number().int().positive('Valid astrologerId is required'),
    clientRequestId: zod_1.z.string().max(100).optional()
});
exports.sendChatMessageSchema = zod_1.z.object({
    messageType: zod_1.z.enum(['TEXT', 'IMAGE', 'FILE', 'VOICE', 'KUNDLI_PDF']).default('TEXT'),
    text: zod_1.z.string().max(5000, 'Message text maximum 5000 characters').optional(),
    messageText: zod_1.z.string().max(5000, 'Message text maximum 5000 characters').optional(),
    attachmentId: zod_1.z.string().uuid().optional(),
    clientMessageId: zod_1.z.string().max(100).optional()
}).refine(data => {
    const content = data.text || data.messageText;
    if (data.messageType === 'TEXT') {
        return !!(content && content.trim().length > 0);
    }
    return !!data.attachmentId;
}, {
    message: 'Text message requires text content; media message requires attachmentId',
    path: ['text']
});
exports.createAttachmentUploadSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1).max(255),
    mimeType: zod_1.z.string().min(1).max(150),
    sizeBytes: zod_1.z.number().int().positive().max(52428800, 'Maximum file size is 50MB'),
    mediaType: zod_1.z.enum(['IMAGE', 'FILE', 'VOICE']),
    durationSeconds: zod_1.z.number().int().positive().max(600).optional()
});
exports.rejectChatRequestSchema = zod_1.z.object({
    reason: zod_1.z.string().max(200).optional()
});
exports.endChatSessionSchema = zod_1.z.object({
    reason: zod_1.z.string().max(100).optional()
});
