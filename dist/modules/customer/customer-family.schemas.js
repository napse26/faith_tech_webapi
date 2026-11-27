"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFollowingQuerySchema = exports.updateFamilyMemberSchema = exports.addFamilyMemberSchema = exports.familyBirthPlaceSchema = exports.familyGenderEnum = exports.familyRelationshipEnum = void 0;
const zod_1 = require("zod");
exports.familyRelationshipEnum = zod_1.z.enum([
    'SELF',
    'SPOUSE',
    'SON',
    'DAUGHTER',
    'FATHER',
    'MOTHER',
    'BROTHER',
    'SISTER',
    'GRANDFATHER',
    'GRANDMOTHER',
    'OTHER'
]);
exports.familyGenderEnum = zod_1.z.enum([
    'MALE',
    'FEMALE',
    'OTHER',
    'PREFER_NOT_TO_SAY'
]);
exports.familyBirthPlaceSchema = zod_1.z.object({
    place_name: zod_1.z.string().trim().min(1, 'place_name is required').max(150),
    city: zod_1.z.string().trim().max(100).optional().nullable(),
    state: zod_1.z.string().trim().max(100).optional().nullable(),
    country: zod_1.z.string().trim().max(100).optional().default('India'),
    latitude: zod_1.z.number().min(-90).max(90).optional().nullable(),
    longitude: zod_1.z.number().min(-180).max(180).optional().nullable(),
    timezone: zod_1.z.string().trim().max(50).optional().default('Asia/Kolkata')
});
exports.addFamilyMemberSchema = zod_1.z.object({
    full_name: zod_1.z.string().trim().min(1, 'full_name is required').max(150),
    relationship: exports.familyRelationshipEnum,
    gender: exports.familyGenderEnum.optional().nullable(),
    date_of_birth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be in YYYY-MM-DD format'),
    time_of_birth: zod_1.z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'time_of_birth must be in HH:mm:ss or HH:mm format').optional().nullable(),
    birth_place: exports.familyBirthPlaceSchema.optional().nullable(),
    is_default: zod_1.z.boolean().optional().default(false)
});
exports.updateFamilyMemberSchema = zod_1.z.object({
    full_name: zod_1.z.string().trim().min(1).max(150).optional(),
    relationship: exports.familyRelationshipEnum.optional(),
    gender: exports.familyGenderEnum.optional().nullable(),
    date_of_birth: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be in YYYY-MM-DD format').optional(),
    time_of_birth: zod_1.z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'time_of_birth must be in HH:mm:ss or HH:mm format').optional().nullable(),
    birth_place: exports.familyBirthPlaceSchema.optional().nullable(),
    is_default: zod_1.z.boolean().optional()
});
exports.getFollowingQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).default(10)
});
