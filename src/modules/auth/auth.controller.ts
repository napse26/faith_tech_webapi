import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class AuthController {
  async initiateSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobileNumber, countryCode } = req.body;
      const result = await authService.initiateSignup(mobileNumber, countryCode);
      res.status(200).json(
        createSuccessResponse(result, 'Verification code sent successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifySignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId, otp, deviceId, deviceName, platform } = req.body;
      const deviceInfo = {
        deviceId,
        deviceName,
        platform,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      const result = await authService.verifySignupOtp(challengeId, otp, deviceInfo);
      res.status(201).json(
        createSuccessResponse(result, 'Account created and authenticated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async initiateLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobileNumber, countryCode } = req.body;
      const result = await authService.initiateLogin(mobileNumber, countryCode);
      res.status(200).json(
        createSuccessResponse(result, 'Login verification code sent successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyLoginOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId, otp, deviceId, deviceName, platform } = req.body;
      const deviceInfo = {
        deviceId,
        deviceName,
        platform,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      const result = await authService.verifyLoginOtp(challengeId, otp, deviceInfo);
      res.status(200).json(
        createSuccessResponse(result, 'Authenticated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId } = req.body;
      const result = await authService.resendOtp(challengeId);
      res.status(200).json(
        createSuccessResponse(result, 'Verification code resent successfully', req.traceId)
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
        const ip = req.ip || req.socket.remoteAddress;
        const ua = req.headers['user-agent'];
        await authService.logout(req.user.sessionId, req.user.id, ip, ua);
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
        const ip = req.ip || req.socket.remoteAddress;
        const ua = req.headers['user-agent'];
        await authService.logoutAll(req.user.id, ip, ua);
      }
      res.status(200).json(
        createSuccessResponse(null, 'All active sessions revoked successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
