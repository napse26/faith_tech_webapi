"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poojaService = exports.PoojaService = void 0;
const database_1 = require("../../config/database");
const app_error_1 = require("../../common/errors/app-error");
class PoojaService {
    // =========================================================================
    // 1. PUBLIC POOJA CATALOG
    // =========================================================================
    async getCategories() {
        const categories = await database_1.prisma.pooja_categories.findMany({
            where: { is_active: true },
            orderBy: { sort_order: 'asc' }
        });
        return categories.map(c => ({
            categoryId: c.category_id,
            name: c.name,
            code: c.code,
            description: c.description,
            imageUrl: c.image_url,
            sortOrder: c.sort_order,
            isActive: c.is_active
        }));
    }
    async listPoojas(query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 10));
        const skip = (page - 1) * limit;
        const where = {
            status: 'PUBLISHED'
        };
        if (query.categoryId) {
            where.category_id = query.categoryId;
        }
        else if (query.category) {
            const catSearch = query.category.trim();
            const matchedCat = await database_1.prisma.pooja_categories.findFirst({
                where: {
                    OR: [
                        { code: { equals: catSearch, mode: 'insensitive' } },
                        { name: { contains: catSearch, mode: 'insensitive' } }
                    ]
                }
            });
            if (matchedCat) {
                where.category_id = matchedCat.category_id;
            }
        }
        if (query.isFeatured !== undefined) {
            where.is_featured = query.isFeatured;
        }
        if (query.isScheduled !== undefined) {
            where.is_scheduled = query.isScheduled;
        }
        if (query.liveStreamingOnly === true) {
            where.live_streaming_available = true;
        }
        if (query.minRating !== undefined && query.minRating > 0) {
            where.rating = {
                gte: query.minRating
            };
        }
        if (query.language) {
            where.supported_languages = {
                has: query.language
            };
        }
        if (query.deliveryMode) {
            where.delivery_modes = {
                has: query.deliveryMode
            };
        }
        if (query.search) {
            where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { short_description: { contains: query.search, mode: 'insensitive' } },
                { temple_name: { contains: query.search, mode: 'insensitive' } },
                { temple_location: { contains: query.search, mode: 'insensitive' } }
            ];
        }
        // Price filter (sankalpFee)
        let packagePriceFilter = { is_active: true };
        if (query.sankalpFee === 'under_1100') {
            packagePriceFilter.price = { lte: 1100 };
        }
        else if (query.sankalpFee === '1100_to_2500') {
            packagePriceFilter.price = { gte: 1100, lte: 2500 };
        }
        else if (query.sankalpFee === 'above_2500') {
            packagePriceFilter.price = { gte: 2500 };
        }
        else if (query.minPrice !== undefined || query.maxPrice !== undefined) {
            packagePriceFilter.price = {};
            if (query.minPrice !== undefined)
                packagePriceFilter.price.gte = query.minPrice;
            if (query.maxPrice !== undefined)
                packagePriceFilter.price.lte = query.maxPrice;
        }
        if (query.sankalpFee || query.minPrice !== undefined || query.maxPrice !== undefined) {
            where.pooja_packages = {
                some: packagePriceFilter
            };
        }
        const [total, poojas] = await Promise.all([
            database_1.prisma.poojas.count({ where }),
            database_1.prisma.poojas.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ is_featured: 'desc' }, { created_at: 'desc' }],
                include: {
                    pooja_categories: true,
                    pooja_packages: {
                        where: { is_active: true },
                        orderBy: { price: 'asc' }
                    },
                    pooja_slots: {
                        where: {
                            is_active: true,
                            slot_date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                        },
                        orderBy: [{ slot_date: 'asc' }, { start_time: 'asc' }],
                        take: 1
                    }
                }
            })
        ]);
        return {
            poojas: poojas.map(p => {
                const startingPrice = p.pooja_packages.length > 0
                    ? Math.min(...p.pooja_packages.map(pkg => Number(pkg.discount_price ?? pkg.price)))
                    : 0;
                let timing = 'Select your preferred date & time';
                if (p.is_scheduled && p.pooja_slots.length > 0) {
                    const s = p.pooja_slots[0];
                    const slotDateStr = s.slot_date.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    });
                    timing = `${slotDateStr} • ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`;
                }
                else if (p.is_scheduled) {
                    timing = 'Upcoming Daily & Muhurat Slots';
                }
                const shortBenefits = (p.benefits && p.benefits.length >= 2)
                    ? [p.benefits[0], p.benefits[1]]
                    : (p.benefits || []);
                return {
                    poojaId: p.pooja_id,
                    title: p.title,
                    slug: p.slug,
                    tag: p.tag || (p.is_featured ? "Today's Special Ritual" : p.pooja_categories.name),
                    category: p.pooja_categories.name,
                    categoryCode: p.pooja_categories.code,
                    bannerUrl: p.banner_url || p.image_url,
                    imageUrl: p.image_url || p.banner_url,
                    rating: Number(p.rating ?? 4.90),
                    totalReviews: p.total_reviews ?? 0,
                    location: p.temple_location || p.temple_name || 'Sanatan Sacred Kshetra',
                    templeName: p.temple_name,
                    timing,
                    shortBenefits,
                    benefits: p.benefits || [],
                    price: startingPrice,
                    startingPrice,
                    participateNowLink: `/api/v1/poojas/${p.slug}`,
                    isFeatured: p.is_featured ?? false,
                    isScheduled: p.is_scheduled ?? true,
                    liveStreamingAvailable: p.live_streaming_available ?? true,
                    durationMinutes: p.duration_minutes,
                    packagesCount: p.pooja_packages.length
                };
            }),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async getPoojaDetails(idOrSlug) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        const pooja = await database_1.prisma.poojas.findFirst({
            where: isUuid
                ? { pooja_id: idOrSlug, status: 'PUBLISHED' }
                : { slug: idOrSlug, status: 'PUBLISHED' },
            include: {
                pooja_categories: true,
                pooja_packages: {
                    where: { is_active: true },
                    orderBy: { price: 'asc' }
                },
                pooja_addons: {
                    where: { is_active: true },
                    orderBy: { price: 'asc' }
                },
                priests: true,
                pooja_slots: {
                    where: {
                        is_active: true,
                        slot_date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    },
                    orderBy: [{ slot_date: 'asc' }, { start_time: 'asc' }],
                    take: 5
                },
                pooja_reviews: {
                    orderBy: { created_at: 'desc' },
                    take: 3
                }
            }
        });
        if (!pooja) {
            throw new app_error_1.NotFoundError('Pooja not found or not published', 'POOJA_NOT_FOUND');
        }
        const startingPrice = pooja.pooja_packages.length > 0
            ? Math.min(...pooja.pooja_packages.map(pkg => Number(pkg.discount_price ?? pkg.price)))
            : 0;
        let timing = 'Choose your preferred date & time';
        let nextCommenceDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 3600 * 1000 + 10 * 60 * 1000);
        if (pooja.is_scheduled && pooja.pooja_slots.length > 0) {
            const s = pooja.pooja_slots[0];
            const slotDateStr = s.slot_date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            timing = `${slotDateStr} | ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`;
            try {
                const slotDatePart = s.slot_date.toISOString().split('T')[0];
                nextCommenceDate = new Date(`${slotDatePart}T${s.start_time}`);
            }
            catch {
                // default
            }
        }
        else if (pooja.is_scheduled) {
            timing = 'Today • 06:00 PM - 07:30 PM';
        }
        const msUntilCommence = Math.max(0, nextCommenceDate.getTime() - Date.now());
        const days = Math.floor(msUntilCommence / (24 * 3600 * 1000));
        const hours = Math.floor((msUntilCommence % (24 * 3600 * 1000)) / (3600 * 1000));
        const minutes = Math.floor((msUntilCommence % (3600 * 1000)) / (60 * 1000));
        const seconds = Math.floor((msUntilCommence % (60 * 1000)) / 1000);
        const defaultIncludedItems = [
            { icon: 'scroll', title: 'Name & Gotra Recitation', description: 'Priest recites your family names & gotra during live sankalp' },
            { icon: 'box', title: 'Blessed Prasad Speed Post', description: 'Holy gangajal, dry fruit prasad, kumkum & sacred thread' },
            { icon: 'video', title: 'Live Video Link & Recording', description: 'Watch your pooja performed live in HD on the app' },
            { icon: 'fire', title: 'Complete Vedic Hawan', description: 'Full Vedic mantras recited according to ancient Shastras' }
        ];
        const defaultGallery = [
            { url: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=800&q=80', title: 'Sanctum Sanctorum & Lingam' },
            { url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80', title: 'Sacred Bhasma Aarti & Hawan Kund' }
        ];
        const priest = pooja.priests || {
            priest_id: 'default-priest',
            name: 'Acharya Devrat Sharma',
            qualification: 'Chief Priest, Kashi Ghat',
            rating: 4.98,
            experience_years: 15,
            temple_affiliation: 'Kashi Vishwanath Temple, Varanasi'
        };
        // Calculate total participants (if scheduled pooja)
        let totalParticipants = null;
        let participantsLabel = 'Exclusive 1-on-1 Personal Seva';
        if (pooja.is_scheduled) {
            const confirmedBookings = await database_1.prisma.pooja_bookings.count({
                where: {
                    pooja_id: pooja.pooja_id,
                    status: { in: ['CONFIRMED', 'COMPLETED', 'PAID'] }
                }
            });
            const baseParticipants = pooja.total_participants ?? 1250;
            const computedTotal = Number(baseParticipants) + confirmedBookings;
            totalParticipants = computedTotal;
            participantsLabel = `${computedTotal.toLocaleString('en-IN')}+ Devotees Enrolled`;
        }
        // Detailed step-by-step Pooja Process
        const defaultProcess = [
            {
                stepNumber: 1,
                title: 'Sankalp & Deep Prajwalan',
                description: 'The head Acharya lights the sacred Akhand Jyot, recites Vedic Ganpati invocations, and formally pronounces your Gotra, Nakshatra, and family names into the Sankalp patra.',
                significance: 'Establishes the divine link between the devotee and the presiding deity, removing all karmic obstacles.',
                duration: '10-15 mins'
            },
            {
                stepNumber: 2,
                title: 'Shodashopachara & Panchamrit Abhishekam',
                description: 'Consecration of the deity/Shivalinga with holy Gangajal, cow milk, fresh curd, pure desi cow ghee, honey, and sugarcane juice accompanied by sacred Vedic stotram chanting.',
                significance: 'Purifies subtle energy channels, cleanses sins, and brings peace, healing, and divine grace.',
                duration: '25-30 mins'
            },
            {
                stepNumber: 3,
                title: 'Vedic Mantra Recitation & Archana',
                description: 'Chanting of sacred Vedic mantras (Sri Rudram / Sri Suktam / Atharvashirsha) with offerings of 108 fresh Bilva leaves, Chandan, and sacred flowers.',
                significance: 'Pacifies planetary doshas (Rahu-Ketu, Shani, Manglik) and bestows health, long life, and spiritual aura.',
                duration: '20 mins'
            },
            {
                stepNumber: 4,
                title: 'Sacred Hawan & Personalized Ahuti',
                description: 'Sacred fire ritual (Havan) performed in the consecrated Homa Kund with rare herbs and pure samagri. Personalized ahutis are offered invoking divine blessings for your family.',
                significance: 'Dispels negative energies, protects from evil eye, and attracts prosperity, wealth, and career breakthroughs.',
                duration: '25-30 mins'
            },
            {
                stepNumber: 5,
                title: 'Maha Aarti & Shankhanaad',
                description: 'Grand Vedic Aarti performed with multi-tiered camphor flames and Pancha Deepa, accompanied by sacred bells and conch blowing.',
                significance: 'Fills the atmosphere with divine vibrational frequencies and seals spiritual merits into the devotee’s aura.',
                duration: '10 mins'
            },
            {
                stepNumber: 6,
                title: 'Prasad Consecration & Speed Post Dispatch',
                description: 'Blessed prasad (Gangajal, dry fruits, sacred thread, energized copper yantra) is sanctified in the Garbhagriha, packed safely, and dispatched to your home address.',
                significance: 'Brings authentic temple blessings physically into your home shrine to sanctify your living space.',
                duration: 'Concluding'
            }
        ];
        const poojaProcess = (Array.isArray(pooja.pooja_process) && pooja.pooja_process.length > 0)
            ? pooja.pooja_process
            : (Array.isArray(pooja.ritual_steps) && pooja.ritual_steps.length > 0)
                ? pooja.ritual_steps.map((step, idx) => ({
                    stepNumber: idx + 1,
                    title: step.split(':')[0] || `Ritual Step ${idx + 1}`,
                    description: step.split(':')[1]?.trim() || step,
                    significance: 'Vedic scriptural ritual performed for devotee welfare',
                    duration: '15-20 mins'
                }))
                : defaultProcess;
        // Format packages: INDIVIDUAL, PARTNER, FAMILY, JOINT_FAMILY_BHOG
        const formattedPackages = pooja.pooja_packages.map(pkg => {
            const rawCode = pkg.package_code?.toUpperCase();
            const packageCode = rawCode || (pkg.max_devotees === 1 ? 'INDIVIDUAL' :
                pkg.max_devotees === 2 ? 'PARTNER' :
                    (pkg.max_devotees ?? 4) <= 4 ? 'FAMILY' : 'JOINT_FAMILY_BHOG');
            const includesBhog = packageCode === 'JOINT_FAMILY_BHOG' || pkg.title.toLowerCase().includes('bhog');
            return {
                packageId: pkg.package_id,
                packageCode,
                title: pkg.title,
                description: pkg.description,
                price: Number(pkg.price),
                discountPrice: Number(pkg.discount_price ?? pkg.price),
                durationMinutes: pkg.duration_minutes,
                maxDevotees: pkg.max_devotees,
                includesBhog,
                samagriIncluded: pkg.samagri_included,
                priestLevel: pkg.priest_level,
                deliveryMode: pkg.delivery_mode
            };
        });
        const packagesByTier = {
            individual: formattedPackages.find(p => p.packageCode === 'INDIVIDUAL') || null,
            partner: formattedPackages.find(p => p.packageCode === 'PARTNER') || null,
            family: formattedPackages.find(p => p.packageCode === 'FAMILY') || null,
            joint_family_bhog: formattedPackages.find(p => p.packageCode === 'JOINT_FAMILY_BHOG') || null
        };
        return {
            poojaId: pooja.pooja_id,
            title: pooja.title,
            slug: pooja.slug,
            tag: pooja.tag || "Today's Special Ritual",
            bannerUrl: pooja.banner_url || pooja.image_url,
            imageUrl: pooja.image_url || pooja.banner_url,
            rating: Number(pooja.rating ?? 4.90),
            totalReviews: pooja.total_reviews ?? 340,
            ratingDistribution: {
                '5': 92,
                '4': 8,
                '3': 0,
                '2': 0,
                '1': 0
            },
            location: pooja.temple_location || pooja.temple_name || 'Kashi Vishwanath Temple • Varanasi, UP',
            templeName: pooja.temple_name,
            timing,
            isScheduled: pooja.is_scheduled ?? true,
            totalParticipants,
            participantsLabel,
            isFeatured: pooja.is_featured ?? false,
            liveStreamingAvailable: pooja.live_streaming_available ?? true,
            priest: {
                priestId: priest.priest_id,
                name: priest.name,
                qualification: priest.qualification || 'Chief Priest, Kashi Ghat',
                rating: Number(priest.rating ?? 4.98),
                experienceYears: priest.experience_years ?? 15,
                templeAffiliation: priest.temple_affiliation || 'Kashi Vishwanath Temple',
                avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
                viewAcharyaLink: `/api/v1/poojas/priests/${priest.priest_id}`
            },
            timer: {
                targetTimestamp: nextCommenceDate.toISOString(),
                days: String(days).padStart(2, '0'),
                hours: String(hours).padStart(2, '0'),
                minutes: String(minutes).padStart(2, '0'),
                seconds: String(seconds).padStart(2, '0'),
                isCommenced: msUntilCommence === 0
            },
            benefits: pooja.benefits || [],
            includedItems: (Array.isArray(pooja.included_items) && pooja.included_items.length > 0)
                ? pooja.included_items
                : defaultIncludedItems,
            gallery: (Array.isArray(pooja.gallery_images) && pooja.gallery_images.length > 0)
                ? pooja.gallery_images
                : defaultGallery,
            description: pooja.description,
            significance: pooja.significance,
            poojaProcess,
            packages: formattedPackages,
            packagesByTier,
            addons: pooja.pooja_addons.map(a => ({
                addonId: a.addon_id,
                title: a.title,
                description: a.description,
                price: Number(a.price),
                maxQuantity: a.max_quantity ?? 10
            })),
            reviews: pooja.pooja_reviews.map(r => ({
                reviewId: r.review_id,
                reviewerName: r.reviewer_name,
                reviewerCity: r.reviewer_city || 'Varanasi',
                rating: Number(r.rating),
                reviewText: r.review_text,
                isVerifiedSeva: r.is_verified_seva ?? true,
                date: r.created_at ? r.created_at.toISOString().split('T')[0] : 'Recently'
            })),
            startingPrice,
            participateNowLink: `/api/v1/poojas/${pooja.slug}`
        };
    }
    async getPoojaReviews(idOrSlug, page = 1, limit = 10) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
        const pooja = await database_1.prisma.poojas.findFirst({
            where: isUuid ? { pooja_id: idOrSlug } : { slug: idOrSlug },
            select: { pooja_id: true, title: true, rating: true, total_reviews: true }
        });
        if (!pooja) {
            throw new app_error_1.NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
        }
        const skip = (page - 1) * limit;
        const [total, reviewsList] = await Promise.all([
            database_1.prisma.pooja_reviews.count({ where: { pooja_id: pooja.pooja_id } }),
            database_1.prisma.pooja_reviews.findMany({
                where: { pooja_id: pooja.pooja_id },
                skip,
                take: limit,
                orderBy: { created_at: 'desc' }
            })
        ]);
        return {
            poojaId: pooja.pooja_id,
            poojaTitle: pooja.title,
            overallRating: Number(pooja.rating ?? 4.90),
            totalReviews: total || (pooja.total_reviews ?? 0),
            ratingDistribution: {
                '5': 92,
                '4': 8,
                '3': 0,
                '2': 0,
                '1': 0
            },
            reviews: reviewsList.map(r => ({
                reviewId: r.review_id,
                reviewerName: r.reviewer_name,
                reviewerCity: r.reviewer_city,
                rating: Number(r.rating),
                reviewText: r.review_text,
                isVerifiedSeva: r.is_verified_seva,
                date: r.created_at ? r.created_at.toISOString().split('T')[0] : null
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async submitPoojaReview(userId, poojaId, dto) {
        const pooja = await database_1.prisma.poojas.findUnique({
            where: { pooja_id: poojaId }
        });
        if (!pooja) {
            throw new app_error_1.NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
        }
        const user = await database_1.prisma.users.findUnique({
            where: { user_id: userId },
            select: { full_name: true }
        });
        const reviewerName = dto.reviewerName || user?.full_name || 'Devotee';
        const review = await database_1.prisma.pooja_reviews.create({
            data: {
                pooja_id: poojaId,
                user_id: userId,
                reviewer_name: reviewerName,
                reviewer_city: dto.reviewerCity || 'New Delhi',
                rating: dto.rating,
                review_text: dto.reviewText,
                is_verified_seva: true
            }
        });
        // Update total reviews count on poojas
        await database_1.prisma.poojas.update({
            where: { pooja_id: poojaId },
            data: {
                total_reviews: {
                    increment: 1
                }
            }
        });
        return {
            reviewId: review.review_id,
            poojaId,
            reviewerName: review.reviewer_name,
            rating: Number(review.rating),
            reviewText: review.review_text,
            message: 'Review submitted successfully. Thank you for sharing your divine experience!'
        };
    }
    async getCheckoutContext(userId, poojaId) {
        const pooja = await database_1.prisma.poojas.findUnique({
            where: { pooja_id: poojaId },
            include: {
                pooja_packages: {
                    where: { is_active: true },
                    orderBy: { price: 'asc' }
                },
                pooja_addons: {
                    where: { is_active: true },
                    orderBy: { price: 'asc' }
                },
                pooja_slots: {
                    where: {
                        is_active: true,
                        slot_date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
                    },
                    orderBy: [{ slot_date: 'asc' }, { start_time: 'asc' }]
                }
            }
        });
        if (!pooja) {
            throw new app_error_1.NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
        }
        const user = await database_1.prisma.users.findUnique({
            where: { user_id: userId },
            select: {
                user_id: true,
                full_name: true,
                mobile_no: true,
                email: true,
                wallet_balance: true
            }
        });
        const familyProfiles = await database_1.prisma.kundli_profiles.findMany({
            where: { user_id: userId, is_active: true },
            orderBy: [{ is_default: 'desc' }, { created_on: 'asc' }]
        });
        return {
            pooja: {
                poojaId: pooja.pooja_id,
                title: pooja.title,
                templeName: pooja.temple_name,
                templeLocation: pooja.temple_location,
                imageUrl: pooja.image_url,
                isScheduled: pooja.is_scheduled ?? true,
                packages: pooja.pooja_packages.map(pkg => ({
                    packageId: pkg.package_id,
                    title: pkg.title,
                    description: pkg.description,
                    price: Number(pkg.price),
                    discountPrice: Number(pkg.discount_price ?? pkg.price),
                    durationMinutes: pkg.duration_minutes,
                    maxDevotees: pkg.max_devotees,
                    samagriIncluded: pkg.samagri_included
                })),
                addons: pooja.pooja_addons.map(a => ({
                    addonId: a.addon_id,
                    title: a.title,
                    description: a.description,
                    price: Number(a.price),
                    maxQuantity: a.max_quantity ?? 10
                })),
                slots: pooja.pooja_slots.map(s => ({
                    slotId: s.slot_id,
                    slotDate: s.slot_date.toISOString().split('T')[0],
                    startTime: s.start_time,
                    endTime: s.end_time,
                    status: s.status
                }))
            },
            userWallet: {
                balance: Number(user?.wallet_balance ?? 0),
                currency: 'INR'
            },
            primaryDevotee: {
                name: user?.full_name || '',
                mobileNo: user?.mobile_no || '',
                email: user?.email || ''
            },
            familyMembers: familyProfiles.map(f => ({
                profileId: f.kundli_profile_id.toString(),
                name: f.person_name,
                relationship: f.relationship || 'FAMILY_MEMBER',
                gender: f.gender,
                dateOfBirth: f.date_of_birth ? f.date_of_birth.toISOString().split('T')[0] : null,
                timeOfBirth: f.time_of_birth ? f.time_of_birth.toISOString().slice(11, 19) : null,
                placeOfBirth: f.place_of_birth,
                isDefault: f.is_default
            }))
        };
    }
    async addCheckoutFamilyMember(userId, dto) {
        const profile = await database_1.prisma.kundli_profiles.create({
            data: {
                user_id: userId,
                person_name: dto.personName,
                relationship: dto.relationship || 'FAMILY_MEMBER',
                gender: dto.gender,
                date_of_birth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                place_of_birth: dto.placeOfBirth,
                is_active: true,
                is_default: false
            }
        });
        return {
            profileId: profile.kundli_profile_id.toString(),
            name: profile.person_name,
            relationship: profile.relationship,
            gender: profile.gender,
            dateOfBirth: profile.date_of_birth ? profile.date_of_birth.toISOString().split('T')[0] : null,
            placeOfBirth: profile.place_of_birth,
            message: 'Family member added to profile successfully'
        };
    }
    async getPoojaProcess(idOrSlug) {
        const details = await this.getPoojaDetails(idOrSlug);
        return {
            poojaId: details.poojaId,
            title: details.title,
            poojaProcess: details.poojaProcess
        };
    }
    async getPoojaParticipants(idOrSlug) {
        const details = await this.getPoojaDetails(idOrSlug);
        return {
            poojaId: details.poojaId,
            title: details.title,
            isScheduled: details.isScheduled,
            totalParticipants: details.totalParticipants,
            participantsLabel: details.participantsLabel
        };
    }
    async getPoojaPackages(idOrPoojaId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrPoojaId);
        let poojaId = idOrPoojaId;
        if (!isUuid) {
            const p = await database_1.prisma.poojas.findUnique({ where: { slug: idOrPoojaId }, select: { pooja_id: true } });
            if (p)
                poojaId = p.pooja_id;
        }
        const packages = await database_1.prisma.pooja_packages.findMany({
            where: { pooja_id: poojaId, is_active: true },
            orderBy: { price: 'asc' }
        });
        return packages.map(pkg => {
            const rawCode = pkg.package_code?.toUpperCase();
            const packageCode = rawCode || (pkg.max_devotees === 1 ? 'INDIVIDUAL' :
                pkg.max_devotees === 2 ? 'PARTNER' :
                    (pkg.max_devotees ?? 4) <= 4 ? 'FAMILY' : 'JOINT_FAMILY_BHOG');
            const includesBhog = packageCode === 'JOINT_FAMILY_BHOG' || pkg.title.toLowerCase().includes('bhog');
            return {
                packageId: pkg.package_id,
                poojaId: pkg.pooja_id,
                packageCode,
                title: pkg.title,
                description: pkg.description,
                price: Number(pkg.price),
                discountPrice: Number(pkg.discount_price ?? pkg.price),
                durationMinutes: pkg.duration_minutes,
                maxDevotees: pkg.max_devotees,
                includesBhog,
                samagriIncluded: pkg.samagri_included,
                priestLevel: pkg.priest_level,
                deliveryMode: pkg.delivery_mode,
                isActive: pkg.is_active
            };
        });
    }
    async getPoojaAddons(poojaId) {
        const addons = await database_1.prisma.pooja_addons.findMany({
            where: { pooja_id: poojaId, is_active: true },
            orderBy: { price: 'asc' }
        });
        return addons.map(a => ({
            addonId: a.addon_id,
            poojaId: a.pooja_id,
            title: a.title,
            description: a.description,
            price: Number(a.price),
            maxQuantity: a.max_quantity ?? 10,
            isActive: a.is_active
        }));
    }
    async getPoojaAvailability(poojaId, startDate, endDate) {
        const fromDate = startDate ? new Date(startDate) : new Date();
        const toDate = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const slots = await database_1.prisma.pooja_slots.findMany({
            where: {
                pooja_id: poojaId,
                is_active: true,
                slot_date: {
                    gte: fromDate,
                    lte: toDate
                },
                status: { not: 'FULL' }
            },
            select: {
                slot_date: true
            },
            distinct: ['slot_date'],
            orderBy: { slot_date: 'asc' }
        });
        return {
            poojaId,
            availableDates: slots.map(s => s.slot_date.toISOString().split('T')[0])
        };
    }
    async getPoojaSlots(poojaId, dateStr) {
        const slotDate = new Date(dateStr);
        const slots = await database_1.prisma.pooja_slots.findMany({
            where: {
                pooja_id: poojaId,
                slot_date: slotDate,
                is_active: true
            },
            orderBy: { start_time: 'asc' }
        });
        return slots.map(s => {
            const maxCap = s.max_capacity ?? 5;
            const booked = s.booked_count ?? 0;
            const availableCap = Math.max(0, maxCap - booked);
            return {
                slotId: s.slot_id,
                slotDate: s.slot_date.toISOString().split('T')[0],
                startTime: s.start_time,
                endTime: s.end_time,
                timezone: s.timezone,
                maxCapacity: maxCap,
                bookedCount: booked,
                availableCapacity: availableCap,
                status: availableCap > 0 ? 'AVAILABLE' : 'FULL'
            };
        });
    }
    async getPoojaRequirements(poojaId) {
        const pooja = await database_1.prisma.poojas.findUnique({
            where: { pooja_id: poojaId }
        });
        if (!pooja) {
            throw new app_error_1.NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
        }
        return {
            poojaId: pooja.pooja_id,
            title: pooja.title,
            durationMinutes: pooja.duration_minutes,
            deliveryModes: pooja.delivery_modes,
            supportedLanguages: pooja.supported_languages,
            samagriInfo: pooja.samagri_info,
            instructions: pooja.instructions,
            ritualSteps: pooja.ritual_steps,
            cancellationPolicy: pooja.cancellation_policy,
            leadTimeHours: pooja.lead_time_hours,
            sankalpFields: [
                { field: 'sankalpPurpose', required: true, description: 'Purpose or reason for the pooja' },
                { field: 'kuldeviDevta', required: false, description: 'Family Deity / Ishta Devta' },
                { field: 'familyGotra', required: false, description: 'Gotra of devotee family' },
                { field: 'wishes', required: false, description: 'Specific prayer or wish for the sankalp' },
                { field: 'specialInstructions', required: false, description: 'Any dietary/ritual requirements' }
            ],
            devoteeFields: [
                { field: 'name', required: true },
                { field: 'relationship', required: false },
                { field: 'gender', required: false },
                { field: 'gotra', required: false },
                { field: 'rashi', required: false },
                { field: 'nakshatra', required: false },
                { field: 'dateOfBirth', required: false }
            ]
        };
    }
    // =========================================================================
    // 2. QUOTE ENGINE (15-Minute Slot Lock)
    // =========================================================================
    async generateQuote(userId, dto) {
        const pooja = await database_1.prisma.poojas.findFirst({
            where: { pooja_id: dto.poojaId, status: 'PUBLISHED' }
        });
        if (!pooja) {
            throw new app_error_1.NotFoundError('Pooja not found or not published', 'POOJA_NOT_FOUND');
        }
        const pkg = await database_1.prisma.pooja_packages.findFirst({
            where: {
                package_id: dto.packageId,
                pooja_id: dto.poojaId,
                is_active: true
            }
        });
        if (!pkg) {
            throw new app_error_1.NotFoundError('Selected pooja package not found or inactive', 'PACKAGE_NOT_FOUND');
        }
        const isScheduled = dto.isScheduled !== undefined ? dto.isScheduled : (pooja.is_scheduled ?? true);
        let resolvedSlot = null;
        let scheduledDate = null;
        let scheduledTime = null;
        if (isScheduled) {
            if (!dto.slotId) {
                throw new app_error_1.BadRequestError('slotId is required for scheduled poojas', 'SLOT_REQUIRED');
            }
            resolvedSlot = await database_1.prisma.pooja_slots.findFirst({
                where: {
                    slot_id: dto.slotId,
                    pooja_id: dto.poojaId,
                    is_active: true
                }
            });
            if (!resolvedSlot) {
                throw new app_error_1.NotFoundError('Selected pooja slot not found or inactive', 'SLOT_NOT_FOUND');
            }
            const maxCap = resolvedSlot.max_capacity ?? 5;
            const booked = resolvedSlot.booked_count ?? 0;
            if (booked >= maxCap || resolvedSlot.status === 'FULL') {
                throw new app_error_1.BadRequestError('Selected time slot is already fully booked', 'SLOT_FULL');
            }
            scheduledDate = resolvedSlot.slot_date;
            scheduledTime = `${resolvedSlot.start_time.slice(0, 5)} - ${resolvedSlot.end_time.slice(0, 5)}`;
        }
        else {
            // Personal / Unscheduled Pooja: Devotee selects their own date & time
            if (!dto.preferredDate) {
                throw new app_error_1.BadRequestError('preferredDate (YYYY-MM-DD) is required for personal poojas', 'PREFERRED_DATE_REQUIRED');
            }
            scheduledDate = new Date(dto.preferredDate);
            scheduledTime = dto.preferredTime || '10:00 AM';
        }
        // Devotee count check
        if (dto.devotees.length > (pkg.max_devotees ?? 4)) {
            throw new app_error_1.BadRequestError(`Selected package allows maximum ${pkg.max_devotees} devotees. You provided ${dto.devotees.length}.`, 'DEVOTEE_LIMIT_EXCEEDED');
        }
        // Calculate prices
        const basePrice = Number(pkg.discount_price ?? pkg.price);
        let addonsTotal = 0;
        const resolvedAddons = [];
        if (dto.addons && dto.addons.length > 0) {
            const addonIds = dto.addons.map(a => a.addonId);
            const dbAddons = await database_1.prisma.pooja_addons.findMany({
                where: {
                    addon_id: { in: addonIds },
                    pooja_id: dto.poojaId,
                    is_active: true
                }
            });
            for (const sel of dto.addons) {
                const found = dbAddons.find(a => a.addon_id === sel.addonId);
                if (found) {
                    const itemPrice = Number(found.price);
                    const lineTotal = itemPrice * sel.quantity;
                    addonsTotal += lineTotal;
                    resolvedAddons.push({
                        addonId: found.addon_id,
                        title: found.title,
                        price: itemPrice,
                        quantity: sel.quantity,
                        lineTotal
                    });
                }
            }
        }
        const totalPrice = basePrice + addonsTotal;
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute lock
        const quote = await database_1.prisma.pooja_quotes.create({
            data: {
                user_id: userId,
                pooja_id: dto.poojaId,
                package_id: dto.packageId,
                slot_id: isScheduled && resolvedSlot ? resolvedSlot.slot_id : null,
                is_scheduled: isScheduled,
                preferred_date: scheduledDate,
                preferred_time: scheduledTime,
                delivery_mode: dto.deliveryMode,
                addons_json: resolvedAddons,
                devotees_json: dto.devotees,
                sankalp_details_json: (dto.sankalpDetails ?? {}),
                base_price: basePrice,
                addons_total: addonsTotal,
                total_price: totalPrice,
                currency: pkg.currency ?? 'INR',
                expires_at: expiresAt
            }
        });
        const dateStr = scheduledDate ? scheduledDate.toISOString().split('T')[0] : null;
        return {
            quoteId: quote.quote_id,
            isScheduled,
            pooja: {
                poojaId: pooja.pooja_id,
                title: pooja.title,
                deliveryMode: dto.deliveryMode,
                isScheduled
            },
            package: {
                packageId: pkg.package_id,
                title: pkg.title,
                price: basePrice,
                samagriIncluded: pkg.samagri_included
            },
            slot: resolvedSlot
                ? {
                    slotId: resolvedSlot.slot_id,
                    slotDate: resolvedSlot.slot_date.toISOString().split('T')[0],
                    startTime: resolvedSlot.start_time,
                    endTime: resolvedSlot.end_time
                }
                : {
                    slotId: null,
                    slotDate: dateStr,
                    startTime: scheduledTime,
                    endTime: null,
                    type: 'PERSONAL_POOJA_CUSTOM_SCHEDULE'
                },
            scheduledDateTime: `${dateStr} • ${scheduledTime}`,
            devotees: dto.devotees,
            sankalpDetails: dto.sankalpDetails,
            addons: resolvedAddons,
            paymentSummary: {
                basePrice,
                addonsTotal,
                taxes: 0,
                totalAmount: totalPrice,
                currency: pkg.currency ?? 'INR'
            },
            priceBreakdown: {
                basePrice,
                addonsTotal,
                totalPrice,
                currency: pkg.currency ?? 'INR'
            },
            expiresAt: quote.expires_at,
            expiresInSeconds: 900
        };
    }
    async getQuote(userId, quoteId) {
        const quote = await database_1.prisma.pooja_quotes.findUnique({
            where: { quote_id: quoteId },
            include: {
                poojas: true,
                pooja_packages: true,
                pooja_slots: true
            }
        });
        if (!quote) {
            throw new app_error_1.NotFoundError('Quote not found', 'QUOTE_NOT_FOUND');
        }
        if (quote.user_id !== userId) {
            throw new app_error_1.ForbiddenError('You do not have permission to view this quote', 'FORBIDDEN');
        }
        const isExpired = new Date() > quote.expires_at;
        const remainingSeconds = Math.max(0, Math.floor((quote.expires_at.getTime() - Date.now()) / 1000));
        const dateStr = quote.pooja_slots
            ? quote.pooja_slots.slot_date.toISOString().split('T')[0]
            : (quote.preferred_date ? quote.preferred_date.toISOString().split('T')[0] : null);
        const timeStr = quote.pooja_slots
            ? `${quote.pooja_slots.start_time} - ${quote.pooja_slots.end_time}`
            : quote.preferred_time;
        return {
            quoteId: quote.quote_id,
            isExpired,
            isConsumed: quote.is_consumed,
            isScheduled: quote.is_scheduled ?? true,
            remainingSeconds,
            pooja: {
                poojaId: quote.poojas.pooja_id,
                title: quote.poojas.title,
                deliveryMode: quote.delivery_mode,
                isScheduled: quote.is_scheduled ?? true
            },
            package: {
                packageId: quote.pooja_packages.package_id,
                title: quote.pooja_packages.title,
                price: Number(quote.base_price)
            },
            slot: quote.pooja_slots
                ? {
                    slotId: quote.pooja_slots.slot_id,
                    slotDate: quote.pooja_slots.slot_date.toISOString().split('T')[0],
                    startTime: quote.pooja_slots.start_time,
                    endTime: quote.pooja_slots.end_time
                }
                : {
                    slotId: null,
                    slotDate: dateStr,
                    startTime: timeStr,
                    endTime: null,
                    type: 'PERSONAL_POOJA_CUSTOM_SCHEDULE'
                },
            scheduledDateTime: `${dateStr} • ${timeStr}`,
            devotees: quote.devotees_json,
            sankalpDetails: quote.sankalp_details_json,
            addons: quote.addons_json,
            paymentSummary: {
                basePrice: Number(quote.base_price),
                addonsTotal: Number(quote.addons_total),
                taxes: Number(quote.taxes ?? 0),
                totalAmount: Number(quote.total_price),
                currency: quote.currency
            },
            priceBreakdown: {
                basePrice: Number(quote.base_price),
                addonsTotal: Number(quote.addons_total),
                totalPrice: Number(quote.total_price),
                currency: quote.currency
            },
            expiresAt: quote.expires_at
        };
    }
    // =========================================================================
    // 3. CUSTOMER BOOKING LIFECYCLE
    // =========================================================================
    async createBooking(userId, dto) {
        const quote = await database_1.prisma.pooja_quotes.findUnique({
            where: { quote_id: dto.quoteId },
            include: {
                poojas: true,
                pooja_packages: true,
                pooja_slots: true
            }
        });
        if (!quote) {
            throw new app_error_1.NotFoundError('Quote not found', 'QUOTE_NOT_FOUND');
        }
        if (quote.user_id !== userId) {
            throw new app_error_1.ForbiddenError('You do not have access to this quote', 'FORBIDDEN');
        }
        if (quote.is_consumed) {
            throw new app_error_1.BadRequestError('This quote has already been converted to a booking', 'QUOTE_ALREADY_CONSUMED');
        }
        if (new Date() > quote.expires_at) {
            throw new app_error_1.BadRequestError('Quote has expired. Please generate a new quote.', 'QUOTE_EXPIRED');
        }
        // Atomic transaction for slot booking
        const booking = await database_1.prisma.$transaction(async (tx) => {
            let resolvedSlot = null;
            if (quote.is_scheduled && quote.slot_id) {
                resolvedSlot = await tx.pooja_slots.findUnique({
                    where: { slot_id: quote.slot_id }
                });
                if (!resolvedSlot) {
                    throw new app_error_1.NotFoundError('Slot not found', 'SLOT_NOT_FOUND');
                }
                const maxCap = resolvedSlot.max_capacity ?? 5;
                const booked = resolvedSlot.booked_count ?? 0;
                if (booked >= maxCap || resolvedSlot.status === 'FULL') {
                    throw new app_error_1.BadRequestError('Slot became fully booked while processing', 'SLOT_FULL');
                }
                const newBookedCount = booked + 1;
                const newStatus = newBookedCount >= maxCap ? 'FULL' : 'AVAILABLE';
                await tx.pooja_slots.update({
                    where: { slot_id: resolvedSlot.slot_id },
                    data: {
                        booked_count: newBookedCount,
                        status: newStatus
                    }
                });
            }
            // Mark quote consumed
            await tx.pooja_quotes.update({
                where: { quote_id: quote.quote_id },
                data: { is_consumed: true }
            });
            // Generate unique human-readable booking number
            const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randPart = Math.floor(10000 + Math.random() * 90000);
            const bookingNumber = `PJ-${datePart}-${randPart}`;
            const poojaLink = `https://live.dharmadarshan.org/session/${bookingNumber}`;
            const priceSnapshot = {
                basePrice: Number(quote.base_price),
                addonsTotal: Number(quote.addons_total),
                totalPrice: Number(quote.total_price),
                currency: quote.currency,
                addons: quote.addons_json
            };
            const packageSnapshot = {
                packageId: quote.package_id,
                title: quote.pooja_packages.title,
                durationMinutes: quote.pooja_packages.duration_minutes,
                samagriIncluded: quote.pooja_packages.samagri_included,
                priestLevel: quote.pooja_packages.priest_level
            };
            const scheduledDate = quote.preferred_date || (resolvedSlot ? resolvedSlot.slot_date : null);
            const scheduledTime = quote.preferred_time || (resolvedSlot ? `${resolvedSlot.start_time} - ${resolvedSlot.end_time}` : null);
            const createdBooking = await tx.pooja_bookings.create({
                data: {
                    booking_number: bookingNumber,
                    user_id: userId,
                    pooja_id: quote.pooja_id,
                    package_id: quote.package_id,
                    slot_id: quote.slot_id || null,
                    is_scheduled: quote.is_scheduled ?? true,
                    scheduled_date: scheduledDate,
                    scheduled_time: scheduledTime,
                    pooja_link: poojaLink,
                    delivery_mode: quote.delivery_mode,
                    status: 'PENDING_PAYMENT',
                    price_snapshot: priceSnapshot,
                    package_snapshot: packageSnapshot,
                    devotees: quote.devotees_json,
                    sankalp_details: quote.sankalp_details_json,
                    customer_address: dto.customerAddress,
                    priest_id: quote.poojas?.primary_priest_id || null
                }
            });
            // Audit trail
            await tx.pooja_booking_audit.create({
                data: {
                    booking_id: createdBooking.booking_id,
                    from_status: null,
                    to_status: 'PENDING_PAYMENT',
                    actor_id: userId,
                    actor_role: 'CUSTOMER',
                    reason: 'Booking initiated from quote'
                }
            });
            return createdBooking;
        });
        return this.getBookingDetails(userId, booking.booking_id);
    }
    async listCustomerBookings(userId, query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 10));
        const skip = (page - 1) * limit;
        const where = {
            user_id: userId
        };
        if (query.status) {
            where.status = query.status;
        }
        const [total, bookings] = await Promise.all([
            database_1.prisma.pooja_bookings.count({ where }),
            database_1.prisma.pooja_bookings.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    poojas: {
                        select: {
                            pooja_id: true,
                            title: true,
                            image_url: true,
                            temple_name: true,
                            temple_location: true
                        }
                    },
                    pooja_slots: true,
                    priests: {
                        select: {
                            priest_id: true,
                            name: true,
                            qualification: true
                        }
                    }
                }
            })
        ]);
        return {
            bookings: bookings.map(b => {
                const slotDate = b.pooja_slots
                    ? b.pooja_slots.slot_date.toISOString().split('T')[0]
                    : (b.scheduled_date ? b.scheduled_date.toISOString().split('T')[0] : null);
                const startTime = b.pooja_slots ? b.pooja_slots.start_time : b.scheduled_time;
                const endTime = b.pooja_slots ? b.pooja_slots.end_time : null;
                return {
                    bookingId: b.booking_id,
                    bookingNumber: b.booking_number,
                    pooja: b.poojas,
                    status: b.status,
                    deliveryMode: b.delivery_mode,
                    isScheduled: b.is_scheduled ?? true,
                    slotDate,
                    startTime,
                    endTime,
                    scheduledDateTime: `${slotDate} • ${startTime}`,
                    poojaLink: b.pooja_link,
                    priest: b.priests,
                    priceSnapshot: b.price_snapshot,
                    createdAt: b.created_at
                };
            }),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async getBookingDetails(userId, bookingId, isAdmin = false) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId },
            include: {
                poojas: true,
                pooja_packages: true,
                pooja_slots: true,
                priests: true
            }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        if (!isAdmin && booking.user_id !== userId) {
            throw new app_error_1.ForbiddenError('You do not have permission to view this booking', 'FORBIDDEN');
        }
        const scheduledDateStr = booking.scheduled_date
            ? booking.scheduled_date.toISOString().split('T')[0]
            : (booking.pooja_slots ? booking.pooja_slots.slot_date.toISOString().split('T')[0] : null);
        const scheduledTimeStr = booking.scheduled_time
            ? booking.scheduled_time
            : (booking.pooja_slots ? `${booking.pooja_slots.start_time.slice(0, 5)} - ${booking.pooja_slots.end_time.slice(0, 5)}` : null);
        return {
            confirmationMessage: 'Har Har Mahadev! Your Sankalp has been confirmed successfully.',
            bookingId: booking.booking_id,
            bookingNumber: booking.booking_number,
            poojaTitle: booking.poojas.title,
            poojaLocation: booking.poojas.temple_location || booking.poojas.temple_name || 'Sacred Temple Kshetra',
            isScheduled: booking.is_scheduled ?? true,
            scheduledDate: scheduledDateStr,
            scheduledTime: scheduledTimeStr,
            scheduledDateTime: `${scheduledDateStr} | ${scheduledTimeStr}`,
            poojaLink: booking.pooja_link || (booking.live_stream_url || `https://live.dharmadarshan.org/session/${booking.booking_number}`),
            viewBookingAction: {
                label: 'View Booking',
                url: `/api/v1/pooja-bookings/${booking.booking_id}`
            },
            status: booking.status,
            deliveryMode: booking.delivery_mode,
            pooja: {
                poojaId: booking.poojas.pooja_id,
                title: booking.poojas.title,
                templeName: booking.poojas.temple_name,
                templeLocation: booking.poojas.temple_location,
                imageUrl: booking.poojas.image_url,
                durationMinutes: booking.poojas.duration_minutes,
                cancellationPolicy: booking.poojas.cancellation_policy
            },
            package: booking.package_snapshot,
            slot: booking.pooja_slots
                ? {
                    slotId: booking.pooja_slots.slot_id,
                    slotDate: booking.pooja_slots.slot_date.toISOString().split('T')[0],
                    startTime: booking.pooja_slots.start_time,
                    endTime: booking.pooja_slots.end_time,
                    timezone: booking.pooja_slots.timezone
                }
                : {
                    slotId: null,
                    slotDate: scheduledDateStr,
                    startTime: scheduledTimeStr,
                    endTime: null,
                    timezone: 'Asia/Kolkata',
                    type: 'PERSONAL_POOJA_CUSTOM_SCHEDULE'
                },
            priest: booking.priests
                ? {
                    priestId: booking.priests.priest_id,
                    name: booking.priests.name,
                    qualification: booking.priests.qualification,
                    templeAffiliation: booking.priests.temple_affiliation,
                    phone: booking.priests.phone
                }
                : null,
            devotees: booking.devotees,
            sankalpDetails: booking.sankalp_details,
            customerAddress: booking.customer_address,
            liveStreamUrl: booking.live_stream_url || booking.pooja_link,
            liveStreamNotes: booking.live_stream_notes,
            priceSnapshot: booking.price_snapshot,
            cancellation: {
                cancellationReason: booking.cancellation_reason,
                cancellationFee: Number(booking.cancellation_fee),
                refundAmount: Number(booking.refund_amount),
                refundStatus: booking.refund_status
            },
            feedback: {
                rating: booking.feedback_rating,
                comment: booking.feedback_comment
            },
            createdAt: booking.created_at,
            updatedAt: booking.updated_at
        };
    }
    async initiatePayment(userId, bookingId, dto) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        if (booking.user_id !== userId) {
            throw new app_error_1.ForbiddenError('Unauthorized access to booking', 'FORBIDDEN');
        }
        if (booking.status !== 'PENDING_PAYMENT') {
            throw new app_error_1.BadRequestError(`Cannot process payment for booking in status ${booking.status}`, 'INVALID_BOOKING_STATUS');
        }
        const txId = dto.transactionId ?? `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await database_1.prisma.$transaction(async (tx) => {
            await tx.pooja_bookings.update({
                where: { booking_id: bookingId },
                data: {
                    status: 'CONFIRMED',
                    updated_at: new Date()
                }
            });
            await tx.pooja_booking_audit.create({
                data: {
                    booking_id: bookingId,
                    from_status: 'PENDING_PAYMENT',
                    to_status: 'CONFIRMED',
                    actor_id: userId,
                    actor_role: 'CUSTOMER',
                    reason: `Payment confirmed via ${dto.paymentMethod ?? 'UPI'} (Ref: ${txId})`,
                    metadata: { transactionId: txId, paymentMethod: dto.paymentMethod ?? 'UPI' }
                }
            });
        });
        return {
            bookingId,
            bookingNumber: booking.booking_number,
            status: 'CONFIRMED',
            transactionId: txId,
            message: 'Payment received successfully. Your pooja is confirmed!'
        };
    }
    async cancelBooking(userId, bookingId, dto) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId },
            include: {
                poojas: true,
                pooja_slots: true
            }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        if (booking.user_id !== userId) {
            throw new app_error_1.ForbiddenError('Unauthorized access to booking', 'FORBIDDEN');
        }
        if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED' || booking.status === 'REFUNDED') {
            throw new app_error_1.BadRequestError(`Cannot cancel booking in status ${booking.status}`, 'CANNOT_CANCEL');
        }
        // Determine cutoff hours
        const cutoffHours = booking.poojas.cancellation_cutoff_hours ?? 24;
        let slotDateTime;
        if (booking.pooja_slots) {
            slotDateTime = new Date(`${booking.pooja_slots.slot_date.toISOString().split('T')[0]}T${booking.pooja_slots.start_time}`);
        }
        else if (booking.scheduled_date) {
            const timePart = booking.scheduled_time?.slice(0, 5) || '10:00';
            slotDateTime = new Date(`${booking.scheduled_date.toISOString().split('T')[0]}T${timePart}`);
        }
        else {
            slotDateTime = new Date(Date.now() + 48 * 3600 * 1000);
        }
        const hoursUntilSlot = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
        const priceObj = booking.price_snapshot;
        const totalPrice = Number(priceObj?.totalPrice ?? 0);
        let cancellationFee = 0;
        let refundAmount = totalPrice;
        // If within cutoff, apply partial cancellation penalty
        if (hoursUntilSlot < cutoffHours) {
            cancellationFee = totalPrice * 0.25; // 25% late fee
            refundAmount = totalPrice - cancellationFee;
        }
        await database_1.prisma.$transaction(async (tx) => {
            if (booking.slot_id) {
                // Reopen capacity on the slot
                const currentSlot = await tx.pooja_slots.findUnique({
                    where: { slot_id: booking.slot_id }
                });
                if (currentSlot) {
                    const newBookedCount = Math.max(0, (currentSlot.booked_count ?? 1) - 1);
                    await tx.pooja_slots.update({
                        where: { slot_id: booking.slot_id },
                        data: {
                            booked_count: newBookedCount,
                            status: 'AVAILABLE'
                        }
                    });
                }
            }
            await tx.pooja_bookings.update({
                where: { booking_id: bookingId },
                data: {
                    status: 'CANCELLED',
                    cancellation_reason: dto.reason,
                    cancellation_fee: cancellationFee,
                    refund_amount: refundAmount,
                    refund_status: refundAmount > 0 ? 'PENDING' : 'NONE',
                    updated_at: new Date()
                }
            });
            await tx.pooja_booking_audit.create({
                data: {
                    booking_id: bookingId,
                    from_status: booking.status,
                    to_status: 'CANCELLED',
                    actor_id: userId,
                    actor_role: 'CUSTOMER',
                    reason: dto.reason,
                    metadata: { cancellationFee, refundAmount, hoursUntilSlot }
                }
            });
        });
        return {
            bookingId,
            status: 'CANCELLED',
            cancellationFee,
            refundAmount,
            refundStatus: refundAmount > 0 ? 'PENDING' : 'NONE',
            message: 'Booking cancelled successfully'
        };
    }
    async rescheduleBooking(userId, bookingId, dto) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId },
            include: {
                poojas: true,
                pooja_slots: true
            }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        if (booking.user_id !== userId) {
            throw new app_error_1.ForbiddenError('Unauthorized access to booking', 'FORBIDDEN');
        }
        if (booking.status !== 'CONFIRMED') {
            throw new app_error_1.BadRequestError(`Cannot reschedule booking in status ${booking.status}`, 'CANNOT_RESCHEDULE');
        }
        // Check reschedule cutoff
        const cutoffHours = booking.poojas.reschedule_cutoff_hours ?? 12;
        let currentSlotDateTime;
        if (booking.pooja_slots) {
            currentSlotDateTime = new Date(`${booking.pooja_slots.slot_date.toISOString().split('T')[0]}T${booking.pooja_slots.start_time}`);
        }
        else if (booking.scheduled_date) {
            const timePart = booking.scheduled_time?.slice(0, 5) || '10:00';
            currentSlotDateTime = new Date(`${booking.scheduled_date.toISOString().split('T')[0]}T${timePart}`);
        }
        else {
            currentSlotDateTime = new Date(Date.now() + 48 * 3600 * 1000);
        }
        const hoursUntilSlot = (currentSlotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilSlot < cutoffHours) {
            throw new app_error_1.BadRequestError(`Rescheduling is not allowed within ${cutoffHours} hours of the scheduled pooja`, 'RESCHEDULE_WINDOW_EXPIRED');
        }
        if (booking.is_scheduled && dto.newSlotId) {
            // Validate new slot
            const newSlot = await database_1.prisma.pooja_slots.findFirst({
                where: {
                    slot_id: dto.newSlotId,
                    pooja_id: booking.pooja_id,
                    is_active: true
                }
            });
            if (!newSlot) {
                throw new app_error_1.NotFoundError('New slot not found or inactive', 'SLOT_NOT_FOUND');
            }
            const maxCap = newSlot.max_capacity ?? 5;
            const booked = newSlot.booked_count ?? 0;
            if (booked >= maxCap || newSlot.status === 'FULL') {
                throw new app_error_1.BadRequestError('Target slot is already fully booked', 'TARGET_SLOT_FULL');
            }
            await database_1.prisma.$transaction(async (tx) => {
                // 1. Release capacity on old slot
                if (booking.slot_id) {
                    const oldSlot = await tx.pooja_slots.findUnique({
                        where: { slot_id: booking.slot_id }
                    });
                    if (oldSlot) {
                        await tx.pooja_slots.update({
                            where: { slot_id: booking.slot_id },
                            data: {
                                booked_count: Math.max(0, (oldSlot.booked_count ?? 1) - 1),
                                status: 'AVAILABLE'
                            }
                        });
                    }
                }
                // 2. Reserve capacity on new slot
                const newBookedCount = booked + 1;
                await tx.pooja_slots.update({
                    where: { slot_id: dto.newSlotId },
                    data: {
                        booked_count: newBookedCount,
                        status: newBookedCount >= maxCap ? 'FULL' : 'AVAILABLE'
                    }
                });
                // 3. Update booking
                await tx.pooja_bookings.update({
                    where: { booking_id: bookingId },
                    data: {
                        slot_id: dto.newSlotId,
                        scheduled_date: newSlot.slot_date,
                        scheduled_time: `${newSlot.start_time} - ${newSlot.end_time}`,
                        updated_at: new Date()
                    }
                });
                // 4. Audit
                await tx.pooja_booking_audit.create({
                    data: {
                        booking_id: bookingId,
                        from_status: booking.status,
                        to_status: 'CONFIRMED',
                        actor_id: userId,
                        actor_role: 'CUSTOMER',
                        reason: `Rescheduled to ${newSlot.slot_date.toISOString().split('T')[0]} ${newSlot.start_time}. Reason: ${dto.reason ?? 'Devotee request'}`
                    }
                });
            });
        }
        else {
            // Personal pooja rescheduling
            const preferredDate = dto.preferredDate ? new Date(dto.preferredDate) : booking.scheduled_date;
            const preferredTime = dto.preferredTime || booking.scheduled_time;
            await database_1.prisma.$transaction(async (tx) => {
                await tx.pooja_bookings.update({
                    where: { booking_id: bookingId },
                    data: {
                        scheduled_date: preferredDate,
                        scheduled_time: preferredTime,
                        updated_at: new Date()
                    }
                });
                await tx.pooja_booking_audit.create({
                    data: {
                        booking_id: bookingId,
                        from_status: booking.status,
                        to_status: 'CONFIRMED',
                        actor_id: userId,
                        actor_role: 'CUSTOMER',
                        reason: `Personal pooja rescheduled to ${dto.preferredDate || ''} ${dto.preferredTime || ''}. Reason: ${dto.reason ?? 'Devotee request'}`
                    }
                });
            });
        }
        return this.getBookingDetails(userId, bookingId);
    }
    async getReceipt(userId, bookingId) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId },
            include: {
                poojas: true,
                pooja_slots: true,
                users: {
                    select: {
                        full_name: true,
                        mobile_no: true,
                        email: true
                    }
                }
            }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        if (booking.user_id !== userId) {
            throw new app_error_1.ForbiddenError('Unauthorized access to booking receipt', 'FORBIDDEN');
        }
        const price = booking.price_snapshot;
        const scheduledDateStr = booking.scheduled_date
            ? booking.scheduled_date.toISOString().split('T')[0]
            : (booking.pooja_slots ? booking.pooja_slots.slot_date.toISOString().split('T')[0] : null);
        const scheduledTimeStr = booking.scheduled_time
            ? booking.scheduled_time
            : (booking.pooja_slots ? `${booking.pooja_slots.start_time.slice(0, 5)} - ${booking.pooja_slots.end_time.slice(0, 5)}` : null);
        return {
            receiptNumber: `REC-${booking.booking_number}`,
            bookingNumber: booking.booking_number,
            confirmationMessage: 'Har Har Mahadev! Your Sankalp has been confirmed successfully.',
            issueDate: booking.created_at,
            status: booking.status,
            isScheduled: booking.is_scheduled ?? true,
            poojaLink: booking.pooja_link || (booking.live_stream_url || `https://live.dharmadarshan.org/session/${booking.booking_number}`),
            viewBookingAction: {
                label: 'View Booking',
                url: `/api/v1/pooja-bookings/${booking.booking_id}`
            },
            customer: {
                name: booking.users.full_name,
                mobile: booking.users.mobile_no,
                email: booking.users.email
            },
            pooja: {
                title: booking.poojas.title,
                deliveryMode: booking.delivery_mode,
                templeName: booking.poojas.temple_name,
                templeLocation: booking.poojas.temple_location
            },
            slot: {
                date: scheduledDateStr,
                time: scheduledTimeStr
            },
            devotees: booking.devotees,
            sankalp: booking.sankalp_details,
            itemizedCharges: {
                basePrice: price?.basePrice ?? 0,
                addons: price?.addons ?? [],
                addonsTotal: price?.addonsTotal ?? 0,
                totalAmount: price?.totalPrice ?? 0,
                currency: price?.currency ?? 'INR'
            }
        };
    }
    async getLiveSession(userId, bookingId) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId },
            include: {
                poojas: true,
                pooja_slots: true,
                priests: true
            }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        if (booking.user_id !== userId) {
            throw new app_error_1.ForbiddenError('Unauthorized', 'FORBIDDEN');
        }
        if (booking.delivery_mode !== 'ONLINE') {
            throw new app_error_1.BadRequestError('This pooja booking is not configured for an online live session', 'NOT_ONLINE_POOJA');
        }
        return {
            bookingId: booking.booking_id,
            bookingNumber: booking.booking_number,
            status: booking.status,
            scheduledTime: booking.pooja_slots
                ? {
                    date: booking.pooja_slots.slot_date.toISOString().split('T')[0],
                    startTime: booking.pooja_slots.start_time,
                    endTime: booking.pooja_slots.end_time,
                    timezone: booking.pooja_slots.timezone
                }
                : {
                    date: booking.scheduled_date ? booking.scheduled_date.toISOString().split('T')[0] : null,
                    startTime: booking.scheduled_time || '10:00 AM',
                    endTime: null,
                    timezone: 'Asia/Kolkata'
                },
            priest: booking.priests
                ? {
                    name: booking.priests.name,
                    qualification: booking.priests.qualification
                }
                : null,
            liveStreamUrl: booking.live_stream_url,
            liveStreamNotes: booking.live_stream_notes ?? 'Join 5 minutes before scheduled start time with fresh puja samagri.',
            instructions: booking.poojas.instructions,
            samagriInfo: booking.poojas.samagri_info
        };
    }
    async submitFeedback(userId, bookingId, dto) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        if (booking.user_id !== userId) {
            throw new app_error_1.ForbiddenError('Unauthorized', 'FORBIDDEN');
        }
        if (booking.status !== 'COMPLETED') {
            throw new app_error_1.BadRequestError('Feedback can only be submitted for completed poojas', 'POOJA_NOT_COMPLETED');
        }
        const updated = await database_1.prisma.pooja_bookings.update({
            where: { booking_id: bookingId },
            data: {
                feedback_rating: dto.rating,
                feedback_comment: dto.comment,
                updated_at: new Date()
            }
        });
        return {
            bookingId: updated.booking_id,
            rating: updated.feedback_rating,
            comment: updated.feedback_comment,
            message: 'Devotee feedback submitted successfully'
        };
    }
    // =========================================================================
    // 4. PRIESTS
    // =========================================================================
    async listPriests() {
        const priests = await database_1.prisma.priests.findMany({
            orderBy: { rating: 'desc' }
        });
        return priests.map(p => ({
            priestId: p.priest_id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            qualification: p.qualification,
            experienceYears: p.experience_years,
            rating: Number(p.rating),
            templeAffiliation: p.temple_affiliation,
            isActive: p.is_active
        }));
    }
    async getPriestDetails(priestId) {
        const priest = await database_1.prisma.priests.findUnique({
            where: { priest_id: priestId }
        });
        if (!priest) {
            throw new app_error_1.NotFoundError('Priest not found', 'PRIEST_NOT_FOUND');
        }
        return {
            priestId: priest.priest_id,
            name: priest.name,
            email: priest.email,
            phone: priest.phone,
            qualification: priest.qualification,
            experienceYears: priest.experience_years,
            rating: Number(priest.rating),
            templeAffiliation: priest.temple_affiliation,
            isActive: priest.is_active
        };
    }
    // =========================================================================
    // 5. ADMIN POOJA & BOOKING MANAGEMENT
    // =========================================================================
    async adminListPoojas(query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 10));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.categoryId)
            where.category_id = query.categoryId;
        if (query.search) {
            where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { slug: { contains: query.search, mode: 'insensitive' } }
            ];
        }
        const [total, list] = await Promise.all([
            database_1.prisma.poojas.count({ where }),
            database_1.prisma.poojas.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    pooja_categories: true,
                    pooja_packages: true,
                    pooja_addons: true
                }
            })
        ]);
        return {
            poojas: list,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }
    async adminCreatePooja(dto) {
        const existing = await database_1.prisma.poojas.findUnique({
            where: { slug: dto.slug }
        });
        if (existing) {
            throw new app_error_1.BadRequestError('Pooja slug already in use', 'SLUG_EXISTS');
        }
        const created = await database_1.prisma.poojas.create({
            data: {
                category_id: dto.categoryId,
                title: dto.title,
                slug: dto.slug,
                short_description: dto.shortDescription,
                description: dto.description,
                significance: dto.significance,
                benefits: dto.benefits ?? [],
                ritual_steps: dto.ritualSteps ?? [],
                samagri_info: dto.samagriInfo,
                instructions: dto.instructions,
                supported_languages: dto.supportedLanguages ?? ['Hindi', 'Sanskrit', 'English'],
                delivery_modes: dto.deliveryModes ?? ['ONLINE', 'TEMPLE'],
                temple_name: dto.templeName,
                temple_location: dto.templeLocation,
                image_url: dto.imageUrl,
                banner_url: dto.bannerUrl,
                duration_minutes: dto.durationMinutes ?? 60,
                lead_time_hours: dto.leadTimeHours ?? 24,
                cancellation_policy: dto.cancellationPolicy,
                cancellation_cutoff_hours: dto.cancellationCutoffHours ?? 24,
                reschedule_cutoff_hours: dto.rescheduleCutoffHours ?? 12,
                status: dto.status ?? 'DRAFT',
                is_featured: dto.isFeatured ?? false,
                pooja_process: dto.poojaProcess ?? undefined,
                total_participants: dto.totalParticipants ?? 1250
            }
        });
        return created;
    }
    async adminUpdatePooja(poojaId, dto) {
        const existing = await database_1.prisma.poojas.findUnique({
            where: { pooja_id: poojaId }
        });
        if (!existing) {
            throw new app_error_1.NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
        }
        const updated = await database_1.prisma.poojas.update({
            where: { pooja_id: poojaId },
            data: {
                category_id: dto.categoryId ?? existing.category_id,
                title: dto.title ?? existing.title,
                slug: dto.slug ?? existing.slug,
                short_description: dto.shortDescription ?? existing.short_description,
                description: dto.description ?? existing.description,
                significance: dto.significance ?? existing.significance,
                benefits: dto.benefits ?? existing.benefits,
                ritual_steps: dto.ritualSteps ?? existing.ritual_steps,
                samagri_info: dto.samagriInfo ?? existing.samagri_info,
                instructions: dto.instructions ?? existing.instructions,
                supported_languages: dto.supportedLanguages ?? existing.supported_languages,
                delivery_modes: dto.deliveryModes ?? existing.delivery_modes,
                temple_name: dto.templeName ?? existing.temple_name,
                temple_location: dto.templeLocation ?? existing.temple_location,
                image_url: dto.imageUrl ?? existing.image_url,
                banner_url: dto.bannerUrl ?? existing.banner_url,
                duration_minutes: dto.durationMinutes ?? existing.duration_minutes,
                lead_time_hours: dto.leadTimeHours ?? existing.lead_time_hours,
                cancellation_policy: dto.cancellationPolicy ?? existing.cancellation_policy,
                cancellation_cutoff_hours: dto.cancellationCutoffHours ?? existing.cancellation_cutoff_hours,
                reschedule_cutoff_hours: dto.rescheduleCutoffHours ?? existing.reschedule_cutoff_hours,
                status: dto.status ?? existing.status,
                is_featured: dto.isFeatured ?? existing.is_featured,
                pooja_process: dto.poojaProcess ?? existing.pooja_process,
                total_participants: dto.totalParticipants ?? existing.total_participants,
                updated_at: new Date()
            }
        });
        return updated;
    }
    async adminSetPoojaStatus(poojaId, status) {
        const existing = await database_1.prisma.poojas.findUnique({
            where: { pooja_id: poojaId }
        });
        if (!existing) {
            throw new app_error_1.NotFoundError('Pooja not found', 'POOJA_NOT_FOUND');
        }
        const updated = await database_1.prisma.poojas.update({
            where: { pooja_id: poojaId },
            data: { status, updated_at: new Date() }
        });
        return updated;
    }
    async adminCreatePackage(poojaId, dto) {
        return database_1.prisma.pooja_packages.create({
            data: {
                pooja_id: poojaId,
                package_code: dto.packageCode ?? 'INDIVIDUAL',
                title: dto.title,
                description: dto.description,
                price: dto.price,
                discount_price: dto.discountPrice,
                currency: dto.currency ?? 'INR',
                duration_minutes: dto.durationMinutes ?? 60,
                max_devotees: dto.maxDevotees ?? 4,
                samagri_included: dto.samagriIncluded ?? true,
                priest_level: dto.priestLevel ?? 'SENIOR_ACHARYA',
                delivery_mode: dto.deliveryMode ?? 'ONLINE'
            }
        });
    }
    async adminUpdatePackage(packageId, dto) {
        const pkg = await database_1.prisma.pooja_packages.findUnique({
            where: { package_id: packageId }
        });
        if (!pkg) {
            throw new app_error_1.NotFoundError('Package not found', 'PACKAGE_NOT_FOUND');
        }
        return database_1.prisma.pooja_packages.update({
            where: { package_id: packageId },
            data: {
                package_code: dto.packageCode ?? pkg.package_code,
                title: dto.title ?? pkg.title,
                description: dto.description ?? pkg.description,
                price: dto.price !== undefined ? dto.price : pkg.price,
                discount_price: dto.discountPrice !== undefined ? dto.discountPrice : pkg.discount_price,
                duration_minutes: dto.durationMinutes ?? pkg.duration_minutes,
                max_devotees: dto.maxDevotees ?? pkg.max_devotees,
                samagri_included: dto.samagriIncluded !== undefined ? dto.samagriIncluded : pkg.samagri_included,
                priest_level: dto.priestLevel ?? pkg.priest_level,
                delivery_mode: dto.deliveryMode ?? pkg.delivery_mode,
                is_active: dto.isActive !== undefined ? dto.isActive : pkg.is_active
            }
        });
    }
    async adminDeletePackage(packageId) {
        await database_1.prisma.pooja_packages.delete({
            where: { package_id: packageId }
        });
        return { message: 'Package deleted successfully' };
    }
    async adminCreateAddon(poojaId, dto) {
        return database_1.prisma.pooja_addons.create({
            data: {
                pooja_id: poojaId,
                title: dto.title,
                description: dto.description,
                price: dto.price,
                max_quantity: dto.maxQuantity ?? 10
            }
        });
    }
    async adminUpdateAddon(addonId, dto) {
        const addon = await database_1.prisma.pooja_addons.findUnique({
            where: { addon_id: addonId }
        });
        if (!addon) {
            throw new app_error_1.NotFoundError('Addon not found', 'ADDON_NOT_FOUND');
        }
        return database_1.prisma.pooja_addons.update({
            where: { addon_id: addonId },
            data: {
                title: dto.title ?? addon.title,
                description: dto.description ?? addon.description,
                price: dto.price !== undefined ? dto.price : addon.price,
                max_quantity: dto.maxQuantity ?? addon.max_quantity,
                is_active: dto.isActive !== undefined ? dto.isActive : addon.is_active
            }
        });
    }
    async adminDeleteAddon(addonId) {
        await database_1.prisma.pooja_addons.delete({
            where: { addon_id: addonId }
        });
        return { message: 'Add-on deleted successfully' };
    }
    async adminBulkCreateSlots(poojaId, dto) {
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        const createdSlots = [];
        const current = new Date(start);
        while (current <= end) {
            const dateCopy = new Date(current);
            try {
                const slot = await database_1.prisma.pooja_slots.upsert({
                    where: {
                        pooja_id_slot_date_start_time_end_time: {
                            pooja_id: poojaId,
                            slot_date: dateCopy,
                            start_time: dto.startTime,
                            end_time: dto.endTime
                        }
                    },
                    update: {
                        max_capacity: dto.maxCapacity ?? 5,
                        is_active: true
                    },
                    create: {
                        pooja_id: poojaId,
                        slot_date: dateCopy,
                        start_time: dto.startTime,
                        end_time: dto.endTime,
                        max_capacity: dto.maxCapacity ?? 5,
                        timezone: dto.timezone ?? 'Asia/Kolkata',
                        status: 'AVAILABLE'
                    }
                });
                createdSlots.push(slot);
            }
            catch {
                // Skip duplicate or constraint errors in bulk creation
            }
            current.setDate(current.getDate() + 1);
        }
        return {
            poojaId,
            createdCount: createdSlots.length,
            message: `Created / updated ${createdSlots.length} slots`
        };
    }
    async adminListBookings(query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 10));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.status)
            where.status = query.status;
        if (query.poojaId)
            where.pooja_id = query.poojaId;
        if (query.priestId)
            where.priest_id = query.priestId;
        const [total, bookings] = await Promise.all([
            database_1.prisma.pooja_bookings.count({ where }),
            database_1.prisma.pooja_bookings.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    poojas: { select: { title: true, temple_name: true } },
                    users: { select: { full_name: true, mobile_no: true, email: true } },
                    pooja_slots: true,
                    priests: { select: { name: true, phone: true } }
                }
            })
        ]);
        return {
            bookings: bookings.map(b => ({
                bookingId: b.booking_id,
                bookingNumber: b.booking_number,
                customerName: b.users.full_name,
                customerMobile: b.users.mobile_no,
                poojaTitle: b.poojas.title,
                deliveryMode: b.delivery_mode,
                status: b.status,
                slotDate: b.pooja_slots
                    ? b.pooja_slots.slot_date.toISOString().split('T')[0]
                    : (b.scheduled_date ? b.scheduled_date.toISOString().split('T')[0] : null),
                startTime: b.pooja_slots ? b.pooja_slots.start_time : b.scheduled_time,
                priestName: b.priests?.name,
                priceSnapshot: b.price_snapshot,
                createdAt: b.created_at
            })),
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        };
    }
    async adminAssignPriest(bookingId, priestId, adminUserId) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        const priest = await database_1.prisma.priests.findUnique({
            where: { priest_id: priestId }
        });
        if (!priest) {
            throw new app_error_1.NotFoundError('Priest not found', 'PRIEST_NOT_FOUND');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.pooja_bookings.update({
                where: { booking_id: bookingId },
                data: {
                    priest_id: priestId,
                    updated_at: new Date()
                }
            });
            await tx.pooja_booking_audit.create({
                data: {
                    booking_id: bookingId,
                    from_status: booking.status,
                    to_status: booking.status,
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason: `Priest ${priest.name} assigned by administrator`
                }
            });
        });
        return {
            bookingId,
            priestId,
            priestName: priest.name,
            message: 'Priest assigned successfully'
        };
    }
    async adminUpdateBookingStatus(bookingId, status, adminUserId, reason) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.pooja_bookings.update({
                where: { booking_id: bookingId },
                data: {
                    status,
                    updated_at: new Date()
                }
            });
            await tx.pooja_booking_audit.create({
                data: {
                    booking_id: bookingId,
                    from_status: booking.status,
                    to_status: status,
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason: reason ?? `Status updated to ${status} by admin`
                }
            });
        });
        return {
            bookingId,
            status,
            message: `Booking status updated to ${status}`
        };
    }
    async adminSetLiveSession(bookingId, liveStreamUrl, notes, adminUserId) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        const updated = await database_1.prisma.pooja_bookings.update({
            where: { booking_id: bookingId },
            data: {
                live_stream_url: liveStreamUrl,
                live_stream_notes: notes,
                updated_at: new Date()
            }
        });
        return updated;
    }
    async adminProcessRefund(bookingId, refundAmount, adminUserId, reason) {
        const booking = await database_1.prisma.pooja_bookings.findUnique({
            where: { booking_id: bookingId }
        });
        if (!booking) {
            throw new app_error_1.NotFoundError('Booking not found', 'BOOKING_NOT_FOUND');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.pooja_bookings.update({
                where: { booking_id: bookingId },
                data: {
                    refund_amount: refundAmount,
                    refund_status: 'REFUNDED',
                    status: 'REFUNDED',
                    updated_at: new Date()
                }
            });
            await tx.pooja_booking_audit.create({
                data: {
                    booking_id: bookingId,
                    from_status: booking.status,
                    to_status: 'REFUNDED',
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason: reason ?? `Refund of INR ${refundAmount} processed by admin`
                }
            });
        });
        return {
            bookingId,
            refundAmount,
            refundStatus: 'REFUNDED',
            message: 'Refund recorded and processed'
        };
    }
    async adminGetBookingAudit(bookingId) {
        return database_1.prisma.pooja_booking_audit.findMany({
            where: { booking_id: bookingId },
            orderBy: { created_at: 'desc' },
            include: {
                users: {
                    select: {
                        user_id: true,
                        full_name: true,
                        mobile_no: true
                    }
                }
            }
        });
    }
}
exports.PoojaService = PoojaService;
exports.poojaService = new PoojaService();
