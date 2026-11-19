import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/app-error';
import { UserBirthDetailsDto, UpsertBirthDetailsInput } from './birth-details.types';
import { auditService } from '../audit/audit.service';

export class BirthDetailsService {
  /**
   * Retrieves birth details for the authenticated user from customer_details.
   */
  async getBirthDetails(userId: string): Promise<UserBirthDetailsDto> {
    const parsedUserId = BigInt(userId);
    const details = await prisma.customer_details.findUnique({
      where: { user_id: parsedUserId }
    });

    if (!details || (!details.date_of_birth && !details.place_of_birth)) {
      throw new NotFoundError('Astrology birth details have not been set', 'BIRTH_DETAILS_NOT_FOUND');
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
  async upsertBirthDetails(
    userId: string,
    input: UpsertBirthDetailsInput
  ): Promise<UserBirthDetailsDto> {
    const parsedUserId = BigInt(userId);
    const birthDateObj = input.birthDate ? new Date(input.birthDate) : undefined;
    const timeAccuracy = input.timeAccuracy || 'EXACT';

    const record = await prisma.customer_details.upsert({
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

    await auditService.log({
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

export const birthDetailsService = new BirthDetailsService();
