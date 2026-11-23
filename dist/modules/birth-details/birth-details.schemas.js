"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertBirthDetailsSchema = void 0;
const zod_1 = require("zod");
function isValidIanaTimezone(tz) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    }
    catch {
        return false;
    }
}
function isValidBirthDate(dateStr) {
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return false;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (d.getUTCFullYear() !== year ||
        d.getUTCMonth() !== month ||
        d.getUTCDate() !== day) {
        return false;
    }
    // Must not be in the future
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return d <= todayUtc;
}
exports.upsertBirthDetailsSchema = zod_1.z
    .object({
    birthDate: zod_1.z
        .string({ required_error: 'Birth date is required' })
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format')
        .refine(isValidBirthDate, 'Birth date must be a valid past or current date'),
    birthTime: zod_1.z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Birth time must be in HH:mm or HH:mm:ss format')
        .nullable()
        .optional(),
    timeAccuracy: zod_1.z.enum(['EXACT', 'APPROXIMATE', 'UNKNOWN'], {
        required_error: 'Time accuracy must be EXACT, APPROXIMATE, or UNKNOWN'
    }),
    birthPlaceName: zod_1.z
        .string({ required_error: 'Birth place name is required' })
        .trim()
        .min(2, 'Birth place name must be at least 2 characters')
        .max(150, 'Birth place name must not exceed 150 characters'),
    latitude: zod_1.z
        .number({ required_error: 'Latitude is required' })
        .min(-90, 'Latitude must be between -90 and +90')
        .max(90, 'Latitude must be between -90 and +90'),
    longitude: zod_1.z
        .number({ required_error: 'Longitude is required' })
        .min(-180, 'Longitude must be between -180 and +180')
        .max(180, 'Longitude must be between -180 and +180'),
    timezone: zod_1.z
        .string({ required_error: 'Timezone identifier is required' })
        .refine(isValidIanaTimezone, 'Timezone must be a valid IANA timezone identifier (e.g. Asia/Kolkata)')
})
    .strict();
