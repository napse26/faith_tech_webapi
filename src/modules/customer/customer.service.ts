import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError
} from '../../common/errors/app-error';
import {
  BirthProfileDto,
  CreateBirthProfileInput,
  CustomerPreferencesDto,
  CustomerProfileDto,
  DeviceDto,
  NotificationPreferencesDto,
  ProfileStatusDto,
  SecurityOverviewDto,
  UpdateBirthProfileInput,
  UpdateCustomerProfileInput
} from './customer.types';
import { sessionService } from '../sessions/session.service';
import { authService } from '../auth/auth.service';
import { profileService } from '../profiles/profile.service';
import { auditService } from '../audit/audit.service';

export class CustomerService {
  /**
   * Retrieves full customer profile including wallet balance and calculated completion.
   */
  async getProfile(userId: bigint): Promise<CustomerProfileDto> {
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      include: {
        customer_details_customer_details_user_idTousers: true,
        wallets: true
      }
    });

    if (!user) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const customer = user.customer_details_customer_details_user_idTousers;

    // Wallet balance from wallets table or user.wallet_balance
    const walletBalance = user.wallets?.balance
      ? Number(user.wallets.balance)
      : Number(user.wallet_balance ?? 0);

    const fullName =
      user.full_name ||
      (customer?.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : null);

    const dateOfBirth = customer?.date_of_birth
      ? customer.date_of_birth.toISOString().split('T')[0]
      : user.date_of_birth
      ? user.date_of_birth.toISOString().split('T')[0]
      : null;

    const gender = customer?.gender || user.gender || null;
    const preferredLanguage = customer?.preferred_language || 'en';
    const profilePhotoUrl = customer?.profile_image || user.profile_image || null;

    // Calculate completion percentage
    let completedPoints = 0;
    const totalPoints = 6;
    if (fullName) completedPoints++;
    if (user.email) completedPoints++;
    if (user.is_mobile_verified) completedPoints++;
    if (dateOfBirth) completedPoints++;
    if (gender) completedPoints++;
    if (profilePhotoUrl) completedPoints++;

    const completionPercentage = Math.round((completedPoints / totalPoints) * 100);

    return {
      customerId: user.user_id.toString(),
      fullName,
      email: user.email || null,
      mobileNumber: user.mobile_no,
      mobileVerified: user.is_mobile_verified ?? true,
      emailVerified: user.is_email_verified ?? false,
      profilePhotoUrl,
      dateOfBirth,
      gender,
      preferredLanguage,
      accountStatus: user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE'),
      profileCompletionPercentage: completionPercentage,
      wallet: {
        balance: walletBalance,
        currency: 'INR'
      },
      createdAt: user.created_on,
      updatedAt: user.updated_on
    };
  }

  /**
   * Updates allowlisted profile fields.
   */
  async updateProfile(userId: bigint, input: UpdateCustomerProfileInput): Promise<CustomerProfileDto> {
    const user = await prisma.users.findUnique({
      where: { user_id: userId },
      include: { customer_details_customer_details_user_idTousers: true }
    });

    if (!user) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const names = input.fullName ? input.fullName.trim().split(' ') : [];
    const firstName = names[0] || undefined;
    const lastName = names.slice(1).join(' ') || undefined;
    const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : undefined;

    let emailToUpdate: string | undefined = undefined;
    let emailVerifiedToUpdate: boolean | undefined = undefined;

    if (input.email !== undefined && input.email !== user.email) {
      // Check if email is already taken
      const existing = await prisma.users.findFirst({
        where: { email: input.email, NOT: { user_id: userId } }
      });
      if (existing) {
        throw new ConflictError('Email is already registered to another account', 'EMAIL_ALREADY_EXISTS');
      }
      emailToUpdate = input.email;
      emailVerifiedToUpdate = false; // Reset verification
    }

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: userId },
        data: {
          full_name: input.fullName !== undefined ? input.fullName.trim() : undefined,
          email: emailToUpdate,
          is_email_verified: emailVerifiedToUpdate,
          gender: input.gender !== undefined ? input.gender : undefined,
          date_of_birth: dob,
          updated_on: new Date()
        }
      });

      await tx.customer_details.upsert({
        where: { user_id: userId },
        create: {
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          gender: input.gender,
          date_of_birth: dob,
          preferred_language: input.preferredLanguage,
          updated_on: new Date()
        },
        update: {
          first_name: firstName,
          last_name: lastName,
          gender: input.gender !== undefined ? input.gender : undefined,
          date_of_birth: dob,
          preferred_language: input.preferredLanguage !== undefined ? input.preferredLanguage : undefined,
          updated_on: new Date()
        }
      });

      await auditService.log(
        {
          userId,
          phoneNumber: user.mobile_no,
          eventType: 'PROFILE_UPDATED',
          status: 'SUCCESS'
        },
        tx
      );
    });

    return this.getProfile(userId);
  }

  /**
   * Status and profile completion overview.
   */
  async getStatus(userId: bigint): Promise<ProfileStatusDto> {
    const profile = await this.getProfile(userId);

    const missingFields: string[] = [];
    if (!profile.fullName) missingFields.push('fullName');
    if (!profile.email) missingFields.push('email');
    if (!profile.dateOfBirth) missingFields.push('dateOfBirth');
    if (!profile.gender) missingFields.push('gender');
    if (!profile.profilePhotoUrl) missingFields.push('profilePhoto');

    const birthProfilesCount = await prisma.kundli_profiles.count({
      where: { user_id: userId, is_active: true }
    });

    if (birthProfilesCount === 0) {
      missingFields.push('birthProfile');
    }

    const canUseAstrologyServices =
      profile.accountStatus === 'ACTIVE' &&
      profile.mobileVerified &&
      (birthProfilesCount > 0 || (!!profile.dateOfBirth && !!profile.gender));

    return {
      accountStatus: profile.accountStatus,
      profileCompletionPercentage: profile.profileCompletionPercentage,
      missingFields,
      canUseAstrologyServices,
      wallet: profile.wallet
    };
  }

  /**
   * Upload or set profile photo.
   */
  async updateProfilePhoto(userId: bigint, photoUrl: string): Promise<{ profilePhotoUrl: string }> {
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: userId },
        data: { profile_image: photoUrl, updated_on: new Date() }
      });

      await tx.customer_details.upsert({
        where: { user_id: userId },
        create: { user_id: userId, profile_image: photoUrl, updated_on: new Date() },
        update: { profile_image: photoUrl, updated_on: new Date() }
      });
    });

    return { profilePhotoUrl: photoUrl };
  }

  /**
   * Remove profile photo.
   */
  async removeProfilePhoto(userId: bigint): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: userId },
        data: { profile_image: null, updated_on: new Date() }
      });

      await tx.customer_details.updateMany({
        where: { user_id: userId },
        data: { profile_image: null, updated_on: new Date() }
      });
    });
  }

  // =========================================================================
  // BIRTH PROFILES (Section 4)
  // =========================================================================

  private mapBirthProfile(p: any): BirthProfileDto {
    const dob = p.date_of_birth ? p.date_of_birth.toISOString().split('T')[0] : null;
    let tob: string | null = null;
    if (p.time_of_birth) {
      tob = p.time_of_birth instanceof Date
        ? p.time_of_birth.toISOString().split('T')[1]?.split('.')[0] || null
        : String(p.time_of_birth).slice(0, 8);
    }

    return {
      profileId: p.kundli_profile_id.toString(),
      profileName: p.person_name,
      relationship: p.relationship || 'SELF',
      gender: p.gender || null,
      dateOfBirth: dob,
      timeOfBirth: tob,
      birthTimeAccuracy: p.birth_time_accuracy || 'EXACT',
      birthPlace: {
        name: p.place_of_birth || '',
        latitude: p.latitude !== null && p.latitude !== undefined ? Number(p.latitude) : null,
        longitude: p.longitude !== null && p.longitude !== undefined ? Number(p.longitude) : null,
        timezone: p.timezone || 'Asia/Kolkata'
      },
      isDefault: p.is_default ?? false,
      createdAt: p.created_on,
      updatedAt: p.updated_on || p.created_on
    };
  }

  /**
   * List all birth profiles for customer.
   */
  async listBirthProfiles(userId: bigint): Promise<BirthProfileDto[]> {
    const list = await prisma.kundli_profiles.findMany({
      where: { user_id: userId, is_active: true },
      orderBy: [{ is_default: 'desc' }, { created_on: 'desc' }]
    });

    return list.map((p) => this.mapBirthProfile(p));
  }

  /**
   * Create a new birth profile.
   */
  async createBirthProfile(userId: bigint, input: CreateBirthProfileInput): Promise<BirthProfileDto> {
    return prisma.$transaction(async (tx) => {
      const existingCount = await tx.kundli_profiles.count({
        where: { user_id: userId, is_active: true }
      });

      const shouldBeDefault = input.isDefault === true || existingCount === 0;

      if (shouldBeDefault) {
        await tx.kundli_profiles.updateMany({
          where: { user_id: userId, is_active: true },
          data: { is_default: false, updated_on: new Date() }
        });
      }

      const tobTime = input.timeOfBirth ? new Date(`1970-01-01T${input.timeOfBirth}Z`) : null;

      const created = await tx.kundli_profiles.create({
        data: {
          user_id: userId,
          person_name: input.profileName.trim(),
          relationship: input.relationship || 'SELF',
          gender: input.gender || null,
          date_of_birth: new Date(input.dateOfBirth),
          time_of_birth: tobTime,
          birth_time_accuracy: input.birthTimeAccuracy || 'EXACT',
          place_of_birth: input.birthPlace.name,
          latitude: input.birthPlace.latitude !== undefined && input.birthPlace.latitude !== null ? new Prisma.Decimal(input.birthPlace.latitude) : null,
          longitude: input.birthPlace.longitude !== undefined && input.birthPlace.longitude !== null ? new Prisma.Decimal(input.birthPlace.longitude) : null,
          timezone: input.birthPlace.timezone || 'Asia/Kolkata',
          is_default: shouldBeDefault,
          is_active: true,
          created_on: new Date(),
          updated_on: new Date()
        }
      });

      return this.mapBirthProfile(created);
    });
  }

  /**
   * Get single birth profile by ID with ownership verification.
   */
  async getBirthProfile(userId: bigint, profileId: bigint): Promise<BirthProfileDto> {
    const profile = await prisma.kundli_profiles.findFirst({
      where: {
        kundli_profile_id: profileId,
        user_id: userId,
        is_active: true
      }
    });

    if (!profile) {
      throw new NotFoundError('Birth profile not found or access denied', 'BIRTH_PROFILE_NOT_FOUND');
    }

    return this.mapBirthProfile(profile);
  }

  /**
   * Update birth profile.
   */
  async updateBirthProfile(
    userId: bigint,
    profileId: bigint,
    input: UpdateBirthProfileInput
  ): Promise<BirthProfileDto> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.kundli_profiles.findFirst({
        where: { kundli_profile_id: profileId, user_id: userId, is_active: true }
      });

      if (!existing) {
        throw new NotFoundError('Birth profile not found or access denied', 'BIRTH_PROFILE_NOT_FOUND');
      }

      if (input.isDefault === true) {
        await tx.kundli_profiles.updateMany({
          where: { user_id: userId, is_active: true, NOT: { kundli_profile_id: profileId } },
          data: { is_default: false, updated_on: new Date() }
        });
      }

      const tobTime = input.timeOfBirth ? new Date(`1970-01-01T${input.timeOfBirth}Z`) : null;

      const updated = await tx.kundli_profiles.update({
        where: { kundli_profile_id: profileId },
        data: {
          person_name: input.profileName.trim(),
          relationship: input.relationship || existing.relationship,
          gender: input.gender !== undefined ? input.gender : existing.gender,
          date_of_birth: new Date(input.dateOfBirth),
          time_of_birth: tobTime,
          birth_time_accuracy: input.birthTimeAccuracy || existing.birth_time_accuracy,
          place_of_birth: input.birthPlace.name,
          latitude: input.birthPlace.latitude !== undefined && input.birthPlace.latitude !== null ? new Prisma.Decimal(input.birthPlace.latitude) : null,
          longitude: input.birthPlace.longitude !== undefined && input.birthPlace.longitude !== null ? new Prisma.Decimal(input.birthPlace.longitude) : null,
          timezone: input.birthPlace.timezone || existing.timezone,
          is_default: input.isDefault !== undefined ? input.isDefault : existing.is_default,
          updated_on: new Date()
        }
      });

      return this.mapBirthProfile(updated);
    });
  }

  /**
   * Delete birth profile (soft-delete).
   */
  async deleteBirthProfile(userId: bigint, profileId: bigint): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.kundli_profiles.findFirst({
        where: { kundli_profile_id: profileId, user_id: userId, is_active: true }
      });

      if (!existing) {
        throw new NotFoundError('Birth profile not found or access denied', 'BIRTH_PROFILE_NOT_FOUND');
      }

      await tx.kundli_profiles.update({
        where: { kundli_profile_id: profileId },
        data: { is_active: false, is_default: false, updated_on: new Date() }
      });

      // If deleted was default, promote another active profile to default if available
      if (existing.is_default) {
        const nextProfile = await tx.kundli_profiles.findFirst({
          where: { user_id: userId, is_active: true },
          orderBy: { created_on: 'asc' }
        });
        if (nextProfile) {
          await tx.kundli_profiles.update({
            where: { kundli_profile_id: nextProfile.kundli_profile_id },
            data: { is_default: true, updated_on: new Date() }
          });
        }
      }
    });
  }

  /**
   * Set specific birth profile as default atomically.
   */
  async setDefaultBirthProfile(userId: bigint, profileId: bigint): Promise<BirthProfileDto> {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.kundli_profiles.findFirst({
        where: { kundli_profile_id: profileId, user_id: userId, is_active: true }
      });

      if (!existing) {
        throw new NotFoundError('Birth profile not found or access denied', 'BIRTH_PROFILE_NOT_FOUND');
      }

      await tx.kundli_profiles.updateMany({
        where: { user_id: userId, is_active: true },
        data: { is_default: false, updated_on: new Date() }
      });

      const updated = await tx.kundli_profiles.update({
        where: { kundli_profile_id: profileId },
        data: { is_default: true, updated_on: new Date() }
      });

      return this.mapBirthProfile(updated);
    });
  }

  // =========================================================================
  // PREFERENCES (Section 6)
  // =========================================================================

  async getPreferences(userId: bigint): Promise<CustomerPreferencesDto> {
    const pref = await prisma.customer_preferences.findUnique({
      where: { user_id: userId }
    });

    return {
      language: pref?.language || 'en',
      preferredAstrologerLanguage: pref?.preferred_astrologer_language || 'en',
      dailyHoroscopeEnabled: pref?.daily_horoscope_enabled ?? true,
      panchangEnabled: pref?.panchang_enabled ?? true,
      festivalAlertsEnabled: pref?.festival_alerts_enabled ?? true,
      preferredZodiacSign: pref?.preferred_zodiac_sign || 'ARIES'
    };
  }

  async updatePreferences(
    userId: bigint,
    input: Partial<CustomerPreferencesDto>
  ): Promise<CustomerPreferencesDto> {
    const updated = await prisma.customer_preferences.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        language: input.language || 'en',
        preferred_astrologer_language: input.preferredAstrologerLanguage || 'en',
        daily_horoscope_enabled: input.dailyHoroscopeEnabled ?? true,
        panchang_enabled: input.panchangEnabled ?? true,
        festival_alerts_enabled: input.festivalAlertsEnabled ?? true,
        preferred_zodiac_sign: input.preferredZodiacSign || 'ARIES',
        updated_at: new Date()
      },
      update: {
        language: input.language !== undefined ? input.language : undefined,
        preferred_astrologer_language: input.preferredAstrologerLanguage !== undefined ? input.preferredAstrologerLanguage : undefined,
        daily_horoscope_enabled: input.dailyHoroscopeEnabled !== undefined ? input.dailyHoroscopeEnabled : undefined,
        panchang_enabled: input.panchangEnabled !== undefined ? input.panchangEnabled : undefined,
        festival_alerts_enabled: input.festivalAlertsEnabled !== undefined ? input.festivalAlertsEnabled : undefined,
        preferred_zodiac_sign: input.preferredZodiacSign !== undefined ? input.preferredZodiacSign : undefined,
        updated_at: new Date()
      }
    });

    return {
      language: updated.language || 'en',
      preferredAstrologerLanguage: updated.preferred_astrologer_language || 'en',
      dailyHoroscopeEnabled: updated.daily_horoscope_enabled ?? true,
      panchangEnabled: updated.panchang_enabled ?? true,
      festivalAlertsEnabled: updated.festival_alerts_enabled ?? true,
      preferredZodiacSign: updated.preferred_zodiac_sign || 'ARIES'
    };
  }

  async getNotificationPreferences(userId: bigint): Promise<NotificationPreferencesDto> {
    const pref = await prisma.customer_preferences.findUnique({
      where: { user_id: userId }
    });

    return {
      pushEnabled: pref?.push_enabled ?? true,
      whatsappEnabled: pref?.whatsapp_enabled ?? false,
      smsEnabled: pref?.sms_enabled ?? true,
      emailEnabled: pref?.email_enabled ?? true,
      marketingNotificationsEnabled: pref?.marketing_notifications_enabled ?? false,
      dailyHoroscopeEnabled: pref?.daily_horoscope_enabled ?? true,
      festivalAlertsEnabled: pref?.festival_alerts_enabled ?? true
    };
  }

  async updateNotificationPreferences(
    userId: bigint,
    input: Partial<NotificationPreferencesDto>
  ): Promise<NotificationPreferencesDto> {
    const updated = await prisma.customer_preferences.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        push_enabled: input.pushEnabled ?? true,
        whatsapp_enabled: input.whatsappEnabled ?? false,
        sms_enabled: input.smsEnabled ?? true,
        email_enabled: input.emailEnabled ?? true,
        marketing_notifications_enabled: input.marketingNotificationsEnabled ?? false,
        daily_horoscope_enabled: input.dailyHoroscopeEnabled ?? true,
        festival_alerts_enabled: input.festivalAlertsEnabled ?? true,
        updated_at: new Date()
      },
      update: {
        push_enabled: input.pushEnabled !== undefined ? input.pushEnabled : undefined,
        whatsapp_enabled: input.whatsappEnabled !== undefined ? input.whatsappEnabled : undefined,
        sms_enabled: input.smsEnabled !== undefined ? input.smsEnabled : undefined,
        email_enabled: input.emailEnabled !== undefined ? input.emailEnabled : undefined,
        marketing_notifications_enabled: input.marketingNotificationsEnabled !== undefined ? input.marketingNotificationsEnabled : undefined,
        daily_horoscope_enabled: input.dailyHoroscopeEnabled !== undefined ? input.dailyHoroscopeEnabled : undefined,
        festival_alerts_enabled: input.festivalAlertsEnabled !== undefined ? input.festivalAlertsEnabled : undefined,
        updated_at: new Date()
      }
    });

    return {
      pushEnabled: updated.push_enabled ?? true,
      whatsappEnabled: updated.whatsapp_enabled ?? false,
      smsEnabled: updated.sms_enabled ?? true,
      emailEnabled: updated.email_enabled ?? true,
      marketingNotificationsEnabled: updated.marketing_notifications_enabled ?? false,
      dailyHoroscopeEnabled: updated.daily_horoscope_enabled ?? true,
      festivalAlertsEnabled: updated.festival_alerts_enabled ?? true
    };
  }

  // =========================================================================
  // SESSIONS, DEVICES, & SECURITY (Sections 7 & 8)
  // =========================================================================

  async getSessions(userId: bigint, currentSessionId: string) {
    return sessionService.getUserSessions(userId, currentSessionId);
  }

  async revokeSession(userId: bigint, sessionId: string) {
    return sessionService.revokeUserSession(sessionId, userId);
  }

  async revokeOtherSessions(userId: bigint, currentSessionId: string): Promise<number> {
    const result = await prisma.user_sessions.updateMany({
      where: {
        user_id: userId,
        revoked_at: null,
        NOT: { id: currentSessionId }
      },
      data: { revoked_at: new Date() }
    });

    await auditService.log({
      userId,
      eventType: 'SESSIONS_REVOKE_OTHER',
      status: 'SUCCESS'
    });

    return result.count;
  }

  async getDevices(userId: bigint): Promise<DeviceDto[]> {
    // Collect from user_devices table and active sessions
    const devices = await prisma.user_devices.findMany({
      where: { user_id: userId }
    });

    if (devices.length > 0) {
      return devices.map((d) => ({
        deviceId: d.device_token ? d.device_token.slice(0, 32) : d.device_id.toString(),
        deviceName: d.device_type,
        deviceType: d.device_type,
        deviceToken: d.device_token,
        appVersion: d.app_version,
        lastActiveAt: d.login_time,
        createdAt: d.login_time,
        isActive: d.is_active ?? true
      }));
    }

    // Fallback to active sessions if user_devices has no explicit rows
    const sessions = await prisma.user_sessions.findMany({
      where: { user_id: userId, revoked_at: null }
    });

    return sessions.map((s) => ({
      deviceId: s.device_id || s.id,
      deviceName: s.device_name,
      deviceType: s.device_type,
      deviceToken: null,
      appVersion: null,
      lastActiveAt: s.last_active_at,
      createdAt: s.created_at,
      isActive: true
    }));
  }

  async removeDevice(userId: bigint, deviceId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Deactivate in user_devices if matches
      await tx.user_devices.updateMany({
        where: { user_id: userId, device_token: deviceId },
        data: { is_active: false }
      });

      // Revoke sessions matching deviceId
      await tx.user_sessions.updateMany({
        where: { user_id: userId, device_id: deviceId, revoked_at: null },
        data: { revoked_at: new Date() }
      });
    });
  }

  async getSecurityOverview(userId: bigint, currentSessionId: string): Promise<SecurityOverviewDto> {
    const user = await prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const activeSessionsCount = await prisma.user_sessions.count({
      where: { user_id: userId, revoked_at: null, expires_at: { gt: new Date() } }
    });

    const activeDevicesCount = await prisma.user_devices.count({
      where: { user_id: userId, is_active: true }
    });

    const lastLogin = await prisma.user_login_history.findFirst({
      where: { user_id: userId },
      orderBy: { login_time: 'desc' }
    });

    return {
      accountStatus: user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE'),
      mobileNumber: user.mobile_no,
      mobileVerified: user.is_mobile_verified ?? true,
      email: user.email || null,
      emailVerified: user.is_email_verified ?? false,
      activeSessionsCount,
      activeDevicesCount: Math.max(activeDevicesCount, activeSessionsCount),
      currentSessionId,
      lastLoginAt: lastLogin?.login_time || user.created_on
    };
  }

  // =========================================================================
  // CONTACT VERIFICATION / CHANGE (Section 5)
  // =========================================================================

  async initiateMobileChange(userId: bigint, newMobileNumber: string, ipAddress?: string) {
    const result = await authService.changeMobileSendOtp(userId, newMobileNumber, '+91', ipAddress);
    return {
      verificationId: result.challengeId,
      maskedPhoneNumber: result.maskedPhoneNumber,
      expiresIn: result.expiresIn,
      resendAfter: result.resendAfter,
      sampleOtp: result.sampleOtp
    };
  }

  async verifyMobileChange(userId: bigint, verificationId: string, otp: string, ipAddress?: string) {
    const result = await authService.changeMobileVerifyOtp(userId, verificationId, otp, ipAddress);
    return {
      customerId: result.customerId.toString(),
      mobileNumber: result.phoneNumber,
      mobileVerified: true
    };
  }

  async initiateEmailVerification(userId: bigint, email: string) {
    const result = await profileService.initiateEmailUpdate(userId.toString(), email);
    return {
      verificationId: result.challengeId
    };
  }

  async verifyEmailVerification(userId: bigint, verificationId: string, code: string) {
    const profile = await profileService.verifyEmailUpdate(userId.toString(), verificationId, code);
    return {
      email: profile.email,
      emailVerified: profile.isEmailVerified
    };
  }

  async removeEmail(userId: bigint): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    if (!user.is_mobile_verified) {
      throw new BadRequestError('Cannot remove email when mobile number is not verified', 'MOBILE_NOT_VERIFIED');
    }

    await prisma.users.update({
      where: { user_id: userId },
      data: {
        email: null,
        is_email_verified: false,
        updated_on: new Date()
      }
    });
  }
}

export const customerService = new CustomerService();
