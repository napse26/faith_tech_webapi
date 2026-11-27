import { Request, Response, NextFunction } from 'express';
import { astrologerService } from './astrologer.service';
import { createSuccessResponse } from '../../common/types/api-response';
import { BadRequestError } from '../../common/errors/app-error';

export class AstrologerController {
  // 1. APPLICATION & ONBOARDING

  async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.apply(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Astrologer application initiated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getApplication(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer application details retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.updateDraft(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Application draft updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async submitApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.submitApplication(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async resubmitApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.resubmitApplication(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getApplicationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getApplicationStatus(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Application status retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // 2. PROFILE & PHOTOS

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getProfile(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer profile retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.updateProfile(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer profile updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { photoType, photoUrl } = req.body;
      const result = await astrologerService.updatePhoto(req.user!.userId, photoType, photoUrl);
      res.status(200).json(
        createSuccessResponse(result, `${photoType} photo updated successfully`, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deletePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const photoType = (req.query.photoType as string)?.toUpperCase() === 'COVER' ? 'COVER' : 'PROFILE';
      const result = await astrologerService.deletePhoto(req.user!.userId, photoType);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // 3. EXPERTISE & SERVICES & PRICING

  async getExpertise(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getExpertise(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Expertise retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateExpertise(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.updateExpertise(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Expertise updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getServices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getServices(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer services retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async createService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { serviceMasterId, status } = req.body;
      const result = await astrologerService.createService(req.user!.userId, serviceMasterId, status);
      res.status(201).json(
        createSuccessResponse(result, 'Service added successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceId = parseInt(req.params.serviceId as string, 10);
      const result = await astrologerService.updateService(req.user!.userId, serviceId, req.body.status);
      res.status(200).json(
        createSuccessResponse(result, 'Service updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const serviceId = parseInt(req.params.serviceId as string, 10);
      const result = await astrologerService.deleteService(req.user!.userId, serviceId);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPricing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getPricing(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Pricing retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePricing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.updatePricing(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Pricing updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // 4. QUALIFICATIONS

  async getQualifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getQualifications(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Qualifications retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async addQualification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.addQualification(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Qualification added successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateQualification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const qualificationId = req.params.qualificationId as string;
      const result = await astrologerService.updateQualification(req.user!.userId, qualificationId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Qualification updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteQualification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const qualificationId = req.params.qualificationId as string;
      const result = await astrologerService.deleteQualification(req.user!.userId, qualificationId);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // 5. DOCUMENTS

  async getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getDocuments(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Documents retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.uploadDocument(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Document uploaded successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId as string;
      const result = await astrologerService.getDocument(req.user!.userId, documentId);
      res.status(200).json(
        createSuccessResponse(result, 'Document retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documentId = req.params.documentId as string;
      const result = await astrologerService.deleteDocument(req.user!.userId, documentId);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // 6. BANK & PAYOUT DETAILS

  async getPayoutDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getPayoutDetails(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Payout details retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updatePayoutDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.updatePayoutDetails(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Payout details updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // 7. AVAILABILITY & SCHEDULE

  async getAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getAvailability(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Availability schedule retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async setWeeklyAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.setWeeklyAvailability(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Weekly availability updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async addDateException(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.addDateException(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Date exception added successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteDateException(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const exceptionId = req.params.exceptionId as string;
      const result = await astrologerService.deleteDateException(req.user!.userId, exceptionId);
      res.status(200).json(
        createSuccessResponse(result, result.message, req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // 8. ONLINE STATUS & DASHBOARD

  async getOnlineStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getOnlineStatus(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Online status retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async setOnlineStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.setOnlineStatus(req.user!.userId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Online status updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await astrologerService.getDashboard(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer dashboard metrics retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // 9. PUBLIC DISCOVERY (Customers / Unauthenticated)

  async listPublicAstrologers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const specializationId = req.query.specializationId ? parseInt(req.query.specializationId as string, 10) : undefined;
      const languageId = req.query.languageId ? parseInt(req.query.languageId as string, 10) : undefined;
      const isOnline = req.query.isOnline !== undefined ? req.query.isOnline === 'true' : undefined;
      const isFeatured = req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : (req.query.is_featured !== undefined ? req.query.is_featured === 'true' : undefined);
      const isRecommended = req.query.isRecommended !== undefined ? req.query.isRecommended === 'true' : (req.query.is_recommended !== undefined ? req.query.is_recommended === 'true' : undefined);

      const result = await astrologerService.listPublicAstrologers({
        page,
        limit,
        search: req.query.search as string,
        gender: req.query.gender as string,
        specializationId,
        languageId,
        sortBy: req.query.sortBy as any,
        isOnline,
        isFeatured,
        isRecommended
      });

      res.status(200).json(
        createSuccessResponse(result, 'Astrologers retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.astrologerId || req.params.id;
      const idStr = Array.isArray(rawId) ? rawId[0] : (rawId ? String(rawId) : '');
      if (!idStr || isNaN(Number(idStr))) {
        throw new BadRequestError('Invalid astrologer ID', 'INVALID_ASTROLOGER_ID');
      }
      const astrologerId = BigInt(idStr);
      const result = await astrologerService.getPublicProfile(astrologerId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getPublicAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.astrologerId;
      const idStr = Array.isArray(rawId) ? rawId[0] : (rawId ? String(rawId) : '');
      if (!idStr || isNaN(Number(idStr))) {
        throw new BadRequestError('Invalid astrologer ID', 'INVALID_ASTROLOGER_ID');
      }
      const astrologerId = BigInt(idStr);
      const result = await astrologerService.getPublicAvailability(astrologerId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer public availability retrieved', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const astrologerController = new AstrologerController();
