export type TimeAccuracy = 'EXACT' | 'APPROXIMATE' | 'UNKNOWN';

export interface UserBirthDetailsDto {
  userId: string;
  birthDate: string;
  birthTime: string | null;
  timeAccuracy: TimeAccuracy;
  birthPlaceName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface UpsertBirthDetailsInput {
  birthDate: string; // YYYY-MM-DD
  birthTime?: string | null; // HH:mm:ss or HH:mm
  timeAccuracy?: TimeAccuracy;
  birthPlaceName: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}
