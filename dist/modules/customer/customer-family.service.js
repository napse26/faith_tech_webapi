"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerFamilyService = exports.CustomerFamilyService = void 0;
const client_1 = require("@prisma/client");
const database_1 = require("../../config/database");
const app_error_1 = require("../../common/errors/app-error");
function formatTimeOfBirth(tob) {
    if (!tob)
        return null;
    if (tob instanceof Date) {
        return tob.toISOString().split('T')[1]?.split('.')[0] || null;
    }
    const str = String(tob);
    if (str.includes('T')) {
        return str.split('T')[1]?.split('.')[0]?.slice(0, 8) || null;
    }
    return str.slice(0, 8);
}
function mapFamilyMember(p) {
    const dob = p.date_of_birth
        ? (p.date_of_birth instanceof Date ? p.date_of_birth.toISOString().split('T')[0] : String(p.date_of_birth).split('T')[0])
        : null;
    const tob = formatTimeOfBirth(p.time_of_birth);
    let bp = p.birth_place;
    if (typeof bp === 'string') {
        try {
            bp = JSON.parse(bp);
        }
        catch {
            bp = null;
        }
    }
    const birthPlace = bp || {
        place_name: p.place_of_birth || '',
        city: p.place_of_birth || '',
        state: '',
        country: 'India',
        latitude: p.latitude !== null && p.latitude !== undefined ? Number(p.latitude) : null,
        longitude: p.longitude !== null && p.longitude !== undefined ? Number(p.longitude) : null,
        timezone: p.timezone || 'Asia/Kolkata'
    };
    return {
        member_id: Number(p.kundli_profile_id),
        full_name: p.person_name,
        relationship: p.relationship || 'SELF',
        gender: p.gender || null,
        date_of_birth: dob,
        time_of_birth: tob,
        birth_place: birthPlace,
        is_default: p.is_default ?? false,
        created_at: p.created_on ? p.created_on.toISOString() : null,
        updated_at: p.updated_on ? p.updated_on.toISOString() : (p.created_on ? p.created_on.toISOString() : null)
    };
}
class CustomerFamilyService {
    /**
     * Add a new family member.
     */
    async addFamilyMember(userId, input) {
        return database_1.prisma.$transaction(async (tx) => {
            const activeCount = await tx.kundli_profiles.count({
                where: { user_id: userId, is_active: true }
            });
            const shouldBeDefault = input.is_default === true || activeCount === 0;
            if (shouldBeDefault) {
                await tx.kundli_profiles.updateMany({
                    where: { user_id: userId, is_active: true },
                    data: { is_default: false, updated_on: new Date() }
                });
            }
            const tobTime = input.time_of_birth
                ? new Date(`1970-01-01T${input.time_of_birth.length === 5 ? input.time_of_birth + ':00' : input.time_of_birth}Z`)
                : null;
            const birthPlaceObj = input.birth_place
                ? {
                    place_name: input.birth_place.place_name,
                    city: input.birth_place.city || input.birth_place.place_name,
                    state: input.birth_place.state || '',
                    country: input.birth_place.country || 'India',
                    latitude: input.birth_place.latitude !== undefined && input.birth_place.latitude !== null ? Number(input.birth_place.latitude) : null,
                    longitude: input.birth_place.longitude !== undefined && input.birth_place.longitude !== null ? Number(input.birth_place.longitude) : null,
                    timezone: input.birth_place.timezone || 'Asia/Kolkata'
                }
                : null;
            const created = await tx.kundli_profiles.create({
                data: {
                    user_id: userId,
                    person_name: input.full_name.trim(),
                    relationship: input.relationship,
                    gender: input.gender || null,
                    date_of_birth: new Date(input.date_of_birth),
                    time_of_birth: tobTime,
                    birth_time_accuracy: 'EXACT',
                    place_of_birth: birthPlaceObj ? birthPlaceObj.place_name : null,
                    latitude: birthPlaceObj?.latitude !== null && birthPlaceObj?.latitude !== undefined ? new client_1.Prisma.Decimal(birthPlaceObj.latitude) : null,
                    longitude: birthPlaceObj?.longitude !== null && birthPlaceObj?.longitude !== undefined ? new client_1.Prisma.Decimal(birthPlaceObj.longitude) : null,
                    timezone: birthPlaceObj?.timezone || 'Asia/Kolkata',
                    birth_place: birthPlaceObj,
                    is_default: shouldBeDefault,
                    is_active: true,
                    created_on: new Date(),
                    updated_on: new Date()
                }
            });
            return mapFamilyMember(created);
        });
    }
    /**
     * Get all active family members for customer.
     */
    async getFamilyMembers(userId) {
        const members = await database_1.prisma.kundli_profiles.findMany({
            where: { user_id: userId, is_active: true },
            orderBy: [{ is_default: 'desc' }, { created_on: 'asc' }]
        });
        const mapped = members.map((p) => {
            const item = mapFamilyMember(p);
            // Document spec for GET list does not have updated_at in the example item, but retains all member details
            return {
                member_id: item.member_id,
                full_name: item.full_name,
                relationship: item.relationship,
                gender: item.gender,
                date_of_birth: item.date_of_birth,
                time_of_birth: item.time_of_birth,
                birth_place: item.birth_place,
                is_default: item.is_default,
                created_at: item.created_at
            };
        });
        return {
            family_members: mapped,
            total_members: mapped.length
        };
    }
    /**
     * Get details of a single family member.
     */
    async getFamilyMemberById(userId, memberId) {
        const member = await database_1.prisma.kundli_profiles.findFirst({
            where: {
                kundli_profile_id: memberId,
                user_id: userId,
                is_active: true
            }
        });
        if (!member) {
            throw new app_error_1.NotFoundError('Family member not found or access denied', 'FAMILY_MEMBER_NOT_FOUND');
        }
        return mapFamilyMember(member);
    }
    /**
     * Update a family member.
     */
    async updateFamilyMember(userId, memberId, input) {
        return database_1.prisma.$transaction(async (tx) => {
            const existing = await tx.kundli_profiles.findFirst({
                where: {
                    kundli_profile_id: memberId,
                    user_id: userId,
                    is_active: true
                }
            });
            if (!existing) {
                throw new app_error_1.NotFoundError('Family member not found or access denied', 'FAMILY_MEMBER_NOT_FOUND');
            }
            if (input.is_default === true) {
                await tx.kundli_profiles.updateMany({
                    where: {
                        user_id: userId,
                        is_active: true,
                        kundli_profile_id: { not: memberId }
                    },
                    data: { is_default: false, updated_on: new Date() }
                });
            }
            const updateData = {
                updated_on: new Date()
            };
            if (input.full_name !== undefined) {
                updateData.person_name = input.full_name.trim();
            }
            if (input.relationship !== undefined) {
                updateData.relationship = input.relationship;
            }
            if (input.gender !== undefined) {
                updateData.gender = input.gender;
            }
            if (input.date_of_birth !== undefined) {
                updateData.date_of_birth = new Date(input.date_of_birth);
            }
            if (input.time_of_birth !== undefined) {
                updateData.time_of_birth = input.time_of_birth
                    ? new Date(`1970-01-01T${input.time_of_birth.length === 5 ? input.time_of_birth + ':00' : input.time_of_birth}Z`)
                    : null;
            }
            if (input.is_default !== undefined) {
                updateData.is_default = input.is_default;
            }
            if (input.birth_place !== undefined) {
                if (input.birth_place) {
                    const bpObj = {
                        place_name: input.birth_place.place_name,
                        city: input.birth_place.city || input.birth_place.place_name,
                        state: input.birth_place.state || '',
                        country: input.birth_place.country || 'India',
                        latitude: input.birth_place.latitude !== undefined && input.birth_place.latitude !== null ? Number(input.birth_place.latitude) : null,
                        longitude: input.birth_place.longitude !== undefined && input.birth_place.longitude !== null ? Number(input.birth_place.longitude) : null,
                        timezone: input.birth_place.timezone || 'Asia/Kolkata'
                    };
                    updateData.birth_place = bpObj;
                    updateData.place_of_birth = bpObj.place_name;
                    updateData.latitude = bpObj.latitude !== null ? new client_1.Prisma.Decimal(bpObj.latitude) : null;
                    updateData.longitude = bpObj.longitude !== null ? new client_1.Prisma.Decimal(bpObj.longitude) : null;
                    updateData.timezone = bpObj.timezone || 'Asia/Kolkata';
                }
                else {
                    updateData.birth_place = client_1.Prisma.DbNull;
                }
            }
            const updated = await tx.kundli_profiles.update({
                where: { kundli_profile_id: memberId },
                data: updateData
            });
            return mapFamilyMember(updated);
        });
    }
    /**
     * Soft delete a family member.
     */
    async deleteFamilyMember(userId, memberId) {
        const existing = await database_1.prisma.kundli_profiles.findFirst({
            where: {
                kundli_profile_id: memberId,
                user_id: userId,
                is_active: true
            }
        });
        if (!existing) {
            throw new app_error_1.NotFoundError('Family member not found or access denied', 'FAMILY_MEMBER_NOT_FOUND');
        }
        const now = new Date();
        await database_1.prisma.kundli_profiles.update({
            where: { kundli_profile_id: memberId },
            data: {
                is_active: false,
                deleted_at: now,
                updated_on: now
            }
        });
        return {
            member_id: Number(memberId),
            is_deleted: true,
            deleted_at: now.toISOString()
        };
    }
}
exports.CustomerFamilyService = CustomerFamilyService;
exports.customerFamilyService = new CustomerFamilyService();
