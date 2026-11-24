import { Request, Response, NextFunction } from 'express';
import { astrologerService } from './astrologer.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class AdminAstrologerController {
  async listApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const onboardingStatus = req.query.status as string;
      const search = req.query.search as string;

      const result = await astrologerService.adminListApplications({
        page,
        limit,
        onboardingStatus,
        search
      });

      res.status(200).json(
        createSuccessResponse(result, 'Astrologer applications retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getApplicationDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const result = await astrologerService.adminGetApplicationDetails(astrologerId);
      res.status(200).json(
        createSuccessResponse(result, 'Application details retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async startReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const result = await astrologerService.adminStartReview(astrologerId, req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async requestChanges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const result = await astrologerService.adminRequestChanges(astrologerId, req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async approveApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const result = await astrologerService.adminApproveApplication(astrologerId, req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async rejectApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const result = await astrologerService.adminRejectApplication(astrologerId, req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async suspendAstrologer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const result = await astrologerService.adminSuspendAstrologer(astrologerId, req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async reactivateAstrologer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const result = await astrologerService.adminReactivateAstrologer(astrologerId, req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const docId = req.params.docId as string;
      const result = await astrologerService.adminVerifyDocument(astrologerId, docId, req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, `Document marked as ${req.body.status}`, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getAuditHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(req.params.astrologerId as string);
      const result = await astrologerService.adminGetAuditHistory(astrologerId);
      res.status(200).json(
        createSuccessResponse(result, 'Audit history retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const adminAstrologerController = new AdminAstrologerController();
