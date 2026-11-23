"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpVerifyLimiter = exports.otpInitiateLimiter = exports.globalLimiter = void 0;
exports.createRateLimiter = createRateLimiter;
const app_error_1 = require("../errors/app-error");
const env_1 = require("../../config/env");
class InMemoryRateLimiter {
    windowMs;
    maxRequests;
    store = new Map();
    constructor(windowMs, maxRequests) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        // Periodically clean expired records every minute
        setInterval(() => this.cleanup(), 60000).unref();
    }
    check(key) {
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
    cleanup() {
        const now = Date.now();
        for (const [key, record] of this.store.entries()) {
            if (record.resetAt <= now) {
                this.store.delete(key);
            }
        }
    }
    reset(key) {
        this.store.delete(key);
    }
}
function createRateLimiter(options) {
    const limiter = new InMemoryRateLimiter(options.windowMs, options.maxRequests);
    return (req, res, next) => {
        // Allow bypassing limiter in test environment unless explicitly testing rate limiting
        if (env_1.env.NODE_ENV === 'test' && (options.skipInTest ?? true)) {
            next();
            return;
        }
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const key = options.keyGenerator ? options.keyGenerator(req) : `${ip}:${req.baseUrl}${req.path}`;
        const result = limiter.check(key);
        if (!result.allowed) {
            res.setHeader('Retry-After', result.retryAfter.toString());
            next(new app_error_1.RateLimitError(options.message || `Too many requests. Please try again after ${result.retryAfter} seconds.`));
            return;
        }
        next();
    };
}
// Pre-configured rate limiters
exports.globalLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100
});
exports.otpInitiateLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 5,
    keyGenerator: (req) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const phone = req.body?.mobileNumber || '';
        return `otp-init:${ip}:${phone}`;
    },
    message: 'Too many OTP requests for this phone number/IP. Please wait before requesting again.'
});
exports.otpVerifyLimiter = createRateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const challengeId = req.body?.challengeId || '';
        return `otp-verify:${ip}:${challengeId}`;
    },
    message: 'Too many verification attempts. Please wait before trying again.'
});
