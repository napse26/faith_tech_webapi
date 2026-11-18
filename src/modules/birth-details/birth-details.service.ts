import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../common/errors/app-error';
import { UserBirthDetailsDto, UpsertBirthDetailsInput } from './birth-details.types';
import { auditService } from '../audit/audit.service';

export class BirthDetailsService {
  /**
   * Retrieves birth details for the authenticated user.
   */
  async getBirthDetails(userId: string): Promise<UserBirthDetailsDto> {
    const details = await prisma.userBirthDetails.findUnique({
      where: { userId }
    });

    if (!details) {
      throw new NotFoundError('Astrology birth details have not been set', 'BIRTH_DETAILS_NOT_FOUND');
    }

    return {
      userId: details.userId,
      birthDate: details.birthDate,
      birthTime: details.birthTime,
      timeAccuracy: details.timeAccuracy,
      birthPlaceName: details.birthPlaceName,
      latitude: details.latitude.toNumber(),
      longitude: details.longitude.toNumber(),
      timezone: details.timezone,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt
    };
  }

  /**
   * Upserts birth details for the authenticated user.
   * If timeAccuracy is UNKNOWN, ensures birthTime is stored as null rather than defaulting to midnight.
   */
  async upsertBirthDetails(
    userId: string,
    input: UpsertBirthDetailsInput
  ): Promise<UserBirthDetailsDto> {
    const sanitizedBirthTime =
      input.timeAccuracy === 'UNKNOWN' ? null : (input.birthTime ?? null);

    const record = await prisma.userBirthDetails.upsert({
      where: { userId },
      create: {
        userId,
        birthDate: input.birthDate,
        birthTime: sanitizedBirthTime,
        timeAccuracy: input.timeAccuracy,
        birthPlaceName: input.birthPlaceName,
        latitude: new Prisma.Decimal(input.latitude),
        longitude: new Prisma.Decimal(input.longitude),
        timezone: input.timezone
      },
      update: {
        birthDate: input.birthDate,
        birthTime: sanitizedBirthTime,
        timeAccuracy: input.timeAccuracy,
        birthPlaceName: input.birthPlaceName,
        latitude: new Prisma.Decimal(input.latitude),
        longitude: new Prisma.Decimal(input.longitude),
        timezone: input.timezone
      }
    });

    await auditService.log({
      userId,
      action: 'BIRTH_DETAILS_SAVED',
      resource: 'BIRTH_DETAILS',
      metadata: {
        birthDate: input.birthDate,
        timeAccuracy: input.timeAccuracy,
        timezone: input.timezone
      }
    });

    return {
      userId: record.userId,
      birthDate: record.birthDate,
      birthTime: record.birthTime,
      timeAccuracy: record.timeAccuracy,
      birthPlaceName: record.birthPlaceName,
      latitude: record.latitude.toNumber(),
      longitude: record.longitude.toNumber(),
      timezone: record.timezone,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}

export const birthDetailsService = new BirthDetailsService();
