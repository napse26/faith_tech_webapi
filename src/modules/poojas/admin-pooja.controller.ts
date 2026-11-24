import { Request, Response, NextFunction } from 'express';
import { poojaService } from './pooja.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class AdminPoojaController {
  // Catalog Management
  async listPoojas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;
      const search = req.query.search as string;

      const result = await poojaService.adminListPoojas({ page, limit, status, categoryId, search });
      res.status(200).json(
        createSuccessResponse(result, 'Admin poojas retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async createPooja(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminCreatePooja(req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Pooja created successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePooja(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminUpdatePooja(req.params.poojaId as string, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Pooja updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async setPoojaStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminSetPoojaStatus(req.params.poojaId as string, req.body.status);
      res.status(200).json(
        createSuccessResponse(result, `Pooja status updated to ${req.body.status}`, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async createPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminCreatePackage(req.params.poojaId as string, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Pooja package created successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminUpdatePackage(req.params.packageId as string, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Pooja package updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deletePackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminDeletePackage(req.params.packageId as string);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async createAddon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminCreateAddon(req.params.poojaId as string, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Pooja addon created successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateAddon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminUpdateAddon(req.params.addonId as string, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Pooja addon updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteAddon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminDeleteAddon(req.params.addonId as string);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async bulkCreateSlots(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminBulkCreateSlots(req.params.poojaId as string, req.body);
      res.status(201).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // Booking Administration
  async listBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const status = req.query.status as string;
      const poojaId = req.query.poojaId as string;
      const priestId = req.query.priestId as string;

      const result = await poojaService.adminListBookings({ page, limit, status, poojaId, priestId });
      res.status(200).json(
        createSuccessResponse(result, 'Admin pooja bookings retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBookingDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.getBookingDetails(req.user!.userId, req.params.bookingId as string, true);
      res.status(200).json(
        createSuccessResponse(result, 'Booking details retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async assignPriest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminAssignPriest(req.params.bookingId as string, req.body.priestId, req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminUpdateBookingStatus(
        req.params.bookingId as string,
        req.body.status,
        req.user!.userId,
        req.body.reason
      );
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async setLiveSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminSetLiveSession(
        req.params.bookingId as string,
        req.body.liveStreamUrl,
        req.body.liveStreamNotes,
        req.user!.userId
      );
      res.status(200).json(
        createSuccessResponse(result, 'Live session stream configured', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async processRefund(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminProcessRefund(
        req.params.bookingId as string,
        req.body.refundAmount,
        req.user!.userId,
        req.body.reason
      );
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getBookingAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await poojaService.adminGetBookingAudit(req.params.bookingId as string);
      res.status(200).json(
        createSuccessResponse(result, 'Booking audit trail retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const adminPoojaController = new AdminPoojaController();
