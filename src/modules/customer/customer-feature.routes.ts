import { Router } from 'express';
import { customerFamilyController } from './customer-family.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import {
  addFamilyMemberSchema,
  updateFamilyMemberSchema,
  getFollowingQuerySchema
} from './customer-family.schemas';

const router = Router();

// Apply JWT authentication
router.use(authenticate);

// =========================================================================
// FAMILY MEMBERS API
// =========================================================================
router.post(
  '/family-members',
  validate({ body: addFamilyMemberSchema }),
  customerFamilyController.addFamilyMember
);

router.get(
  '/family-members',
  customerFamilyController.getFamilyMembers
);

router.get(
  '/family-members/:member_id',
  customerFamilyController.getFamilyMemberById
);

router.put(
  '/family-members/:member_id',
  validate({ body: updateFamilyMemberSchema }),
  customerFamilyController.updateFamilyMember
);

router.delete(
  '/family-members/:member_id',
  customerFamilyController.deleteFamilyMember
);

// =========================================================================
// FOLLOW / UNFOLLOW ASTROLOGER API
// =========================================================================
router.post(
  '/astrologers/:astrologer_id/follow',
  customerFamilyController.followAstrologer
);

router.delete(
  '/astrologers/:astrologer_id/follow',
  customerFamilyController.unfollowAstrologer
);

router.get(
  '/astrologers/following',
  validate({ query: getFollowingQuerySchema }),
  customerFamilyController.getFollowedAstrologers
);

export const customerV1Router = router;
