import { SmsProvider, SendSmsResult } from './sms-provider.interface';
import { logger } from '../../common/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface SentMessageRecord {
  destination: string;
  otp: string;
  message: string;
  timestamp: Date;
}

export class MockSmsProvider implements SmsProvider {
  public readonly name = 'mock';
  private sentMessages: SentMessageRecord[] = [];

  async sendOtp(destination: string, otp: string, message?: string): Promise<SendSmsResult> {
    const text = message || `Your verification code is ${otp}. Valid for 5 minutes.`;
    const record: SentMessageRecord = {
      destination,
      otp,
      message: text,
      timestamp: new Date()
    };

    this.sentMessages.push(record);
    logger.info({ destination, provider: 'mock' }, `[MOCK SMS] Sent to ${destination}: "${text}" (OTP: ${otp})`);

    return {
      success: true,
      messageId: `mock-msg-${uuidv4()}`,
      provider: 'mock'
    };
  }

  getLatestOtpFor(destination: string): string | undefined {
    const messages = this.sentMessages.filter((m) => m.destination === destination);
    return messages[messages.length - 1]?.otp;
  }

  clear(): void {
    this.sentMessages = [];
  }
}

export const mockSmsProvider = new MockSmsProvider();
