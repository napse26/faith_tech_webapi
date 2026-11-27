import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../common/errors/app-error';

export interface AstrologerBadge {
  code: string;
  label: string;
}

export interface AstrologerAvailability {
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  is_available: boolean;
}

export interface FollowedAstrologerDto {
  follow_id: number;
  astrologer_id: number;
  display_name: string;
  profile_image: string | null;
  experience_years: number;
  avg_rating: number;
  total_reviews: number;
  availability: AstrologerAvailability;
  profile_badges: AstrologerBadge[];
  followed_at: string;
}

export interface FollowResponseDto {
  follow_id: number;
  astrologer_id: number;
  is_following: boolean;
  followed_at: string;
}

export interface UnfollowResponseDto {
  astrologer_id: number;
  is_following: boolean;
  unfollowed_at: string;
}

export interface FollowedAstrologersListResponseDto {
  astrologers: FollowedAstrologerDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export class CustomerFollowService {
  /**
   * Follow an astrologer (idempotent, only active/approved astrologers).
   */
  async followAstrologer(userId: bigint, astrologerId: bigint): Promise<FollowResponseDto> {
    const astro = await prisma.astrologers.findUnique({
      where: { astrologer_id: astrologerId }
    });

    if (!astro) {
      throw new NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
    }

    // Only active/approved astrologers can be followed
    if (astro.onboarding_status && astro.onboarding_status !== 'APPROVED') {
      throw new BadRequestError('Only active astrologers can be followed', 'ASTROLOGER_NOT_ACTIVE');
    }

    const existing = await prisma.customer_astrologer_follows.findUnique({
      where: {
        user_id_astrologer_id: {
          user_id: userId,
          astrologer_id: astrologerId
        }
      }
    });

    const now = new Date();
    let record;

    if (existing) {
      if (!existing.is_active) {
        record = await prisma.customer_astrologer_follows.update({
          where: { follow_id: existing.follow_id },
          data: {
            is_active: true,
            updated_at: now
          }
        });
      } else {
        record = existing;
      }
    } else {
      record = await prisma.customer_astrologer_follows.create({
        data: {
          user_id: userId,
          astrologer_id: astrologerId,
          is_active: true,
          created_at: now,
          updated_at: now
        }
      });
    }

    return {
      follow_id: Number(record.follow_id),
      astrologer_id: Number(astrologerId),
      is_following: true,
      followed_at: (record.created_at || now).toISOString()
    };
  }

  /**
   * Unfollow an astrologer (idempotent).
   */
  async unfollowAstrologer(userId: bigint, astrologerId: bigint): Promise<UnfollowResponseDto> {
    const now = new Date();

    const existing = await prisma.customer_astrologer_follows.findUnique({
      where: {
        user_id_astrologer_id: {
          user_id: userId,
          astrologer_id: astrologerId
        }
      }
    });

    if (existing && existing.is_active) {
      await prisma.customer_astrologer_follows.update({
        where: { follow_id: existing.follow_id },
        data: {
          is_active: false,
          updated_at: now
        }
      });
    }

    return {
      astrologer_id: Number(astrologerId),
      is_following: false,
      unfollowed_at: now.toISOString()
    };
  }

  /**
   * Get followed astrologers with pagination.
   */
  async getFollowedAstrologers(
    userId: bigint,
    page: number = 1,
    limit: number = 10
  ): Promise<FollowedAstrologersListResponseDto> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const skip = (safePage - 1) * safeLimit;

    const [total, items] = await Promise.all([
      prisma.customer_astrologer_follows.count({
        where: {
          user_id: userId,
          is_active: true
        }
      }),
      prisma.customer_astrologer_follows.findMany({
        where: {
          user_id: userId,
          is_active: true
        },
        include: {
          astrologers: true
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: safeLimit
      })
    ]);

    const astrologers: FollowedAstrologerDto[] = items.map((f) => {
      const astro = f.astrologers;
      const isOnline = Boolean(astro.is_online);
      const isBusy = Boolean(astro.is_busy);
      const avgRating = astro.avg_rating ? Number(astro.avg_rating) : 0;
      const expYears = astro.experience_years ?? 0;

      const availability: AstrologerAvailability = {
        status: isOnline ? (isBusy ? 'BUSY' : 'ONLINE') : 'OFFLINE',
        is_available: isOnline && !isBusy
      };

      const profile_badges: AstrologerBadge[] = [];
      if (avgRating >= 4.5) {
        profile_badges.push({ code: 'TOP_RATED', label: 'Top Rated' });
      }
      if (expYears >= 10) {
        profile_badges.push({ code: 'EXPERIENCED', label: 'Experienced' });
      }
      if (astro.is_verified) {
        profile_badges.push({ code: 'VERIFIED', label: 'Verified Astrologer' });
      }

      return {
        follow_id: Number(f.follow_id),
        astrologer_id: Number(astro.astrologer_id),
        display_name: astro.display_name,
        profile_image: astro.profile_image,
        experience_years: expYears,
        avg_rating: avgRating,
        total_reviews: astro.total_reviews ?? 0,
        availability,
        profile_badges,
        followed_at: (f.created_at || new Date()).toISOString()
      };
    });

    const totalPages = Math.ceil(total / safeLimit) || 1;

    return {
      astrologers,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        total_pages: totalPages
      }
    };
  }
}

export const customerFollowService = new CustomerFollowService();
