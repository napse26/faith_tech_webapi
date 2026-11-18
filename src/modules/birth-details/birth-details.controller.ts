import { Request, Response, NextFunction } from 'express';
import { birthDetailsService } from './birth-details.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class BirthDetailsController {
  async getBirthDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const details = await birthDetailsService.getBirthDetails(req.user!.id);
      res.status(200).json(
        createSuccessResponse(details, 'Astrology birth details retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async upsertBirthDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const details = await birthDetailsService.upsertBirthDetails(req.user!.id, req.body);
      res.status(200).json(
        createSuccessResponse(details, 'Astrology birth details saved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const birthDetailsController = new BirthDetailsController();
