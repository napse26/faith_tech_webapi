"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerFollowService = exports.CustomerFollowService = void 0;
const database_1 = require("../../config/database");
const app_error_1 = require("../../common/errors/app-error");
class CustomerFollowService {
    /**
     * Follow an astrologer (idempotent, only active/approved astrologers).
     */
    async followAstrologer(userId, astrologerId) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { astrologer_id: astrologerId }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
        }
        // Only active/approved astrologers can be followed
        if (astro.onboarding_status && astro.onboarding_status !== 'APPROVED') {
            throw new app_error_1.BadRequestError('Only active astrologers can be followed', 'ASTROLOGER_NOT_ACTIVE');
        }
        const existing = await database_1.prisma.customer_astrologer_follows.findUnique({
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
                record = await database_1.prisma.customer_astrologer_follows.update({
                    where: { follow_id: existing.follow_id },
                    data: {
                        is_active: true,
                        updated_at: now
                    }
                });
            }
            else {
                record = existing;
            }
        }
        else {
            record = await database_1.prisma.customer_astrologer_follows.create({
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
    async unfollowAstrologer(userId, astrologerId) {
        const now = new Date();
        const existing = await database_1.prisma.customer_astrologer_follows.findUnique({
            where: {
                user_id_astrologer_id: {
                    user_id: userId,
                    astrologer_id: astrologerId
                }
            }
        });
        if (existing && existing.is_active) {
            await database_1.prisma.customer_astrologer_follows.update({
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
    async getFollowedAstrologers(userId, page = 1, limit = 10) {
        const safePage = Math.max(1, page);
        const safeLimit = Math.max(1, Math.min(100, limit));
        const skip = (safePage - 1) * safeLimit;
        const [total, items] = await Promise.all([
            database_1.prisma.customer_astrologer_follows.count({
                where: {
                    user_id: userId,
                    is_active: true
                }
            }),
            database_1.prisma.customer_astrologer_follows.findMany({
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
        const astrologers = items.map((f) => {
            const astro = f.astrologers;
            const isOnline = Boolean(astro.is_online);
            const isBusy = Boolean(astro.is_busy);
            const avgRating = astro.avg_rating ? Number(astro.avg_rating) : 0;
            const expYears = astro.experience_years ?? 0;
            const availability = {
                status: isOnline ? (isBusy ? 'BUSY' : 'ONLINE') : 'OFFLINE',
                is_available: isOnline && !isBusy
            };
            const profile_badges = [];
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
exports.CustomerFollowService = CustomerFollowService;
exports.customerFollowService = new CustomerFollowService();
