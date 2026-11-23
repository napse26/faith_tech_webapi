"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneNumber = normalizePhoneNumber;
exports.maskPhoneNumber = maskPhoneNumber;
const libphonenumber_js_1 = __importDefault(require("libphonenumber-js"));
const app_error_1 = require("../errors/app-error");
/**
 * Normalizes and validates a phone number to canonical E.164 format.
 * Accepts country calling code (e.g. "+91" or "IN") and national number.
 */
function normalizePhoneNumber(mobileNumber, countryCallingCode) {
    const cleanNumber = mobileNumber.trim();
    let fullNumber = cleanNumber;
    if (countryCallingCode && !cleanNumber.startsWith('+')) {
        const code = countryCallingCode.startsWith('+')
            ? countryCallingCode
            : `+${countryCallingCode}`;
        fullNumber = `${code}${cleanNumber}`;
    }
    const parsed = (0, libphonenumber_js_1.default)(fullNumber);
    if (!parsed || !parsed.isValid()) {
        throw new app_error_1.BadRequestError('Invalid mobile phone number format', 'INVALID_PHONE_NUMBER');
    }
    return {
        e164: parsed.number,
        countryCode: `+${parsed.countryCallingCode}`,
        nationalNumber: parsed.nationalNumber
    };
}
/**
 * Masks a phone number for privacy display (e.g. "+91******3210").
 */
function maskPhoneNumber(phone) {
    if (phone.length <= 6)
        return phone;
    const prefix = phone.slice(0, 3);
    const suffix = phone.slice(-4);
    const stars = '*'.repeat(Math.max(phone.length - 7, 4));
    return `${prefix}${stars}${suffix}`;
}
