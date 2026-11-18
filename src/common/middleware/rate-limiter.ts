import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../errors/app-error';
import { env } from '../../config/env';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();

  constructor(private windowMs: number, private maxRequests: number) {
    // Periodically clean expired records every minute
    setInterval(() => this.cleanup(), 60000).unref();
  }

  public check(key: string): { allowed: boolean; retryAfter: number } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || record.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      return { allowed: false, retryAfter };
    }

    record.count += 1;
    return { allowed: true, retryAfter: 0 };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  public reset(key: string): void {
    this.store.delete(key);
  }
}

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
  skipInTest?: boolean;
}) {
  const limiter = new InMemoryRateLimiter(options.windowMs, options.maxRequests);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Allow bypassing limiter in test environment unless explicitly testing rate limiting
    if (env.NODE_ENV === 'test' && (options.skipInTest ?? true)) {
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = options.keyGenerator ? options.keyGenerator(req) : `${ip}:${req.baseUrl}${req.path}`;
    const result = limiter.check(key);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter.toString());
      next(
        new RateLimitError(
          options.message || `Too many requests. Please try again after ${result.retryAfter} seconds.`
        )
      );
      return;
    }

    next();
  };
}

// Pre-configured rate limiters
export const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100
});

export const otpInitiateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const phone = req.body?.mobileNumber || '';
    return `otp-init:${ip}:${phone}`;
  },
  message: 'Too many OTP requests for this phone number/IP. Please wait before requesting again.'
});

export const otpVerifyLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 10,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const challengeId = req.body?.challengeId || '';
    return `otp-verify:${ip}:${challengeId}`;
  },
  message: 'Too many verification attempts. Please wait before trying again.'
});
