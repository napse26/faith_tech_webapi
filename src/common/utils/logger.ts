import pino from 'pino';
import { env } from '../../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.body.otp',
      'req.body.refreshToken',
      'body.otp',
      'body.refreshToken',
      'otp',
      'otpHash',
      'refreshToken',
      'token',
      'password'
    ],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
