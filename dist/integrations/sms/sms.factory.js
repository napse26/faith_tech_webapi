"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmsProvider = getSmsProvider;
const mock_sms_provider_1 = require("./mock-sms-provider");
const env_1 = require("../../config/env");
function getSmsProvider() {
    switch (env_1.env.SMS_PROVIDER) {
        case 'mock':
        default:
            return mock_sms_provider_1.mockSmsProvider;
    }
}
