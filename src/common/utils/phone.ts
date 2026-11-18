import parsePhoneNumber, { CountryCode } from 'libphonenumber-js';
import { BadRequestError } from '../errors/app-error';

export interface NormalizedPhone {
  e164: string;
  countryCode: string;
  nationalNumber: string;
}

/**
 * Normalizes and validates a phone number to canonical E.164 format.
 * Accepts country calling code (e.g. "+91" or "IN") and national number.
 */
export function normalizePhoneNumber(
  mobileNumber: string,
  countryCallingCode?: string
): NormalizedPhone {
  const cleanNumber = mobileNumber.trim();
  let fullNumber = cleanNumber;

  if (countryCallingCode && !cleanNumber.startsWith('+')) {
    const code = countryCallingCode.startsWith('+')
      ? countryCallingCode
      : `+${countryCallingCode}`;
    fullNumber = `${code}${cleanNumber}`;
  }

  const parsed = parsePhoneNumber(fullNumber);

  if (!parsed || !parsed.isValid()) {
    throw new BadRequestError('Invalid mobile phone number format', 'INVALID_PHONE_NUMBER');
  }

  return {
    e164: parsed.number,
    countryCode: `+${parsed.countryCallingCode}`,
    nationalNumber: parsed.nationalNumber
  };
}
