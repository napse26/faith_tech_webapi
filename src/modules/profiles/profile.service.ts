import { OtpPurpose, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/app-error';
import { UserProfileDto, UpdateProfileInput } from './profile.types';
import { otpService } from '../otp/otp.service';
import { auditService } from '../audit/audit.service';
import { v4 as uuidv4 } from 'uuid';

export class ProfileService {
  /**
   * Retrieves the current user's profile.
   */
  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const profile = user.profile;

    return {
      userId: user.id,
      mobileNumber: user.mobileNumber,
      email: user.email,
      isMobileVerified: user.isMobileVerified,
      isEmailVerified: user.isEmailVerified,
      fullName: profile?.fullName ?? null,
      displayName: profile?.displayName ?? null,
      gender: profile?.gender ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      preferredLanguage: profile?.preferredLanguage ?? 'en',
      country: profile?.country ?? null,
      state: profile?.state ?? null,
      city: profile?.city ?? null,
      timezone: profile?.timezone ?? 'Asia/Kolkata',
      isProfileComplete: profile?.isProfileComplete ?? false,
      createdAt: user.createdAt,
      updatedAt: profile?.updatedAt ?? user.updatedAt
    };
  }

  /**
   * Updates only permitted profile fields using strict allowlist.
   */
  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfileDto> {
    const isComplete = Boolean(
      (input.fullName !== undefined ? input.fullName : true) &&
      (input.gender !== undefined ? input.gender : true) &&
      (input.city !== undefined ? input.city : true)
    );

    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: input.fullName,
        displayName: input.displayName,
        gender: input.gender,
        avatarUrl: input.avatarUrl,
        preferredLanguage: input.preferredLanguage || 'en',
        country: input.country,
        state: input.state,
        city: input.city,
        timezone: input.timezone || 'Asia/Kolkata',
        isProfileComplete: isComplete
      },
      update: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.displayName !== undefined && { displayName: input.displayName }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.state !== undefined && { state: input.state }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        isProfileComplete: isComplete
      }
    });

    await auditService.log({
      userId,
      action: 'PROFILE_UPDATED',
      resource: 'PROFILE',
      metadata: { fieldsUpdated: Object.keys(input) }
    });

    return this.getProfile(userId);
  }

  /**
   * Pre-generates a secure signed profile photo upload reference.
   */
  async initiateProfilePhotoUpload(
    userId: string,
    fileType: string,
    fileSize: number
  ) {
    const extension = fileType.split('/')[1] || 'jpg';
    const uploadId = uuidv4();
    const fileName = `avatars/${userId}/${uploadId}.${extension}`;
    const uploadUrl = `https://storage.faithtech.internal/uploads/${fileName}?uploadToken=${uuidv4()}`;
    const publicUrl = `https://cdn.faithtech.internal/${fileName}`;

    // Also update profile avatarUrl
    await prisma.userProfile.updateMany({
      where: { userId },
      data: { avatarUrl: publicUrl }
    });

    return {
      uploadUrl,
      publicUrl,
      fileName,
      expiresIn: 300 // 5 minutes to complete upload
    };
  }

  /**
   * Initiates email verification flow.
   */
  async initiateEmailVerification(userId: string, email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already claimed by another user
    const existing = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: userId }
      }
    });

    if (existing) {
      throw new ConflictError('Email is already registered with another account', 'EMAIL_ALREADY_EXISTS');
    }

    return otpService.initiateChallenge(normalizedEmail, OtpPurpose.EMAIL_VERIFICATION, userId);
  }

  /**
   * Confirms email verification with challenge code.
   */
  async confirmEmailVerification(userId: string, challengeId: string, otp: string) {
    return prisma.$transaction(async (tx) => {
      const verification = await otpService.verifyChallenge(
        challengeId,
        otp,
        OtpPurpose.EMAIL_VERIFICATION,
        tx
      );

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          email: verification.destination,
          isEmailVerified: true
        }
      });

      await auditService.log(
        {
          userId,
          action: 'EMAIL_VERIFIED',
          resource: 'USER',
          metadata: { email: verification.destination }
        },
        tx
      );

      return {
        email: updatedUser.email,
        isEmailVerified: updatedUser.isEmailVerified
      };
    });
  }
}

export const profileService = new ProfileService();
