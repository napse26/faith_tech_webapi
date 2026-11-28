import { z } from 'zod';

export const createChatRequestSchema = z.object({
  astrologerId: z.coerce.number().int().positive('Valid astrologerId is required'),
  clientRequestId: z.string().max(100).optional()
});

export const sendChatMessageSchema = z.object({
  messageType: z.enum(['TEXT', 'IMAGE', 'FILE', 'VOICE', 'KUNDLI_PDF']).default('TEXT'),
  text: z.string().max(5000, 'Message text maximum 5000 characters').optional(),
  messageText: z.string().max(5000, 'Message text maximum 5000 characters').optional(),
  attachmentId: z.string().uuid().optional(),
  clientMessageId: z.string().max(100).optional()
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

export const createAttachmentUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(150),
  sizeBytes: z.number().int().positive().max(52428800, 'Maximum file size is 50MB'),
  mediaType: z.enum(['IMAGE', 'FILE', 'VOICE']),
  durationSeconds: z.number().int().positive().max(600).optional()
});

export const rejectChatRequestSchema = z.object({
  reason: z.string().max(200).optional()
});

export const endChatSessionSchema = z.object({
  reason: z.string().max(100).optional()
});
