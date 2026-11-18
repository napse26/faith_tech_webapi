import { SmsProvider } from './sms-provider.interface';
import { mockSmsProvider } from './mock-sms-provider';
import { env } from '../../config/env';

export function getSmsProvider(): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case 'mock':
    default:
      return mockSmsProvider;
  }
}
