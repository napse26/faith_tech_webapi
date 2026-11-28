import { Request, Response, NextFunction } from 'express';
import { walletService } from './wallet.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class WalletController {
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await walletService.getBalance(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Wallet balance retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const type = req.query.type as string | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await walletService.getTransactions(req.user!.userId, {
        page,
        limit,
        type,
        startDate,
        endDate
      });

      res.status(200).json(
        createSuccessResponse(result, 'Wallet transactions retrieved successfully', req.traceId)
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

  async createTopupOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await walletService.createTopupOrder(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Top-up order created successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async verifyTopupPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await walletService.verifyTopupPayment(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Top-up payment verified and credited to wallet', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const walletController = new WalletController();
