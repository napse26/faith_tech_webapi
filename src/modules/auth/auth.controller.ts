import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class AuthController {
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumber, mobileNumber, countryCode, purpose, channel } = req.body;
      const targetPhone = phoneNumber || mobileNumber;
      const ip = req.ip || req.socket.remoteAddress;

      const result = await authService.sendOtp(
        targetPhone,
        countryCode || '+91',
        purpose || 'LOGIN',
        channel || 'SMS',
        ip
      );

      res.status(200).json(
        createSuccessResponse(result, 'OTP sent successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId, otp, device, deviceId, deviceName, platform } = req.body;
      const deviceInfo = {
        deviceId: device?.deviceId || deviceId,
        deviceName: device?.deviceName || deviceName,
        platform: device?.platform || platform,
        appVersion: device?.appVersion,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      const result = await authService.verifyOtp(challengeId, otp, deviceInfo);

      res.status(200).json(
        createSuccessResponse(result, 'Login successful', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const result = await authService.resendOtp(challengeId, ip);

      res.status(200).json(
        createSuccessResponse(result, 'OTP resent successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const ua = req.headers['user-agent'];
      const tokens = await authService.refreshToken(refreshToken, ip, ua);

      res.status(200).json(
        createSuccessResponse(tokens, 'Token refreshed successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logout(req.user.sessionId, req.user.userId);
      }
      res.status(200).json(
        createSuccessResponse(null, 'Logged out successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user) {
        await authService.logoutAll(req.user.userId);
      }
      res.status(200).json(
        createSuccessResponse(null, 'Logged out from all devices successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(user, 'Current user profile fetched successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessions = await authService.getSessions(req.user!.userId, req.user!.sessionId);
      res.status(200).json(
        createSuccessResponse(sessions, 'Active sessions retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = String(req.params.sessionId);
      await authService.revokeSession(sessionId, req.user!.userId);
      res.status(200).json(
        createSuccessResponse(null, 'Session revoked successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async changeMobileSendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { newPhoneNumber, phoneNumber, countryCode } = req.body;
      const targetPhone = newPhoneNumber || phoneNumber;
      const ip = req.ip || req.socket.remoteAddress;

      const result = await authService.changeMobileSendOtp(
        req.user!.userId,
        targetPhone,
        countryCode || '+91',
        ip
      );

      res.status(200).json(
        createSuccessResponse(result, 'OTP sent to new mobile number', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async changeMobileVerifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId, otp } = req.body;
      const ip = req.ip || req.socket.remoteAddress;

      const result = await authService.changeMobileVerifyOtp(
        req.user!.userId,
        challengeId,
        otp,
        ip
      );

      res.status(200).json(
        createSuccessResponse(result, 'Mobile number updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
