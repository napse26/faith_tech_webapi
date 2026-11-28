import { Request, Response, NextFunction } from 'express';
import { chatService } from './chat.service';
import { walletService } from '../wallet/wallet.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class ChatController {
  async requestChat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await chatService.requestChat(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Chat request sent to astrologer. Waiting for acceptance.', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getSessionDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await chatService.getSessionDetails(req.user!.userId, sessionId);
      res.status(200).json(
        createSuccessResponse(result, 'Chat session details retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async cancelRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await chatService.cancelRequest(req.user!.userId, sessionId);
      res.status(200).json(
        createSuccessResponse(result, 'Chat request cancelled successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async listCustomerSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string | undefined;

      const result = await chatService.getSessions(req.user!.userId, 'CUSTOMER', { page, limit, status });
      res.status(200).json(
        createSuccessResponse(result, 'Customer chat sessions retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await chatService.sendMessage(req.user!.userId, sessionId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Chat message sent successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const before = req.query.before as string | undefined;

      const result = await chatService.getMessages(req.user!.userId, sessionId, { page, limit, before });
      res.status(200).json(
        createSuccessResponse(result, 'Chat messages retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async endSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const reason = req.body?.reason;
      const result = await chatService.endSession(req.user!.userId, sessionId, reason);
      res.status(200).json(
        createSuccessResponse(result, 'Chat consultation concluded successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async createAttachmentUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await chatService.createAttachment(req.user!.userId, sessionId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Attachment upload initialized', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getChatTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const result = await walletService.getChatTransactions(req.user!.userId, { page, limit });
      res.status(200).json(
        createSuccessResponse(result, 'User chat transaction history retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
