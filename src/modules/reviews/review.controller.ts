import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class ReviewController {
  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reviewService.submitReview(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Review submitted successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getAstrologerReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(String(req.params.astrologer_id || req.params.astrologerId));
      const serviceId = req.query.service_id ? String(req.query.service_id) : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;

      const result = await reviewService.getAstrologerReviews(astrologerId, serviceId, page, limit);
      res.status(200).json(
        createSuccessResponse(result, 'Reviews retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPoojaReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const poojaId = String(req.params.pooja_id || req.params.poojaId || req.params.poojaIdOrSlug);
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;

      const result = await reviewService.getPoojaReviews(poojaId, page, limit);
      res.status(200).json(
        createSuccessResponse(result, 'Reviews retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
