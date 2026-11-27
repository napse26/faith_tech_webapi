import { z } from 'zod';

export const familyRelationshipEnum = z.enum([
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

export const familyGenderEnum = z.enum([
  'MALE',
  'FEMALE',
  'OTHER',
  'PREFER_NOT_TO_SAY'
]);

export const familyBirthPlaceSchema = z.object({
  place_name: z.string().trim().min(1, 'place_name is required').max(150),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().default('India'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  timezone: z.string().trim().max(50).optional().default('Asia/Kolkata')
});

export const addFamilyMemberSchema = z.object({
  full_name: z.string().trim().min(1, 'full_name is required').max(150),
  relationship: familyRelationshipEnum,
  gender: familyGenderEnum.optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be in YYYY-MM-DD format'),
  time_of_birth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'time_of_birth must be in HH:mm:ss or HH:mm format').optional().nullable(),
  birth_place: familyBirthPlaceSchema.optional().nullable(),
  is_default: z.boolean().optional().default(false)
});

export const updateFamilyMemberSchema = z.object({
  full_name: z.string().trim().min(1).max(150).optional(),
  relationship: familyRelationshipEnum.optional(),
  gender: familyGenderEnum.optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be in YYYY-MM-DD format').optional(),
  time_of_birth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'time_of_birth must be in HH:mm:ss or HH:mm format').optional().nullable(),
  birth_place: familyBirthPlaceSchema.optional().nullable(),
  is_default: z.boolean().optional()
});

export const getFollowingQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export type AddFamilyMemberInput = z.infer<typeof addFamilyMemberSchema>;
export type UpdateFamilyMemberInput = z.infer<typeof updateFamilyMemberSchema>;
export type GetFollowingQueryInput = z.infer<typeof getFollowingQuerySchema>;
