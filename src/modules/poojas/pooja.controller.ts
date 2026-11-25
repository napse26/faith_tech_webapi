import { Request, Response, NextFunction } from 'express';
import { poojaService } from './pooja.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class PoojaController {
  // =========================================================================
  // 1. PUBLIC POOJA CATALOG
  // =========================================================================

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await poojaService.getCategories();
      res.status(200).json(
        createSuccessResponse(categories, 'Pooja categories retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async listPoojas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;
      const category = req.query.category ? (req.query.category as string) : undefined;
      const isFeatured = req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : undefined;
      const isScheduled = req.query.isScheduled !== undefined ? req.query.isScheduled === 'true' : undefined;
      const liveStreamingOnly = req.query.liveStreamingOnly !== undefined ? req.query.liveStreamingOnly === 'true' : undefined;
      const minRating = req.query.minRating ? parseFloat(req.query.minRating as string) : undefined;
      const sankalpFee = req.query.sankalpFee as string | undefined;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;

      const result = await poojaService.listPoojas({
        page,
        limit,
        categoryId,
        category,
        isFeatured,
        isScheduled,
        liveStreamingOnly,
        minRating,
        sankalpFee,
        minPrice,
        maxPrice,
        language: req.query.language as string,
        deliveryMode: req.query.deliveryMode as string,
        search: req.query.search as string
      });

      res.status(200).json(
        createSuccessResponse(result, 'Pooja catalog retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPoojaDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pooja = await poojaService.getPoojaDetails(req.params.poojaIdOrSlug as string);
      res.status(200).json(
        createSuccessResponse(pooja, 'Pooja details retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPoojaPackages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const packages = await poojaService.getPoojaPackages(req.params.poojaId as string);
      res.status(200).json(
        createSuccessResponse(packages, 'Pooja packages retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPoojaAddons(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const addons = await poojaService.getPoojaAddons(req.params.poojaId as string);
      res.status(200).json(
        createSuccessResponse(addons, 'Pooja addons retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPoojaAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const availability = await poojaService.getPoojaAvailability(req.params.poojaId as string, startDate, endDate);
      res.status(200).json(
        createSuccessResponse(availability, 'Pooja availability dates retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPoojaSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const slots = await poojaService.getPoojaSlots(req.params.poojaId as string, dateStr);
      res.status(200).json(
        createSuccessResponse(slots, `Slots retrieved for ${dateStr}`, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPoojaRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requirements = await poojaService.getPoojaRequirements(req.params.poojaId as string);
      res.status(200).json(
        createSuccessResponse(requirements, 'Pooja requirements and sankalp fields retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 2. QUOTE ENGINE
  // =========================================================================

  async generateQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quote = await poojaService.generateQuote(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(quote, 'Pooja booking quote generated with 15-minute slot lock', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getQuote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const quote = await poojaService.getQuote(req.user!.userId, req.params.quoteId as string);
      res.status(200).json(
        createSuccessResponse(quote, 'Quote details retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 3. CUSTOMER BOOKINGS
  // =========================================================================

  async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const booking = await poojaService.createBooking(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(booking, 'Pooja booking created successfully. Awaiting payment.', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string;

      const result = await poojaService.listCustomerBookings(req.user!.userId, { page, limit, status });
      res.status(200).json(
        createSuccessResponse(result, 'Customer bookings retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBookingDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const booking = await poojaService.getBookingDetails(req.user!.userId, req.params.bookingId as string);
      res.status(200).json(
        createSuccessResponse(booking, 'Booking details retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async initiatePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.initiatePayment(req.user!.userId, req.params.bookingId as string, req.body);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.cancelBooking(req.user!.userId, req.params.bookingId as string, req.body);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async rescheduleBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.rescheduleBooking(req.user!.userId, req.params.bookingId as string, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Booking rescheduled successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receipt = await poojaService.getReceipt(req.user!.userId, req.params.bookingId as string);
      res.status(200).json(
        createSuccessResponse(receipt, 'Digital invoice and receipt retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getLiveSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const session = await poojaService.getLiveSession(req.user!.userId, req.params.bookingId as string);
      res.status(200).json(
        createSuccessResponse(session, 'Live pooja session stream details retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async submitFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const feedback = await poojaService.submitFeedback(req.user!.userId, req.params.bookingId as string, req.body);
      res.status(200).json(
        createSuccessResponse(feedback, feedback.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 4. PRIESTS
  // =========================================================================

  async listPriests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const priests = await poojaService.listPriests();
      res.status(200).json(
        createSuccessResponse(priests, 'Priests retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPriestDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const priest = await poojaService.getPriestDetails(req.params.priestId as string);
      res.status(200).json(
        createSuccessResponse(priest, 'Priest details retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // 5. DEVOTEE REVIEWS & CHECKOUT CONTEXT
  // =========================================================================

  async getPoojaReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const reviews = await poojaService.getPoojaReviews(req.params.poojaIdOrSlug as string, page, limit);
      res.status(200).json(
        createSuccessResponse(reviews, 'Pooja devotee reviews retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async submitPoojaReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await poojaService.submitPoojaReview(req.user!.userId, req.params.poojaId as string, req.body);
      res.status(201).json(
        createSuccessResponse(review, review.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getCheckoutContext(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const context = await poojaService.getCheckoutContext(req.user!.userId, req.params.poojaId as string);
      res.status(200).json(
        createSuccessResponse(context, 'Checkout context retrieved with family profiles and wallet info', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async addCheckoutFamilyMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const member = await poojaService.addCheckoutFamilyMember(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(member, member.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const poojaController = new PoojaController();
