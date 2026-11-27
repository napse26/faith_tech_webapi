import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../common/errors/app-error';
import { SubmitReviewInput } from './review.schemas';

export interface RatingSummary {
  '5': number;
  '4': number;
  '3': number;
  '2': number;
  '1': number;
}

export interface ReviewItemDto {
  review_id: string;
  rating: number;
  review_text: string | null;
  reviewer_name: string | null;
  reviewer_city: string | null;
  is_anonymous: boolean;
  service_name: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

export interface EntityReviewsResponseDto {
  entity_type: 'ASTROLOGER' | 'POOJA';
  entity_id: string;
  service_id: string | null;
  average_rating: number;
  total_reviews: number;
  rating_summary: RatingSummary;
  reviews: ReviewItemDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface SubmitReviewResponseDto {
  review_id: string;
  review_type: 'ASTROLOGER' | 'POOJA';
  astrologer_id?: string;
  service_id?: string;
  pooja_id?: string;
  booking_id: string;
  rating: number;
  review_text: string | null;
  reviewer_name: string | null;
  reviewer_city: string | null;
  is_anonymous: boolean;
  review_status: string;
  created_at: string;
}

export class ReviewService {
  /**
   * Submit a review for a completed booking (Astrologer or Pooja).
   * Enforces one review per booking; updates if already exists.
   */
  async submitReview(userId: bigint, input: SubmitReviewInput): Promise<SubmitReviewResponseDto> {
    // 1. Fetch user to derive default reviewer_name & reviewer_city if not supplied
    const [user, customerDetail] = await Promise.all([
      prisma.users.findUnique({ where: { user_id: userId } }),
      prisma.customer_details.findFirst({ where: { user_id: userId } })
    ]);

    const reviewerName = input.reviewer_name?.trim() || user?.full_name || 'Devotee';
    const reviewerCity = input.reviewer_city?.trim() || customerDetail?.place_of_birth || null;
    const isAnonymous = input.is_anonymous ?? false;

    let astroId: bigint | null = null;
    let serviceIdStr: string | null = null;
    let poojaIdStr: string | null = null;

    // 2. Validate entity & booking ownership according to review_type
    if (input.review_type === 'ASTROLOGER') {
      astroId = BigInt(input.astrologer_id);
      serviceIdStr = String(input.service_id);

      const astro = await prisma.astrologers.findUnique({
        where: { astrologer_id: astroId }
      });
      if (!astro) {
        throw new NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
      }

      // Check booking validation if existing booking record found in DB
      let consultationSession = null;
      if (/^\d+$/.test(input.booking_id)) {
        consultationSession = await prisma.user_consultation_sessions_detail.findFirst({
          where: { session_id: BigInt(input.booking_id) }
        });
      }

      if (consultationSession && consultationSession.user_id !== userId) {
        throw new ForbiddenError('You can only review your own consultation booking', 'BOOKING_USER_MISMATCH');
      }
    } else if (input.review_type === 'POOJA') {
      poojaIdStr = input.pooja_id;

      const pooja = await prisma.poojas.findUnique({
        where: { pooja_id: poojaIdStr }
      });
      if (!pooja) {
        throw new NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
      }

      // Check pooja booking validation if existing booking record found in DB
      const isBookingUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.booking_id);
      const poojaBooking = await prisma.pooja_bookings.findFirst({
        where: isBookingUuid
          ? { OR: [{ booking_id: input.booking_id }, { booking_number: input.booking_id }] }
          : { booking_number: input.booking_id }
      });

      if (poojaBooking && poojaBooking.user_id !== userId) {
        throw new ForbiddenError('You can only review your own pooja booking', 'BOOKING_USER_MISMATCH');
      }
    }

    // 3. Upsert or update review enforcing one review per booking
    const now = new Date();
    const existing = await prisma.common_reviews.findUnique({
      where: {
        review_type_booking_id: {
          review_type: input.review_type,
          booking_id: input.booking_id
        }
      }
    });

    let review;
    if (existing) {
      if (existing.customer_id !== userId) {
        throw new ForbiddenError('You do not own this review', 'REVIEW_OWNERSHIP_ERROR');
      }

      review = await prisma.common_reviews.update({
        where: { review_id: existing.review_id },
        data: {
          rating: input.rating,
          review_text: input.review_text?.trim() || null,
          reviewer_name: reviewerName,
          reviewer_city: reviewerCity,
          is_anonymous: isAnonymous,
          review_status: 'APPROVED',
          updated_at: now
        }
      });
    } else {
      review = await prisma.common_reviews.create({
        data: {
          customer_id: userId,
          review_type: input.review_type,
          astrologer_id: astroId,
          service_id: serviceIdStr,
          pooja_id: poojaIdStr,
          booking_id: input.booking_id,
          rating: input.rating,
          review_text: input.review_text?.trim() || null,
          reviewer_name: reviewerName,
          reviewer_city: reviewerCity,
          is_anonymous: isAnonymous,
          is_verified_purchase: true,
          review_status: 'APPROVED',
          created_at: now,
          updated_at: now
        }
      });
    }

    // 4. Update parent aggregate rating asynchronously / inline
    if (astroId) {
      await this.updateAstrologerRating(astroId);
    } else if (poojaIdStr) {
      await this.updatePoojaRating(poojaIdStr);
    }

    // 5. Construct response object matching Section 3.3
    const responseData: SubmitReviewResponseDto = {
      review_id: review.review_id,
      review_type: review.review_type as 'ASTROLOGER' | 'POOJA',
      booking_id: review.booking_id,
      rating: review.rating,
      review_text: review.review_text,
      reviewer_name: review.reviewer_name,
      reviewer_city: review.reviewer_city,
      is_anonymous: review.is_anonymous,
      review_status: review.review_status,
      created_at: review.created_at.toISOString()
    };

    if (review.review_type === 'ASTROLOGER') {
      responseData.astrologer_id = review.astrologer_id?.toString();
      responseData.service_id = review.service_id || undefined;
    } else if (review.review_type === 'POOJA') {
      responseData.pooja_id = review.pooja_id || undefined;
    }

    return responseData;
  }

  /**
   * Retrieve reviews for an astrologer, with optional service_id filtering.
   */
  async getAstrologerReviews(
    astrologerId: bigint,
    serviceId?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<EntityReviewsResponseDto> {
    const astro = await prisma.astrologers.findUnique({
      where: { astrologer_id: astrologerId }
    });

    if (!astro) {
      throw new NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
    }

    const whereClause: any = {
      review_type: 'ASTROLOGER',
      astrologer_id: astrologerId,
      review_status: 'APPROVED'
    };

    if (serviceId) {
      whereClause.service_id = serviceId;
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const skip = (safePage - 1) * safeLimit;

    // Fetch all approved reviews for this query to calculate stats
    const allApproved = await prisma.common_reviews.findMany({
      where: whereClause,
      select: { rating: true }
    });

    const total = allApproved.length;
    const ratingSummary: RatingSummary = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    let sum = 0;

    for (const r of allApproved) {
      sum += r.rating;
      if (r.rating === 5) ratingSummary['5']++;
      else if (r.rating === 4) ratingSummary['4']++;
      else if (r.rating === 3) ratingSummary['3']++;
      else if (r.rating === 2) ratingSummary['2']++;
      else if (r.rating === 1) ratingSummary['1']++;
    }

    const avgRating = total > 0 ? Number((sum / total).toFixed(2)) : Number(astro.avg_rating ?? 5.0);

    // Fetch paginated reviews
    const items = await prisma.common_reviews.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      skip,
      take: safeLimit
    });

    const reviews: ReviewItemDto[] = items.map((r) => {
      let serviceName = 'Astrology Consultation';
      if (r.service_id === '1' || r.service_id?.toLowerCase().includes('call')) {
        serviceName = 'Audio Call Consultation';
      } else if (r.service_id === '2' || r.service_id?.toLowerCase().includes('video')) {
        serviceName = 'Video Call Consultation';
      } else if (r.service_id === '3' || r.service_id?.toLowerCase().includes('chat')) {
        serviceName = 'Chat Consultation';
      }

      return {
        review_id: r.review_id,
        rating: r.rating,
        review_text: r.review_text,
        reviewer_name: r.is_anonymous ? 'Anonymous Devotee' : (r.reviewer_name || 'Devotee'),
        reviewer_city: r.is_anonymous ? null : r.reviewer_city,
        is_anonymous: r.is_anonymous,
        service_name: serviceName,
        is_verified_purchase: r.is_verified_purchase,
        created_at: r.created_at.toISOString()
      };
    });

    return {
      entity_type: 'ASTROLOGER',
      entity_id: astrologerId.toString(),
      service_id: serviceId || null,
      average_rating: avgRating,
      total_reviews: total,
      rating_summary: ratingSummary,
      reviews,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        total_pages: Math.ceil(total / safeLimit) || 1
      }
    };
  }

  /**
   * Retrieve reviews for a pooja.
   */
  async getPoojaReviews(
    poojaIdOrSlug: string,
    page: number = 1,
    limit: number = 10
  ): Promise<EntityReviewsResponseDto> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(poojaIdOrSlug);

    const pooja = await prisma.poojas.findFirst({
      where: isUuid ? { pooja_id: poojaIdOrSlug } : { slug: poojaIdOrSlug }
    });

    if (!pooja) {
      throw new NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
    }

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, Math.min(100, limit));
    const skip = (safePage - 1) * safeLimit;

    // Check common_reviews
    const whereClause = {
      review_type: 'POOJA',
      pooja_id: pooja.pooja_id,
      review_status: 'APPROVED'
    };

    const allApproved = await prisma.common_reviews.findMany({
      where: whereClause,
      select: { rating: true }
    });

    const total = allApproved.length;
    const ratingSummary: RatingSummary = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    let sum = 0;

    for (const r of allApproved) {
      sum += r.rating;
      if (r.rating === 5) ratingSummary['5']++;
      else if (r.rating === 4) ratingSummary['4']++;
      else if (r.rating === 3) ratingSummary['3']++;
      else if (r.rating === 2) ratingSummary['2']++;
      else if (r.rating === 1) ratingSummary['1']++;
    }

    const avgRating = total > 0 ? Number((sum / total).toFixed(2)) : Number(pooja.rating ?? 4.9);

    const items = await prisma.common_reviews.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      skip,
      take: safeLimit
    });

    const reviews: ReviewItemDto[] = items.map((r) => ({
      review_id: r.review_id,
      rating: r.rating,
      review_text: r.review_text,
      reviewer_name: r.is_anonymous ? 'Anonymous Devotee' : (r.reviewer_name || 'Devotee'),
      reviewer_city: r.is_anonymous ? null : r.reviewer_city,
      is_anonymous: r.is_anonymous,
      service_name: null,
      is_verified_purchase: r.is_verified_purchase,
      created_at: r.created_at.toISOString()
    }));

    return {
      entity_type: 'POOJA',
      entity_id: pooja.pooja_id,
      service_id: null,
      average_rating: avgRating,
      total_reviews: total,
      rating_summary: ratingSummary,
      reviews,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        total_pages: Math.ceil(total / safeLimit) || 1
      }
    };
  }

  private async updateAstrologerRating(astrologerId: bigint): Promise<void> {
    const reviews = await prisma.common_reviews.findMany({
      where: { astrologer_id: astrologerId, review_type: 'ASTROLOGER', review_status: 'APPROVED' },
      select: { rating: true }
    });

    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      const avg = Number((sum / reviews.length).toFixed(2));
      await prisma.astrologers.update({
        where: { astrologer_id: astrologerId },
        data: {
          avg_rating: avg,
          total_reviews: reviews.length
        }
      });
    }
  }

  private async updatePoojaRating(poojaId: string): Promise<void> {
    const reviews = await prisma.common_reviews.findMany({
      where: { pooja_id: poojaId, review_type: 'POOJA', review_status: 'APPROVED' },
      select: { rating: true }
    });

    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      const avg = Number((sum / reviews.length).toFixed(2));
      await prisma.poojas.update({
        where: { pooja_id: poojaId },
        data: {
          rating: avg,
          total_reviews: reviews.length
        }
      });
    }
  }
}

export const reviewService = new ReviewService();
