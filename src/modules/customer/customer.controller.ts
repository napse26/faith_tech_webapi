import { Request, Response, NextFunction } from 'express';
import { customerService } from './customer.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class CustomerController {
  // =========================================================================
  // 3. CORE CUSTOMER PROFILE
  // =========================================================================

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profile = await customerService.getProfile(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(profile, 'Customer profile retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await customerService.updateProfile(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(updated, 'Customer profile updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = await customerService.getStatus(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(status, 'Profile status retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async uploadProfilePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const photoUrl = req.body.profilePhotoUrl || req.body.photoUrl || 'https://storage.supabase.co/profiles/avatar.jpg';
      const result = await customerService.updateProfilePhoto(req.user!.userId, photoUrl);
      res.status(200).json(
        createSuccessResponse(result, 'Profile photo updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async removeProfilePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await customerService.removeProfilePhoto(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(null, 'Profile photo removed successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 4. BIRTH PROFILES
  // =========================================================================

  async listBirthProfiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await customerService.listBirthProfiles(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(list, 'Birth profiles retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async createBirthProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const created = await customerService.createBirthProfile(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(created, 'Birth profile created successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBirthProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profileId = BigInt(String(req.params.profileId));
      const profile = await customerService.getBirthProfile(req.user!.userId, profileId);
      res.status(200).json(
        createSuccessResponse(profile, 'Birth profile retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateBirthProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profileId = BigInt(String(req.params.profileId));
      const updated = await customerService.updateBirthProfile(req.user!.userId, profileId, req.body);
      res.status(200).json(
        createSuccessResponse(updated, 'Birth profile updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteBirthProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profileId = BigInt(String(req.params.profileId));
      await customerService.deleteBirthProfile(req.user!.userId, profileId);
      res.status(200).json(
        createSuccessResponse(null, 'Birth profile deleted successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async setDefaultBirthProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profileId = BigInt(String(req.params.profileId));
      const updated = await customerService.setDefaultBirthProfile(req.user!.userId, profileId);
      res.status(200).json(
        createSuccessResponse(updated, 'Default birth profile updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 5. CONTACT VERIFICATION / CHANGE
  // =========================================================================

  async initiateMobileChange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { newMobileNumber } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const result = await customerService.initiateMobileChange(req.user!.userId, newMobileNumber, ip);
      res.status(200).json(
        createSuccessResponse(result, 'Verification code sent to new mobile number', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyMobileChange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationId, challengeId, otp } = req.body;
      const targetId = verificationId || challengeId;
      const ip = req.ip || req.socket.remoteAddress;
      const result = await customerService.verifyMobileChange(req.user!.userId, targetId, otp, ip);
      res.status(200).json(
        createSuccessResponse(result, 'Mobile number updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async initiateEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await customerService.initiateEmailVerification(req.user!.userId, email);
      res.status(200).json(
        createSuccessResponse(result, 'Verification code sent to email', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationId, challengeId, verificationCode, otp } = req.body;
      const targetId = verificationId || challengeId;
      const code = verificationCode || otp;
      const result = await customerService.verifyEmailVerification(req.user!.userId, targetId, code);
      res.status(200).json(
        createSuccessResponse(result, 'Email verified successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async removeEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await customerService.removeEmail(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(null, 'Email removed successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 6. PREFERENCES
  // =========================================================================

  async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preferences = await customerService.getPreferences(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(preferences, 'Preferences retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await customerService.updatePreferences(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(updated, 'Preferences updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preferences = await customerService.getNotificationPreferences(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(preferences, 'Notification preferences retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await customerService.updateNotificationPreferences(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(updated, 'Notification preferences updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 7. SESSIONS AND DEVICES
  // =========================================================================

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await customerService.getSessions(req.user!.userId, req.user!.sessionId);
      res.status(200).json(
        createSuccessResponse(sessions, 'Sessions retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId);
      await customerService.revokeSession(req.user!.userId, sessionId);
      res.status(200).json(
        createSuccessResponse(null, 'Session revoked successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async revokeOtherSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await customerService.revokeOtherSessions(req.user!.userId, req.user!.sessionId);
      res.status(200).json(
        createSuccessResponse({ revokedCount: count }, 'Other sessions revoked successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const devices = await customerService.getDevices(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(devices, 'Devices retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async removeDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceId = String(req.params.deviceId);
      await customerService.removeDevice(req.user!.userId, deviceId);
      res.status(200).json(
        createSuccessResponse(null, 'Device removed successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 8. SECURITY & LOGOUT
  // =========================================================================

  async getSecurityOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await customerService.getSecurityOverview(req.user!.userId, req.user!.sessionId);
      res.status(200).json(
        createSuccessResponse(overview, 'Security overview retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await customerService.revokeSession(req.user!.userId, req.user!.sessionId);
      res.status(200).json(
        createSuccessResponse(null, 'Logged out successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await customerService.revokeOtherSessions(req.user!.userId, '');
      await customerService.revokeSession(req.user!.userId, req.user!.sessionId);
      res.status(200).json(
        createSuccessResponse(null, 'Logged out from all devices successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // PRIVACY & CONSENT (Phase 3)
  // =========================================================================

  async getConsents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const consents = await customerService.getConsents(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(consents, 'Consents retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateConsents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const consents = await customerService.updateConsents(req.user!.userId, req.body, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.status(200).json(
        createSuccessResponse(consents, 'Consents updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async acceptConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const consent = await customerService.acceptConsent(req.user!.userId, req.body, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      res.status(200).json(
        createSuccessResponse(consent, 'Consent accepted successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPrivacyOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await customerService.getPrivacyOverview(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(overview, 'Privacy overview retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // ACCOUNT LIFECYCLE (Phase 3)
  // =========================================================================

  async deactivateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerService.deactivateAccount(req.user!.userId, req.body, req.ip);
      res.status(200).json(
        createSuccessResponse(result, 'Account deactivated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async reactivateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerService.reactivateAccount(req.user!.userId, req.body, req.ip);
      res.status(200).json(
        createSuccessResponse(result, 'Account reactivated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async requestAccountDeletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerService.requestAccountDeletion(req.user!.userId, req.body, req.ip);
      res.status(200).json(
        createSuccessResponse(result, 'Account deletion requested successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getDeletionRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerService.getDeletionRequest(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Account deletion request retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async cancelAccountDeletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerService.cancelAccountDeletion(req.user!.userId, req.ip);
      res.status(200).json(
        createSuccessResponse(result, 'Account deletion request cancelled successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // SUPPORT REQUESTS (Phase 4)
  // =========================================================================

  async listSupportTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
      const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10))) : 20;
      const result = await customerService.listSupportTickets(req.user!.userId, page, limit);
      res.status(200).json(
        createSuccessResponse(result, 'Support tickets retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async createSupportTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = await customerService.createSupportTicket(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(ticket, 'Support ticket created successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getSupportTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = String(req.params.ticketId);
      const ticket = await customerService.getSupportTicket(req.user!.userId, ticketId);
      res.status(200).json(
        createSuccessResponse(ticket, 'Support ticket retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async addTicketMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = String(req.params.ticketId);
      const message = await customerService.addTicketMessage(req.user!.userId, ticketId, req.body);
      res.status(201).json(
        createSuccessResponse(message, 'Message added to support ticket successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // FAVORITES & RECENT ASTROLOGERS (Phase 4)
  // =========================================================================

  async listFavorites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const favorites = await customerService.listFavorites(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(favorites, 'Favorite astrologers retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async addFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(String(req.params.astrologerId));
      const result = await customerService.addFavorite(req.user!.userId, astrologerId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer added to favorites successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async removeFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(String(req.params.astrologerId));
      await customerService.removeFavorite(req.user!.userId, astrologerId);
      res.status(200).json(
        createSuccessResponse(null, 'Astrologer removed from favorites successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async listRecentAstrologers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10))) : 10;
      const recent = await customerService.listRecentAstrologers(req.user!.userId, limit);
      res.status(200).json(
        createSuccessResponse(recent, 'Recent astrologers retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // CUSTOMER ACTIVITY (Phase 4)
  // =========================================================================

  async getCustomerActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
      const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10))) : 20;
      const activity = await customerService.getCustomerActivity(req.user!.userId, page, limit);
      res.status(200).json(
        createSuccessResponse(activity, 'Customer activity retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

}

export const customerController = new CustomerController();
