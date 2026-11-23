"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockSmsProvider = exports.MockSmsProvider = void 0;
const logger_1 = require("../../common/utils/logger");
const uuid_1 = require("uuid");
class MockSmsProvider {
    name = 'mock';
    sentMessages = [];
    async sendOtp(destination, otp, message) {
        const text = message || `Your verification code is ${otp}. Valid for 5 minutes.`;
        const record = {
            destination,
            otp,
            message: text,
            timestamp: new Date()
        };
        this.sentMessages.push(record);
        logger_1.logger.info({ destination, provider: 'mock' }, `[MOCK SMS] Sent to ${destination}: "${text}" (OTP: ${otp})`);
        return {
            success: true,
            messageId: `mock-msg-${(0, uuid_1.v4)()}`,
            provider: 'mock'
        };
    }
    getLatestOtpFor(destination) {
        const messages = this.sentMessages.filter((m) => m.destination === destination);
        return messages[messages.length - 1]?.otp;
    }
    clear() {
        this.sentMessages = [];
    }
}
exports.MockSmsProvider = MockSmsProvider;
exports.mockSmsProvider = new MockSmsProvider();
