import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class UserController {
  async initiateMobileChange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { newMobileNumber, countryCode } = req.body;
      const result = await userService.initiateMobileChange(
        req.user!.id,
        newMobileNumber,
        countryCode
      );
      res.status(200).json(
        createSuccessResponse(result, 'Verification code sent to new mobile number', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async confirmMobileChange(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId, otp } = req.body;
      const result = await userService.confirmMobileChange(req.user!.id, challengeId, otp);
      res.status(200).json(
        createSuccessResponse(result, 'Mobile number updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const ua = req.headers['user-agent'];
      await userService.deactivateAccount(req.user!.id, ip, ua);
      res.status(200).json(
        createSuccessResponse(null, 'Account deactivated successfully. All sessions terminated.', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async submitDeletionRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reason } = req.body;
      const ip = req.ip || req.socket.remoteAddress;
      const ua = req.headers['user-agent'];
      const result = await userService.submitDeletionRequest(req.user!.id, reason, ip, ua);
      res.status(200).json(
        createSuccessResponse(
          result,
          'Account deletion requested. Your account is scheduled for deletion after 30 days.',
          req.traceId
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async getCurrentDeletionRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await userService.getCurrentDeletionRequest(req.user!.id);
      res.status(200).json(
        createSuccessResponse(result, 'Current deletion request retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
