export interface SendSmsResult {
  success: boolean;
  messageId: string;
  provider: string;
}

export interface SmsProvider {
  name: string;
  sendOtp(destination: string, otp: string, message?: string): Promise<SendSmsResult>;
}
