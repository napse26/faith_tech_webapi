import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError
} from '../../common/errors/app-error';
import {
  AcceptConsentInput,
  AddTicketMessageInput,
  BirthProfileDto,
  ConsentItemDto,
  CreateBirthProfileInput,
  CreateSupportTicketInput,
  CustomerActivityItemDto,
  CustomerPreferencesDto,
  CustomerProfileDto,
  DeactivateAccountInput,
  DeactivationResultDto,
  DeletionRequestDto,
  DeviceDto,
  FavoriteAstrologerDto,
  NotificationPreferencesDto,
  PrivacyOverviewDto,
  ProfileStatusDto,
  ReactivateAccountInput,
  ReactivationResultDto,
  RecentAstrologerDto,
  RequestDeletionInput,
  SecurityOverviewDto,
  SupportTicketDto,
  SupportTicketMessageDto,
  UpdateBirthProfileInput,
  UpdateConsentItemInput,
  UpdateConsentsInput,
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

  // =========================================================================
  // PRIVACY & CONSENTS (Phase 3)
  // =========================================================================

  async getConsents(userId: bigint): Promise<ConsentItemDto[]> {
    const records = await prisma.user_consents.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    const consentMap = new Map<string, ConsentItemDto>();
    for (const r of records) {
      if (!consentMap.has(r.consent_type)) {
        consentMap.set(r.consent_type, {
          consentType: r.consent_type,
          documentVersion: r.document_version,
          isGranted: r.is_granted,
          channel: r.channel,
          updatedAt: r.created_at
        });
      }
    }

    const standardTypes = ['TERMS_AND_CONDITIONS', 'PRIVACY_POLICY', 'MARKETING_PROMOTIONS', 'WHATSAPP_UPDATES'];
    for (const type of standardTypes) {
      if (!consentMap.has(type)) {
        consentMap.set(type, {
          consentType: type,
          documentVersion: '1.0',
          isGranted: false,
          channel: 'APP',
          updatedAt: null
        });
      }
    }

    return Array.from(consentMap.values());
  }

  async updateConsents(
    userId: bigint,
    input: UpdateConsentsInput,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<ConsentItemDto[]> {
    await prisma.$transaction(async (tx) => {
      for (const item of input.consents) {
        await tx.user_consents.create({
          data: {
            user_id: userId,
            consent_type: item.consentType,
            document_version: item.documentVersion || '1.0',
            is_granted: item.isGranted,
            channel: item.channel || 'APP',
            ip_address: context?.ipAddress,
            user_agent: context?.userAgent
          }
        });
      }
    });

    return this.getConsents(userId);
  }

  async acceptConsent(
    userId: bigint,
    input: AcceptConsentInput,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<ConsentItemDto> {
    const record = await prisma.user_consents.create({
      data: {
        user_id: userId,
        consent_type: input.consentType,
        document_version: input.documentVersion || '1.0',
        is_granted: true,
        channel: input.channel || 'APP',
        ip_address: context?.ipAddress,
        user_agent: context?.userAgent
      }
    });

    return {
      consentType: record.consent_type,
      documentVersion: record.document_version,
      isGranted: record.is_granted,
      channel: record.channel,
      updatedAt: record.created_at
    };
  }

  async getPrivacyOverview(userId: bigint): Promise<PrivacyOverviewDto> {
    const consents = await this.getConsents(userId);
    const pendingDeletion = await prisma.account_deletion_requests.findFirst({
      where: { user_id: userId, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });

    return {
      consents,
      dataRetentionPolicy: 'Customer data is retained while the account is active. Upon account deletion request, an irreversible purge occurs after a 30-day grace period. Inactive sessions and audit logs are retained in accordance with financial regulations.',
      deletionRequestPending: !!pendingDeletion,
      deletionScheduledAt: pendingDeletion?.scheduled_purge_at || null
    };
  }

  // =========================================================================
  // ACCOUNT LIFECYCLE (Phase 3)
  // =========================================================================

  async deactivateAccount(
    userId: bigint,
    input?: DeactivateAccountInput,
    ipAddress?: string
  ): Promise<DeactivationResultDto> {
    const user = await prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    if (user.status === 'INACTIVE' || !user.is_active) {
      throw new ConflictError('Account is already deactivated', 'ACCOUNT_ALREADY_INACTIVE');
    }

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: userId },
        data: {
          status: 'INACTIVE',
          is_active: false,
          updated_on: new Date()
        }
      });

      await tx.user_refresh_tokens.updateMany({
        where: { user_id: userId, revoked: false },
        data: { revoked: true }
      });

      await tx.auth_audit_logs.create({
        data: {
          user_id: userId,
          phone_number: user.mobile_no,
          event_type: 'ACCOUNT_DEACTIVATED',
          status: 'SUCCESS',
          ip_address: ipAddress
        }
      });
    });

    return {
      status: 'INACTIVE',
      message: 'Your account has been deactivated. You can reactivate it at any time by logging in.',
      deactivatedAt: new Date()
    };
  }

  async reactivateAccount(
    userId: bigint,
    input?: ReactivateAccountInput,
    ipAddress?: string
  ): Promise<ReactivationResultDto> {
    const user = await prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new ForbiddenError('Account cannot be reactivated due to administrative suspension', 'ACCOUNT_SUSPENDED');
    }

    if (user.status === 'ACTIVE' && user.is_active) {
      return {
        status: 'ACTIVE',
        message: 'Account is already active.',
        reactivatedAt: new Date()
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.users.update({
        where: { user_id: userId },
        data: {
          status: 'ACTIVE',
          is_active: true,
          updated_on: new Date()
        }
      });

      await tx.account_deletion_requests.updateMany({
        where: { user_id: userId, status: 'PENDING' },
        data: { status: 'CANCELLED', updated_at: new Date() }
      });

      await tx.auth_audit_logs.create({
        data: {
          user_id: userId,
          phone_number: user.mobile_no,
          event_type: 'ACCOUNT_REACTIVATED',
          status: 'SUCCESS',
          ip_address: ipAddress
        }
      });
    });

    return {
      status: 'ACTIVE',
      message: 'Account reactivated successfully. Welcome back!',
      reactivatedAt: new Date()
    };
  }

  async requestAccountDeletion(
    userId: bigint,
    input?: RequestDeletionInput,
    ipAddress?: string
  ): Promise<DeletionRequestDto> {
    const user = await prisma.users.findUnique({
      where: { user_id: userId }
    });

    if (!user) {
      throw new NotFoundError('Customer not found', 'CUSTOMER_NOT_FOUND');
    }

    const existing = await prisma.account_deletion_requests.findFirst({
      where: { user_id: userId, status: 'PENDING' }
    });

    if (existing) {
      return {
        requestId: existing.id,
        status: existing.status,
        reason: existing.reason,
        scheduledPurgeAt: existing.scheduled_purge_at,
        createdAt: existing.created_at,
        cancellationAllowedUntil: existing.scheduled_purge_at
      };
    }

    const scheduledPurgeAt = new Date();
    scheduledPurgeAt.setDate(scheduledPurgeAt.getDate() + 30);

    const deletion = await prisma.$transaction(async (tx) => {
      const record = await tx.account_deletion_requests.create({
        data: {
          user_id: userId,
          status: 'PENDING',
          reason: input?.reason || (input?.feedback ? `Feedback: ${input.feedback}` : null),
          scheduled_purge_at: scheduledPurgeAt
        }
      });

      await tx.users.update({
        where: { user_id: userId },
        data: {
          status: 'DELETION_PENDING',
          updated_on: new Date()
        }
      });

      await tx.auth_audit_logs.create({
        data: {
          user_id: userId,
          phone_number: user.mobile_no,
          event_type: 'ACCOUNT_DELETION_REQUESTED',
          status: 'SUCCESS',
          ip_address: ipAddress
        }
      });

      return record;
    });

    return {
      requestId: deletion.id,
      status: deletion.status,
      reason: deletion.reason,
      scheduledPurgeAt: deletion.scheduled_purge_at,
      createdAt: deletion.created_at,
      cancellationAllowedUntil: deletion.scheduled_purge_at
    };
  }

  async getDeletionRequest(userId: bigint): Promise<DeletionRequestDto | null> {
    const deletion = await prisma.account_deletion_requests.findFirst({
      where: { user_id: userId, status: 'PENDING' },
      orderBy: { created_at: 'desc' }
    });

    if (!deletion) {
      return null;
    }

    return {
      requestId: deletion.id,
      status: deletion.status,
      reason: deletion.reason,
      scheduledPurgeAt: deletion.scheduled_purge_at,
      createdAt: deletion.created_at,
      cancellationAllowedUntil: deletion.scheduled_purge_at
    };
  }

  async cancelAccountDeletion(userId: bigint, ipAddress?: string): Promise<{ message: string; status: string }> {
    const pending = await prisma.account_deletion_requests.findFirst({
      where: { user_id: userId, status: 'PENDING' }
    });

    if (!pending) {
      throw new NotFoundError('No active deletion request found to cancel', 'DELETION_REQUEST_NOT_FOUND');
    }

    const user = await prisma.users.findUnique({ where: { user_id: userId } });

    await prisma.$transaction(async (tx) => {
      await tx.account_deletion_requests.update({
        where: { id: pending.id },
        data: {
          status: 'CANCELLED',
          updated_at: new Date()
        }
      });

      await tx.users.update({
        where: { user_id: userId },
        data: {
          status: 'ACTIVE',
          is_active: true,
          updated_on: new Date()
        }
      });

      await tx.auth_audit_logs.create({
        data: {
          user_id: userId,
          phone_number: user?.mobile_no,
          event_type: 'ACCOUNT_DELETION_CANCELLED',
          status: 'SUCCESS',
          ip_address: ipAddress
        }
      });
    });

    return {
      message: 'Account deletion request has been cancelled successfully. Your account remains active.',
      status: 'ACTIVE'
    };
  }

  // =========================================================================
  // SUPPORT REQUESTS (Phase 4)
  // =========================================================================

  async listSupportTickets(userId: bigint, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.support_tickets.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.support_tickets.count({
        where: { user_id: userId }
      })
    ]);

    const data: SupportTicketDto[] = tickets.map((t) => ({
      ticketId: t.id,
      ticketNumber: t.ticket_number,
      category: t.category,
      subject: t.subject,
      description: t.description,
      status: t.status,
      priority: t.priority,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async createSupportTicket(userId: bigint, input: CreateSupportTicketInput): Promise<SupportTicketDto> {
    const ticketNumber = `TKT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.support_tickets.create({
        data: {
          ticket_number: ticketNumber,
          user_id: userId,
          category: input.category,
          subject: input.subject,
          description: input.description,
          priority: input.priority || 'MEDIUM',
          status: 'OPEN'
        }
      });

      await tx.support_ticket_messages.create({
        data: {
          ticket_id: created.id,
          sender_type: 'CUSTOMER',
          sender_id: userId,
          message: input.description,
          is_internal: false
        }
      });

      return created;
    });

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    };
  }

  async getSupportTicket(userId: bigint, ticketId: string): Promise<SupportTicketDto> {
    const ticket = await prisma.support_tickets.findFirst({
      where: {
        OR: [{ id: ticketId }, { ticket_number: ticketId }],
        user_id: userId
      },
      include: {
        support_ticket_messages: {
          where: { is_internal: false },
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!ticket) {
      throw new NotFoundError('Support ticket not found', 'TICKET_NOT_FOUND');
    }

    return {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      messages: ticket.support_ticket_messages.map((m) => ({
        messageId: m.id,
        senderType: m.sender_type,
        senderId: m.sender_id ? m.sender_id.toString() : null,
        message: m.message,
        createdAt: m.created_at
      }))
    };
  }

  async addTicketMessage(userId: bigint, ticketId: string, input: AddTicketMessageInput): Promise<SupportTicketMessageDto> {
    const ticket = await prisma.support_tickets.findFirst({
      where: {
        OR: [{ id: ticketId }, { ticket_number: ticketId }],
        user_id: userId
      }
    });

    if (!ticket) {
      throw new NotFoundError('Support ticket not found', 'TICKET_NOT_FOUND');
    }

    if (ticket.status === 'CLOSED') {
      throw new BadRequestError('Cannot reply to a closed ticket', 'TICKET_CLOSED');
    }

    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.support_ticket_messages.create({
        data: {
          ticket_id: ticket.id,
          sender_type: 'CUSTOMER',
          sender_id: userId,
          message: input.message,
          is_internal: false
        }
      });

      await tx.support_tickets.update({
        where: { id: ticket.id },
        data: {
          status: ticket.status === 'WAITING_ON_CUSTOMER' ? 'OPEN' : ticket.status,
          updated_at: new Date()
        }
      });

      return msg;
    });

    return {
      messageId: message.id,
      senderType: message.sender_type,
      senderId: message.sender_id ? message.sender_id.toString() : null,
      message: message.message,
      createdAt: message.created_at
    };
  }

  // =========================================================================
  // FAVORITES & RECENT ASTROLOGERS (Phase 4)
  // =========================================================================

  async listFavorites(userId: bigint): Promise<FavoriteAstrologerDto[]> {
    const favorites = await prisma.favorite_astrologers.findMany({
      where: { user_id: userId },
      orderBy: { created_on: 'desc' },
      include: {
        astrologers: {
          include: {
            astrologer_specializations: {
              include: { specializations: true }
            },
            astrologer_languages: {
              include: { languages: true }
            }
          }
        }
      }
    });

    return favorites.map((fav) => {
      const astro = fav.astrologers;
      const primarySpec = astro?.astrologer_specializations?.[0]?.specializations?.specialization_name || null;
      const languages = astro?.astrologer_languages?.map((l) => l.languages.language_name) || [];

      return {
        astrologerId: astro.astrologer_id.toString(),
        displayName: astro.display_name,
        profileImage: astro.profile_image,
        primarySpecialization: primarySpec,
        languages,
        experienceYears: astro.experience_years,
        chatRate: astro.chat_rate ? Number(astro.chat_rate) : 0,
        callRate: astro.call_rate ? Number(astro.call_rate) : 0,
        avgRating: astro.avg_rating ? Number(astro.avg_rating) : 0,
        totalReviews: astro.total_reviews ?? 0,
        isOnline: astro.is_online ?? false,
        favoritedAt: fav.created_on
      };
    });
  }

  async addFavorite(userId: bigint, astrologerId: bigint): Promise<{ message: string; astrologerId: string }> {
    const astro = await prisma.astrologers.findUnique({
      where: { astrologer_id: astrologerId }
    });

    if (!astro) {
      throw new NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
    }

    await prisma.favorite_astrologers.upsert({
      where: {
        user_id_astrologer_id: {
          user_id: userId,
          astrologer_id: astrologerId
        }
      },
      create: {
        user_id: userId,
        astrologer_id: astrologerId
      },
      update: {}
    });

    return {
      message: 'Astrologer added to favorites',
      astrologerId: astrologerId.toString()
    };
  }

  async removeFavorite(userId: bigint, astrologerId: bigint): Promise<void> {
    await prisma.favorite_astrologers.deleteMany({
      where: {
        user_id: userId,
        astrologer_id: astrologerId
      }
    });
  }

  async listRecentAstrologers(userId: bigint, limit: number = 10): Promise<RecentAstrologerDto[]> {
    const recent = await prisma.customer_recent_astrologers.findMany({
      where: { user_id: userId },
      orderBy: { last_interacted_at: 'desc' },
      take: limit,
      include: {
        astrologers: {
          include: {
            astrologer_specializations: {
              include: { specializations: true }
            }
          }
        }
      }
    });

    return recent.map((r) => {
      const astro = r.astrologers;
      const primarySpec = astro?.astrologer_specializations?.[0]?.specializations?.specialization_name || null;

      return {
        astrologerId: astro.astrologer_id.toString(),
        displayName: astro.display_name,
        profileImage: astro.profile_image,
        primarySpecialization: primarySpec,
        chatRate: astro.chat_rate ? Number(astro.chat_rate) : 0,
        callRate: astro.call_rate ? Number(astro.call_rate) : 0,
        avgRating: astro.avg_rating ? Number(astro.avg_rating) : 0,
        interactionType: r.interaction_type,
        lastInteractedAt: r.last_interacted_at
      };
    });
  }

  async recordAstrologerInteraction(
    userId: bigint,
    astrologerId: bigint,
    interactionType: string = 'VIEW'
  ): Promise<void> {
    await prisma.customer_recent_astrologers.upsert({
      where: {
        user_id_astrologer_id: {
          user_id: userId,
          astrologer_id: astrologerId
        }
      },
      create: {
        user_id: userId,
        astrologer_id: astrologerId,
        interaction_type: interactionType,
        last_interacted_at: new Date()
      },
      update: {
        interaction_type: interactionType,
        last_interacted_at: new Date()
      }
    });
  }

  // =========================================================================
  // CUSTOMER ACTIVITY (Phase 4)
  // =========================================================================

  async getCustomerActivity(
    userId: bigint,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: CustomerActivityItemDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [auditLogs, auditTotal] = await Promise.all([
      prisma.auth_audit_logs.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit
      }),
      prisma.auth_audit_logs.count({
        where: { user_id: userId }
      })
    ]);

    const data: CustomerActivityItemDto[] = auditLogs.map((log) => {
      let desc = log.event_type.replace(/_/g, ' ').toLowerCase();
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);
      if (log.status && log.status !== 'SUCCESS') {
        desc += ` (${log.status})`;
      }

      return {
        id: log.id,
        activityType: log.event_type,
        description: desc,
        ipAddress: log.ip_address,
        userAgent: null,
        timestamp: log.created_at
      };
    });

    return {
      data,
      total: auditTotal,
      page,
      limit
    };
  }

}

export const customerService = new CustomerService();
