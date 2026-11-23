"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.birthDetailsService = exports.BirthDetailsService = void 0;
const database_1 = require("../../config/database");
const app_error_1 = require("../../common/errors/app-error");
const audit_service_1 = require("../audit/audit.service");
class BirthDetailsService {
    /**
     * Retrieves birth details for the authenticated user from customer_details.
     */
    async getBirthDetails(userId) {
        const parsedUserId = BigInt(userId);
        const details = await database_1.prisma.customer_details.findUnique({
            where: { user_id: parsedUserId }
        });
        if (!details || (!details.date_of_birth && !details.place_of_birth)) {
            throw new app_error_1.NotFoundError('Astrology birth details have not been set', 'BIRTH_DETAILS_NOT_FOUND');
        }
        const birthDateStr = details.date_of_birth
            ? details.date_of_birth.toISOString().split('T')[0]
            : '';
        const birthTimeStr = details.time_of_birth
            ? details.time_of_birth.toISOString().split('T')[1]?.split('.')[0] || null
            : null;
        return {
            userId,
            birthDate: birthDateStr,
            birthTime: birthTimeStr,
            timeAccuracy: 'EXACT',
            birthPlaceName: details.place_of_birth || '',
            latitude: 0,
            longitude: 0,
            timezone: 'Asia/Kolkata',
            createdAt: details.created_on,
            updatedAt: details.updated_on
        };
    }
    /**
     * Upserts birth details for the authenticated user into customer_details.
     */
    async upsertBirthDetails(userId, input) {
        const parsedUserId = BigInt(userId);
        const birthDateObj = input.birthDate ? new Date(input.birthDate) : undefined;
        const timeAccuracy = input.timeAccuracy || 'EXACT';
        const record = await database_1.prisma.customer_details.upsert({
            where: { user_id: parsedUserId },
            create: {
                user_id: parsedUserId,
                date_of_birth: birthDateObj,
                place_of_birth: input.birthPlaceName,
                updated_on: new Date()
            },
            update: {
                date_of_birth: birthDateObj,
                place_of_birth: input.birthPlaceName,
                updated_on: new Date()
            }
        });
        await audit_service_1.auditService.log({
            userId: parsedUserId,
            eventType: 'BIRTH_DETAILS_SAVED',
            status: 'SUCCESS'
        });
        const birthDateStr = record.date_of_birth
            ? record.date_of_birth.toISOString().split('T')[0]
            : input.birthDate;
        return {
            userId,
            birthDate: birthDateStr,
            birthTime: input.birthTime ?? null,
            timeAccuracy,
            birthPlaceName: record.place_of_birth || input.birthPlaceName,
            latitude: input.latitude ?? 0,
            longitude: input.longitude ?? 0,
            timezone: input.timezone || 'Asia/Kolkata',
            createdAt: record.created_on,
            updatedAt: record.updated_on
        };
    }
}
exports.BirthDetailsService = BirthDetailsService;
exports.birthDetailsService = new BirthDetailsService();
