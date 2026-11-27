import { Request, Response, NextFunction } from 'express';
import { customerFamilyService } from './customer-family.service';
import { customerFollowService } from './customer-follow.service';
import { createSuccessResponse } from '../../common/types/api-response';

export class CustomerFamilyController {
  // =========================================================================
  // FAMILY MEMBERS
  // =========================================================================

  async addFamilyMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerFamilyService.addFamilyMember(req.user!.userId, req.body);
      res.status(201).json(
        createSuccessResponse(result, 'Family member added successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getFamilyMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerFamilyService.getFamilyMembers(req.user!.userId);
      res.status(200).json(
        createSuccessResponse(result, 'Family members retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getFamilyMemberById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = BigInt(String(req.params.member_id || req.params.memberId));
      const result = await customerFamilyService.getFamilyMemberById(req.user!.userId, memberId);
      res.status(200).json(
        createSuccessResponse(result, 'Family member retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async updateFamilyMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = BigInt(String(req.params.member_id || req.params.memberId));
      const result = await customerFamilyService.updateFamilyMember(req.user!.userId, memberId, req.body);
      res.status(200).json(
        createSuccessResponse(result, 'Family member updated successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async deleteFamilyMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const memberId = BigInt(String(req.params.member_id || req.params.memberId));
      const result = await customerFamilyService.deleteFamilyMember(req.user!.userId, memberId);
      res.status(200).json(
        createSuccessResponse(result, 'Family member deleted successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // ASTROLOGER FOLLOW / UNFOLLOW
  // =========================================================================

  async followAstrologer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(String(req.params.astrologer_id || req.params.astrologerId));
      const result = await customerFollowService.followAstrologer(req.user!.userId, astrologerId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer followed successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async unfollowAstrologer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const astrologerId = BigInt(String(req.params.astrologer_id || req.params.astrologerId));
      const result = await customerFollowService.unfollowAstrologer(req.user!.userId, astrologerId);
      res.status(200).json(
        createSuccessResponse(result, 'Astrologer unfollowed successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }

  async getFollowedAstrologers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const result = await customerFollowService.getFollowedAstrologers(req.user!.userId, page, limit);
      res.status(200).json(
        createSuccessResponse(result, 'Followed astrologers retrieved successfully', req.traceId)
      );
    } catch (error) {
      next(error);
    }
  }
}

export const customerFamilyController = new CustomerFamilyController();
