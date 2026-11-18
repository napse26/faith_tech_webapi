import { Request, Response, NextFunction } from 'express';
import { profileService } from './profile.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class ProfileController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await profileService.getProfile(req.user!.id);
      res.status(200).json(
        createSuccessResponse(profile, 'Profile retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await profileService.updateProfile(req.user!.id, req.body);
      res.status(200).json(
        createSuccessResponse(profile, 'Profile updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileType, fileSize } = req.body;
      const result = await profileService.initiateProfilePhotoUpload(
        req.user!.id,
        fileType,
        fileSize
      );
      res.status(200).json(
        createSuccessResponse(result, 'Profile photo upload URL generated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async initiateEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await profileService.initiateEmailVerification(req.user!.id, email);
      res.status(200).json(
        createSuccessResponse(result, 'Email verification code sent', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async confirmEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId, otp } = req.body;
      const result = await profileService.confirmEmailVerification(req.user!.id, challengeId, otp);
      res.status(200).json(
        createSuccessResponse(result, 'Email verified successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const profileController = new ProfileController();
