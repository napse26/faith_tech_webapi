import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class AstrologerChatController {
  async getPendingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chatService.getPendingRequestsForAstrologer(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Pending chat requests retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async acceptRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await chatService.acceptChat(req.user!.userId, sessionId);
      res.status(200).json(
        createSuccessResponse(result, 'Chat request accepted and consultation started', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const reason = req.body?.reason;
      const result = await chatService.rejectChat(req.user!.userId, sessionId, reason);
      res.status(200).json(
        createSuccessResponse(result, 'Chat request rejected', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async listAstrologerSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string | undefined;

      const result = await chatService.getSessions(req.user!.userId, 'ASTROLOGER', { page, limit, status });
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer chat consultations retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async endSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const reason = req.body?.reason || 'ASTROLOGER_ENDED';
      const result = await chatService.endSession(req.user!.userId, sessionId, reason);
      res.status(200).json(
        createSuccessResponse(result, 'Chat consultation concluded successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const astrologerChatController = new AstrologerChatController();
