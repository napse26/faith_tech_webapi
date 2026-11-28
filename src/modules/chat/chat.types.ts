export interface CreateChatRequestDto {
  astrologerId: number;
  clientRequestId?: string;
}

export interface SendChatMessageDto {
  messageType?: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE';
  text?: string;
  attachmentId?: string;
  clientMessageId?: string;
}

export interface CreateAttachmentUploadDto {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  mediaType: 'IMAGE' | 'FILE' | 'VOICE';
  durationSeconds?: number;
}

export interface ChatSessionFilter {
  page?: number;
  limit?: number;
  status?: string;
}

export interface ChatMessageFilter {
  page?: number;
  limit?: number;
  before?: string;
}
