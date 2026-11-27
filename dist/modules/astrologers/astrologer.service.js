"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.astrologerService = exports.AstrologerService = void 0;
const database_1 = require("../../config/database");
const app_error_1 = require("../../common/errors/app-error");
class AstrologerService {
    // Helper: Find astrologer by userId
    async getAstrologerByUserId(userId) {
        const astrologer = await database_1.prisma.astrologers.findUnique({
            where: { user_id: userId }
        });
        if (!astrologer) {
            throw new app_error_1.NotFoundError('Astrologer profile not found for this account', 'ASTROLOGER_NOT_FOUND');
        }
        return astrologer;
    }
    // 1. APPLICATION & ONBOARDING
    async apply(userId, dto) {
        const existing = await database_1.prisma.astrologers.findUnique({
            where: { user_id: userId }
        });
        if (existing) {
            throw new app_error_1.BadRequestError('You have already applied or an astrologer profile already exists', 'ALREADY_APPLIED');
        }
        const astrologer = await database_1.prisma.$transaction(async (tx) => {
            const created = await tx.astrologers.create({
                data: {
                    user_id: userId,
                    display_name: dto.displayName,
                    legal_name: dto.legalName,
                    gender: dto.gender,
                    experience_years: dto.experienceYears ?? 0,
                    qualification: dto.qualification,
                    about_me: dto.aboutMe,
                    astrology_tradition: dto.astrologyTradition,
                    city: dto.city,
                    state: dto.state,
                    country: dto.country ?? 'India',
                    timezone: dto.timezone ?? 'Asia/Kolkata',
                    onboarding_status: 'DRAFT'
                }
            });
            // Seed empty KYC record
            await tx.astrologer_kyc.create({
                data: {
                    astrologer_id: created.astrologer_id,
                    verification_status: 'PENDING'
                }
            });
            // Add specializations if provided
            if (dto.specializationIds && dto.specializationIds.length > 0) {
                await tx.astrologer_specializations.createMany({
                    data: dto.specializationIds.map(specId => ({
                        astrologer_id: created.astrologer_id,
                        specialization_id: specId
                    })),
                    skipDuplicates: true
                });
            }
            // Add languages if provided
            if (dto.languageIds && dto.languageIds.length > 0) {
                await tx.astrologer_languages.createMany({
                    data: dto.languageIds.map(langId => ({
                        astrologer_id: created.astrologer_id,
                        language_id: langId
                    })),
                    skipDuplicates: true
                });
            }
            // Audit status history
            await tx.astrologer_status_history.create({
                data: {
                    astrologer_id: created.astrologer_id,
                    from_status: null,
                    to_status: 'DRAFT',
                    actor_id: userId,
                    actor_role: 'ASTROLOGER',
                    reason: 'Initial application draft created'
                }
            });
            return created;
        });
        return this.getApplication(userId);
    }
    async getApplication(userId) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { user_id: userId },
            include: {
                astrologer_specializations: {
                    include: { specializations: true }
                },
                astrologer_languages: {
                    include: { languages: true }
                },
                astrologer_kyc: true,
                astrologer_qualifications: true,
                astrologer_documents: true
            }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer application not found', 'APPLICATION_NOT_FOUND');
        }
        // Calculate completion score
        let score = 0;
        if (astro.display_name && astro.about_me)
            score += 20;
        if (astro.experience_years && astro.experience_years > 0)
            score += 10;
        if (astro.city && astro.state)
            score += 10;
        if (astro.astrologer_specializations.length > 0)
            score += 20;
        if (astro.astrologer_languages.length > 0)
            score += 10;
        if (astro.astrologer_documents.length > 0)
            score += 15;
        const kyc = astro.astrologer_kyc[0];
        if (kyc && (kyc.pan_number || kyc.aadhaar_number || kyc.account_number || kyc.upi_id))
            score += 15;
        return {
            astrologerId: astro.astrologer_id,
            userId: astro.user_id,
            displayName: astro.display_name,
            legalName: astro.legal_name,
            gender: astro.gender,
            experienceYears: astro.experience_years,
            qualification: astro.qualification,
            aboutMe: astro.about_me,
            astrologyTradition: astro.astrology_tradition,
            city: astro.city,
            state: astro.state,
            country: astro.country,
            timezone: astro.timezone,
            onboardingStatus: astro.onboarding_status,
            completionPercentage: Math.min(score, 100),
            submittedAt: astro.submitted_at,
            reviewedAt: astro.reviewed_at,
            rejectionReason: astro.rejection_reason,
            adminNotes: astro.admin_notes,
            specializations: astro.astrologer_specializations.map(s => s.specializations),
            languages: astro.astrologer_languages.map(l => l.languages),
            qualifications: astro.astrologer_qualifications,
            documents: astro.astrologer_documents,
            payoutInfoProvided: Boolean(kyc?.account_number || kyc?.upi_id)
        };
    }
    async updateDraft(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        if (astro.onboarding_status !== 'DRAFT' && astro.onboarding_status !== 'ACTION_REQUIRED') {
            throw new app_error_1.BadRequestError(`Cannot edit application while in status ${astro.onboarding_status}`, 'INVALID_STATUS_FOR_EDIT');
        }
        await database_1.prisma.astrologers.update({
            where: { astrologer_id: astro.astrologer_id },
            data: {
                display_name: dto.displayName ?? astro.display_name,
                legal_name: dto.legalName ?? astro.legal_name,
                gender: dto.gender ?? astro.gender,
                experience_years: dto.experienceYears ?? astro.experience_years,
                qualification: dto.qualification ?? astro.qualification,
                about_me: dto.aboutMe ?? astro.about_me,
                astrology_tradition: dto.astrologyTradition ?? astro.astrology_tradition,
                city: dto.city ?? astro.city,
                state: dto.state ?? astro.state,
                country: dto.country ?? astro.country,
                timezone: dto.timezone ?? astro.timezone,
                updated_on: new Date()
            }
        });
        return this.getApplication(userId);
    }
    async submitApplication(userId) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { user_id: userId },
            include: {
                astrologer_specializations: true,
                astrologer_documents: true
            }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Application not found', 'APPLICATION_NOT_FOUND');
        }
        if (astro.onboarding_status !== 'DRAFT' && astro.onboarding_status !== 'ACTION_REQUIRED') {
            throw new app_error_1.BadRequestError(`Cannot submit application in status ${astro.onboarding_status}`, 'INVALID_STATUS_FOR_SUBMIT');
        }
        // Validation of mandatory onboarding prerequisites
        if (!astro.display_name || !astro.about_me) {
            throw new app_error_1.BadRequestError('Display name and About Me bio are mandatory for submission', 'INCOMPLETE_PROFILE');
        }
        if (astro.astrologer_specializations.length === 0) {
            throw new app_error_1.BadRequestError('At least 1 specialization is required before submitting application', 'NO_SPECIALIZATION');
        }
        if (astro.astrologer_documents.length === 0) {
            throw new app_error_1.BadRequestError('At least 1 identity or qualification document must be uploaded', 'NO_DOCUMENTS');
        }
        const fromStatus = astro.onboarding_status;
        const toStatus = 'SUBMITTED';
        await database_1.prisma.$transaction(async (tx) => {
            await tx.astrologers.update({
                where: { astrologer_id: astro.astrologer_id },
                data: {
                    onboarding_status: toStatus,
                    submitted_at: new Date(),
                    updated_on: new Date()
                }
            });
            await tx.astrologer_status_history.create({
                data: {
                    astrologer_id: astro.astrologer_id,
                    from_status: fromStatus,
                    to_status: toStatus,
                    actor_id: userId,
                    actor_role: 'ASTROLOGER',
                    reason: 'Application submitted by astrologer for admin review'
                }
            });
        });
        return {
            astrologerId: astro.astrologer_id,
            status: toStatus,
            submittedAt: new Date(),
            message: 'Application submitted successfully. It is now queued for administrator review.'
        };
    }
    async resubmitApplication(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        if (astro.onboarding_status !== 'ACTION_REQUIRED') {
            throw new app_error_1.BadRequestError('Resubmission is only allowed when status is ACTION_REQUIRED', 'NOT_ACTION_REQUIRED');
        }
        return this.submitApplication(userId);
    }
    async getApplicationStatus(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        const history = await database_1.prisma.astrologer_status_history.findMany({
            where: { astrologer_id: astro.astrologer_id },
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
        return {
            astrologerId: astro.astrologer_id,
            onboardingStatus: astro.onboarding_status,
            isVerified: astro.is_verified,
            isOnline: astro.is_online,
            isBusy: astro.is_busy,
            submittedAt: astro.submitted_at,
            reviewedAt: astro.reviewed_at,
            rejectionReason: astro.rejection_reason,
            adminNotes: astro.admin_notes,
            statusHistory: history.map(h => ({
                id: h.id,
                fromStatus: h.from_status,
                toStatus: h.to_status,
                actorRole: h.actor_role,
                actorName: h.users?.full_name || 'System',
                reason: h.reason,
                timestamp: h.created_at
            }))
        };
    }
    // 2. PROFILE & PHOTOS
    async getProfile(userId) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { user_id: userId },
            include: {
                astrologer_specializations: { include: { specializations: true } },
                astrologer_languages: { include: { languages: true } },
                astrologer_services: { include: { service_master: true } },
                astrologer_qualifications: true
            }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer profile not found', 'PROFILE_NOT_FOUND');
        }
        return astro;
    }
    async updateProfile(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        const updated = await database_1.prisma.astrologers.update({
            where: { astrologer_id: astro.astrologer_id },
            data: {
                display_name: dto.displayName ?? astro.display_name,
                legal_name: dto.legalName ?? astro.legal_name,
                gender: dto.gender ?? astro.gender,
                experience_years: dto.experienceYears ?? astro.experience_years,
                qualification: dto.qualification ?? astro.qualification,
                about_me: dto.aboutMe ?? astro.about_me,
                astrology_tradition: dto.astrologyTradition ?? astro.astrology_tradition,
                city: dto.city ?? astro.city,
                state: dto.state ?? astro.state,
                country: dto.country ?? astro.country,
                timezone: dto.timezone ?? astro.timezone,
                updated_on: new Date()
            }
        });
        return updated;
    }
    async updatePhoto(userId, photoType, photoUrl) {
        const astro = await this.getAstrologerByUserId(userId);
        const field = photoType === 'PROFILE' ? 'profile_image' : 'cover_image';
        const updated = await database_1.prisma.astrologers.update({
            where: { astrologer_id: astro.astrologer_id },
            data: {
                [field]: photoUrl,
                updated_on: new Date()
            }
        });
        return {
            astrologerId: updated.astrologer_id,
            photoType,
            photoUrl
        };
    }
    async deletePhoto(userId, photoType) {
        const astro = await this.getAstrologerByUserId(userId);
        const field = photoType === 'PROFILE' ? 'profile_image' : 'cover_image';
        await database_1.prisma.astrologers.update({
            where: { astrologer_id: astro.astrologer_id },
            data: {
                [field]: null,
                updated_on: new Date()
            }
        });
        return {
            astrologerId: astro.astrologer_id,
            message: `${photoType} photo deleted successfully`
        };
    }
    // Gallery Management (Astrologer Self)
    async getMyGallery(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        const images = await database_1.prisma.astrologer_gallery.findMany({
            where: { astrologer_id: astro.astrologer_id },
            orderBy: [
                { display_order: 'asc' },
                { created_at: 'desc' }
            ]
        });
        return {
            astrologer_id: Number(astro.astrologer_id),
            total_images: images.length,
            images: images.map(img => ({
                id: Number(img.id),
                image_url: img.image_url,
                caption: img.caption ?? null,
                title: img.title ?? null,
                display_order: img.display_order ?? 0,
                is_active: img.is_active ?? true,
                created_at: img.created_at
            }))
        };
    }
    async uploadGalleryImage(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        const imageUrl = dto.imageUrl || dto.image_url;
        if (!imageUrl) {
            throw new app_error_1.BadRequestError('Image URL is required', 'IMAGE_URL_REQUIRED');
        }
        const created = await database_1.prisma.astrologer_gallery.create({
            data: {
                astrologer_id: astro.astrologer_id,
                image_url: imageUrl,
                caption: dto.caption || null,
                title: dto.title || null,
                display_order: dto.displayOrder ?? dto.display_order ?? 0,
                is_active: true
            }
        });
        return {
            id: Number(created.id),
            astrologer_id: Number(created.astrologer_id),
            image_url: created.image_url,
            caption: created.caption ?? null,
            title: created.title ?? null,
            display_order: created.display_order ?? 0,
            is_active: created.is_active ?? true,
            created_at: created.created_at
        };
    }
    async deleteGalleryImage(userId, imageId) {
        const astro = await this.getAstrologerByUserId(userId);
        const image = await database_1.prisma.astrologer_gallery.findFirst({
            where: {
                id: imageId,
                astrologer_id: astro.astrologer_id
            }
        });
        if (!image) {
            throw new app_error_1.NotFoundError('Gallery image not found', 'IMAGE_NOT_FOUND');
        }
        await database_1.prisma.astrologer_gallery.delete({
            where: { id: imageId }
        });
        return {
            id: Number(imageId),
            message: 'Gallery image deleted successfully'
        };
    }
    // 3. EXPERTISE & SERVICES & PRICING
    async getExpertise(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        const specs = await database_1.prisma.astrologer_specializations.findMany({
            where: { astrologer_id: astro.astrologer_id },
            include: { specializations: true }
        });
        const langs = await database_1.prisma.astrologer_languages.findMany({
            where: { astrologer_id: astro.astrologer_id },
            include: { languages: true }
        });
        return {
            astrologerId: astro.astrologer_id,
            specializations: specs.map(s => s.specializations),
            languages: langs.map(l => l.languages)
        };
    }
    async updateExpertise(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        await database_1.prisma.$transaction(async (tx) => {
            // Replace specializations
            await tx.astrologer_specializations.deleteMany({
                where: { astrologer_id: astro.astrologer_id }
            });
            if (dto.specializationIds.length > 0) {
                await tx.astrologer_specializations.createMany({
                    data: dto.specializationIds.map(specId => ({
                        astrologer_id: astro.astrologer_id,
                        specialization_id: specId
                    }))
                });
            }
            // Replace languages
            await tx.astrologer_languages.deleteMany({
                where: { astrologer_id: astro.astrologer_id }
            });
            if (dto.languageIds.length > 0) {
                await tx.astrologer_languages.createMany({
                    data: dto.languageIds.map(langId => ({
                        astrologer_id: astro.astrologer_id,
                        language_id: langId
                    }))
                });
            }
        });
        return this.getExpertise(userId);
    }
    async getServices(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        const services = await database_1.prisma.astrologer_services.findMany({
            where: { astrologer_id: astro.astrologer_id },
            include: { service_master: true }
        });
        return services;
    }
    async createService(userId, serviceMasterId, status = 1) {
        const astro = await this.getAstrologerByUserId(userId);
        const existing = await database_1.prisma.astrologer_services.findFirst({
            where: {
                astrologer_id: astro.astrologer_id,
                service_master_id: serviceMasterId
            }
        });
        if (existing) {
            throw new app_error_1.BadRequestError('Service already added to astrologer profile', 'SERVICE_ALREADY_EXISTS');
        }
        const created = await database_1.prisma.astrologer_services.create({
            data: {
                astrologer_id: astro.astrologer_id,
                service_master_id: serviceMasterId,
                status,
                created_by: userId
            },
            include: { service_master: true }
        });
        return created;
    }
    async updateService(userId, serviceId, status) {
        const astro = await this.getAstrologerByUserId(userId);
        const service = await database_1.prisma.astrologer_services.findFirst({
            where: {
                astrologer_service_id: serviceId,
                astrologer_id: astro.astrologer_id
            }
        });
        if (!service) {
            throw new app_error_1.NotFoundError('Astrologer service not found', 'SERVICE_NOT_FOUND');
        }
        const updated = await database_1.prisma.astrologer_services.update({
            where: { astrologer_service_id: serviceId },
            data: { status }
        });
        return updated;
    }
    async deleteService(userId, serviceId) {
        const astro = await this.getAstrologerByUserId(userId);
        const service = await database_1.prisma.astrologer_services.findFirst({
            where: {
                astrologer_service_id: serviceId,
                astrologer_id: astro.astrologer_id
            }
        });
        if (!service) {
            throw new app_error_1.NotFoundError('Astrologer service not found', 'SERVICE_NOT_FOUND');
        }
        await database_1.prisma.astrologer_services.delete({
            where: { astrologer_service_id: serviceId }
        });
        return { message: 'Service removed successfully' };
    }
    async getPricing(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        return {
            astrologerId: astro.astrologer_id,
            chatRate: astro.chat_rate,
            callRate: astro.call_rate,
            videoRate: astro.video_rate,
            commissionPercentage: astro.commission_percentage
        };
    }
    async updatePricing(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        const updated = await database_1.prisma.astrologers.update({
            where: { astrologer_id: astro.astrologer_id },
            data: {
                chat_rate: dto.chatRate !== undefined ? dto.chatRate : astro.chat_rate,
                call_rate: dto.callRate !== undefined ? dto.callRate : astro.call_rate,
                video_rate: dto.videoRate !== undefined ? dto.videoRate : astro.video_rate,
                updated_on: new Date()
            }
        });
        return {
            astrologerId: updated.astrologer_id,
            chatRate: updated.chat_rate,
            callRate: updated.call_rate,
            videoRate: updated.video_rate,
            commissionPercentage: updated.commission_percentage
        };
    }
    // 4. QUALIFICATIONS
    async getQualifications(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        const quals = await database_1.prisma.astrologer_qualifications.findMany({
            where: { astrologer_id: astro.astrologer_id },
            orderBy: { created_at: 'desc' }
        });
        return quals.map(q => ({
            qualificationId: q.qualification_id,
            astrologerId: q.astrologer_id,
            qualificationName: q.qualification_name,
            institution: q.institution,
            yearOfCompletion: q.year_of_completion,
            description: q.description,
            certificateUrl: q.certificate_url,
            verificationStatus: q.verification_status,
            createdAt: q.created_at
        }));
    }
    async addQualification(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        const qual = await database_1.prisma.astrologer_qualifications.create({
            data: {
                astrologer_id: astro.astrologer_id,
                qualification_name: dto.qualificationName,
                institution: dto.institution,
                year_of_completion: dto.yearOfCompletion,
                description: dto.description,
                certificate_url: dto.certificateUrl,
                verification_status: 'PENDING'
            }
        });
        return {
            qualificationId: qual.qualification_id,
            astrologerId: qual.astrologer_id,
            qualificationName: qual.qualification_name,
            institution: qual.institution,
            yearOfCompletion: qual.year_of_completion,
            description: qual.description,
            certificateUrl: qual.certificate_url,
            verificationStatus: qual.verification_status,
            createdAt: qual.created_at
        };
    }
    async updateQualification(userId, qualId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        const existing = await database_1.prisma.astrologer_qualifications.findFirst({
            where: {
                qualification_id: qualId,
                astrologer_id: astro.astrologer_id
            }
        });
        if (!existing) {
            throw new app_error_1.NotFoundError('Qualification not found', 'QUALIFICATION_NOT_FOUND');
        }
        const updated = await database_1.prisma.astrologer_qualifications.update({
            where: { qualification_id: qualId },
            data: {
                qualification_name: dto.qualificationName ?? existing.qualification_name,
                institution: dto.institution ?? existing.institution,
                year_of_completion: dto.yearOfCompletion ?? existing.year_of_completion,
                description: dto.description ?? existing.description,
                certificate_url: dto.certificateUrl ?? existing.certificate_url,
                updated_at: new Date()
            }
        });
        return updated;
    }
    async deleteQualification(userId, qualId) {
        const astro = await this.getAstrologerByUserId(userId);
        const existing = await database_1.prisma.astrologer_qualifications.findFirst({
            where: {
                qualification_id: qualId,
                astrologer_id: astro.astrologer_id
            }
        });
        if (!existing) {
            throw new app_error_1.NotFoundError('Qualification not found', 'QUALIFICATION_NOT_FOUND');
        }
        await database_1.prisma.astrologer_qualifications.delete({
            where: { qualification_id: qualId }
        });
        return { message: 'Qualification deleted successfully' };
    }
    // 5. DOCUMENTS
    async getDocuments(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        const docs = await database_1.prisma.astrologer_documents.findMany({
            where: { astrologer_id: astro.astrologer_id },
            orderBy: { created_at: 'desc' }
        });
        return docs.map(d => ({
            documentId: d.document_id,
            astrologerId: d.astrologer_id,
            documentType: d.document_type,
            documentName: d.document_name,
            fileUrl: d.file_url,
            fileSize: d.file_size,
            mimeType: d.mime_type,
            verificationStatus: d.verification_status,
            rejectionReason: d.rejection_reason,
            createdAt: d.created_at
        }));
    }
    async uploadDocument(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        const doc = await database_1.prisma.astrologer_documents.create({
            data: {
                astrologer_id: astro.astrologer_id,
                document_type: dto.documentType,
                document_name: dto.documentName,
                file_url: dto.fileUrl,
                file_size: dto.fileSize,
                mime_type: dto.mimeType,
                verification_status: 'PENDING_REVIEW'
            }
        });
        return {
            documentId: doc.document_id,
            astrologerId: doc.astrologer_id,
            documentType: doc.document_type,
            documentName: doc.document_name,
            fileUrl: doc.file_url,
            fileSize: doc.file_size,
            mimeType: doc.mime_type,
            verificationStatus: doc.verification_status,
            rejectionReason: doc.rejection_reason,
            createdAt: doc.created_at
        };
    }
    async getDocument(userId, docId) {
        const astro = await this.getAstrologerByUserId(userId);
        const doc = await database_1.prisma.astrologer_documents.findFirst({
            where: {
                document_id: docId,
                astrologer_id: astro.astrologer_id
            }
        });
        if (!doc) {
            throw new app_error_1.NotFoundError('Document not found', 'DOCUMENT_NOT_FOUND');
        }
        return {
            documentId: doc.document_id,
            astrologerId: doc.astrologer_id,
            documentType: doc.document_type,
            documentName: doc.document_name,
            fileUrl: doc.file_url,
            fileSize: doc.file_size,
            mimeType: doc.mime_type,
            verificationStatus: doc.verification_status,
            rejectionReason: doc.rejection_reason,
            createdAt: doc.created_at
        };
    }
    async deleteDocument(userId, docId) {
        const astro = await this.getAstrologerByUserId(userId);
        const doc = await database_1.prisma.astrologer_documents.findFirst({
            where: {
                document_id: docId,
                astrologer_id: astro.astrologer_id
            }
        });
        if (!doc) {
            throw new app_error_1.NotFoundError('Document not found', 'DOCUMENT_NOT_FOUND');
        }
        if (doc.verification_status === 'VERIFIED') {
            throw new app_error_1.ForbiddenError('Verified documents cannot be deleted directly. Contact admin.', 'DOCUMENT_VERIFIED');
        }
        await database_1.prisma.astrologer_documents.delete({
            where: { document_id: docId }
        });
        return { message: 'Document deleted successfully' };
    }
    // 6. BANK & PAYOUT DETAILS
    async getPayoutDetails(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        const kyc = await database_1.prisma.astrologer_kyc.findFirst({
            where: { astrologer_id: astro.astrologer_id }
        });
        if (!kyc) {
            return {
                astrologerId: astro.astrologer_id,
                payoutMethod: 'BANK_TRANSFER',
                verificationStatus: 'PENDING',
                accountHolderName: null,
                accountNumberMasked: null,
                bankName: null,
                ifscCode: null,
                panNumberMasked: null,
                aadhaarNumberMasked: null,
                upiId: null
            };
        }
        // Mask sensitive numbers for security / VAPT compliance
        const maskString = (val, visibleEnd = 4) => {
            if (!val)
                return null;
            if (val.length <= visibleEnd)
                return '****';
            return '*'.repeat(val.length - visibleEnd) + val.slice(-visibleEnd);
        };
        return {
            astrologerId: astro.astrologer_id,
            payoutMethod: kyc.payout_method || 'BANK_TRANSFER',
            verificationStatus: kyc.verification_status,
            accountHolderName: kyc.account_holder_name,
            accountNumberMasked: maskString(kyc.account_number, 4),
            bankName: kyc.bank_name,
            ifscCode: kyc.ifsc_code,
            panNumberMasked: maskString(kyc.pan_number, 4),
            aadhaarNumberMasked: maskString(kyc.aadhaar_number, 4),
            upiId: kyc.upi_id
        };
    }
    async updatePayoutDetails(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        let kyc = await database_1.prisma.astrologer_kyc.findFirst({
            where: { astrologer_id: astro.astrologer_id }
        });
        if (!kyc) {
            kyc = await database_1.prisma.astrologer_kyc.create({
                data: {
                    astrologer_id: astro.astrologer_id,
                    verification_status: 'PENDING'
                }
            });
        }
        const updated = await database_1.prisma.astrologer_kyc.update({
            where: { astrologer_kyc_id: kyc.astrologer_kyc_id },
            data: {
                payout_method: dto.payoutMethod ?? kyc.payout_method,
                pan_number: dto.panNumber ?? kyc.pan_number,
                aadhaar_number: dto.aadhaarNumber ?? kyc.aadhaar_number,
                account_holder_name: dto.accountHolderName ?? kyc.account_holder_name,
                account_number: dto.accountNumber ?? kyc.account_number,
                bank_name: dto.bankName ?? kyc.bank_name,
                ifsc_code: dto.ifscCode ?? kyc.ifsc_code,
                upi_id: dto.upiId ?? kyc.upi_id,
                verification_status: 'PENDING' // Resets verification status on detail change
            }
        });
        return this.getPayoutDetails(userId);
    }
    // 7. AVAILABILITY & SCHEDULE
    async getAvailability(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        const slots = await database_1.prisma.astrologer_availability.findMany({
            where: { astrologer_id: astro.astrologer_id },
            orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }]
        });
        const exceptions = await database_1.prisma.astrologer_availability_exceptions.findMany({
            where: { astrologer_id: astro.astrologer_id },
            orderBy: { exception_date: 'asc' }
        });
        return {
            astrologerId: astro.astrologer_id,
            timezone: astro.timezone,
            weeklySchedule: slots,
            exceptions
        };
    }
    async setWeeklyAvailability(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        await database_1.prisma.$transaction(async (tx) => {
            // Clear previous weekly schedule
            await tx.astrologer_availability.deleteMany({
                where: { astrologer_id: astro.astrologer_id }
            });
            // Insert new schedule
            if (dto.slots.length > 0) {
                await tx.astrologer_availability.createMany({
                    data: dto.slots.map(s => ({
                        astrologer_id: astro.astrologer_id,
                        day_of_week: s.dayOfWeek,
                        start_time: s.startTime,
                        end_time: s.endTime,
                        slot_duration_minutes: s.slotDurationMinutes ?? 15,
                        timezone: dto.timezone ?? astro.timezone ?? 'Asia/Kolkata',
                        is_active: s.isActive ?? true
                    }))
                });
            }
            if (dto.timezone && dto.timezone !== astro.timezone) {
                await tx.astrologers.update({
                    where: { astrologer_id: astro.astrologer_id },
                    data: { timezone: dto.timezone }
                });
            }
        });
        return this.getAvailability(userId);
    }
    async addDateException(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        const exceptionDate = new Date(dto.exceptionDate);
        // Delete existing exception for the same day if any
        await database_1.prisma.astrologer_availability_exceptions.deleteMany({
            where: {
                astrologer_id: astro.astrologer_id,
                exception_date: exceptionDate
            }
        });
        const created = await database_1.prisma.astrologer_availability_exceptions.create({
            data: {
                astrologer_id: astro.astrologer_id,
                exception_date: exceptionDate,
                is_available: dto.isAvailable,
                start_time: dto.startTime,
                end_time: dto.endTime,
                reason: dto.reason
            }
        });
        return created;
    }
    async deleteDateException(userId, exceptionId) {
        const astro = await this.getAstrologerByUserId(userId);
        const exc = await database_1.prisma.astrologer_availability_exceptions.findFirst({
            where: {
                exception_id: exceptionId,
                astrologer_id: astro.astrologer_id
            }
        });
        if (!exc) {
            throw new app_error_1.NotFoundError('Availability exception not found', 'EXCEPTION_NOT_FOUND');
        }
        await database_1.prisma.astrologer_availability_exceptions.delete({
            where: { exception_id: exceptionId }
        });
        return { message: 'Date exception deleted successfully' };
    }
    // 8. ONLINE STATUS & DASHBOARD
    async getOnlineStatus(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        return {
            astrologerId: astro.astrologer_id,
            onboardingStatus: astro.onboarding_status,
            isOnline: astro.is_online,
            isBusy: astro.is_busy
        };
    }
    async setOnlineStatus(userId, dto) {
        const astro = await this.getAstrologerByUserId(userId);
        if (astro.onboarding_status !== 'APPROVED') {
            throw new app_error_1.ForbiddenError('Only approved astrologers can toggle online/operational status', 'NOT_APPROVED_ASTROLOGER');
        }
        const updated = await database_1.prisma.astrologers.update({
            where: { astrologer_id: astro.astrologer_id },
            data: {
                is_online: dto.isOnline,
                is_busy: dto.isBusy !== undefined ? dto.isBusy : astro.is_busy,
                updated_on: new Date()
            }
        });
        return {
            astrologerId: updated.astrologer_id,
            isOnline: updated.is_online,
            isBusy: updated.is_busy
        };
    }
    async getDashboard(userId) {
        const astro = await this.getAstrologerByUserId(userId);
        // Get total upcoming appointments / bookings
        const upcomingAppointmentsCount = await database_1.prisma.appointments.count({
            where: {
                astrologer_id: astro.astrologer_id,
                appointment_date: { gte: new Date() },
                status: { in: ['CONFIRMED', 'PENDING'] }
            }
        });
        return {
            astrologerId: astro.astrologer_id,
            displayName: astro.display_name,
            onboardingStatus: astro.onboarding_status,
            isOnline: astro.is_online,
            isBusy: astro.is_busy,
            metrics: {
                avgRating: astro.avg_rating,
                totalReviews: astro.total_reviews,
                totalEarnings: astro.total_earnings,
                chatMinutes: astro.total_chat_minutes,
                callMinutes: astro.total_call_minutes,
                videoMinutes: astro.total_video_minutes,
                upcomingAppointmentsCount
            },
            rates: {
                chatRate: astro.chat_rate,
                callRate: astro.call_rate,
                videoRate: astro.video_rate
            }
        };
    }
    // 9. PUBLIC DISCOVERY (Customers)
    formatAstrologerCard(astro) {
        const isOnline = Boolean(astro.is_online);
        const isBusy = Boolean(astro.is_busy);
        let status = 'OFFLINE';
        if (isOnline) {
            status = isBusy ? 'BUSY' : 'ONLINE';
        }
        const isAvailable = isOnline && !isBusy;
        const specializations = (astro.astrologer_specializations || []).map((item) => {
            const s = item.specializations || item;
            return {
                specialization_id: Number(s.specialization_id),
                specialization_name: String(s.specialization_name || '')
            };
        });
        const languages = (astro.astrologer_languages || []).map((item) => {
            const l = item.languages || item;
            return {
                language_id: Number(l.language_id),
                language_name: String(l.language_name || '')
            };
        });
        let profileBadges = [];
        if (Array.isArray(astro.profile_badges)) {
            profileBadges = astro.profile_badges;
        }
        else if (typeof astro.profile_badges === 'string') {
            try {
                profileBadges = JSON.parse(astro.profile_badges);
            }
            catch {
                profileBadges = [];
            }
        }
        const chatPrice = astro.chat_rate !== null && astro.chat_rate !== undefined && Number(astro.chat_rate) > 0
            ? Number(astro.chat_rate)
            : 20;
        const callPrice = astro.call_rate !== null && astro.call_rate !== undefined && Number(astro.call_rate) > 0
            ? Number(astro.call_rate)
            : 25;
        const videoPrice = astro.video_rate !== null && astro.video_rate !== undefined && Number(astro.video_rate) > 0
            ? Number(astro.video_rate)
            : 40;
        const services = [
            {
                service_code: 'CHAT',
                service_name: 'Chat Consultation',
                original_price: null,
                current_price: chatPrice,
                discount_percentage: null,
                currency: 'INR',
                pricing_unit: 'PER_MINUTE',
                is_enabled: true,
                is_available: isAvailable,
                can_join_waitlist: false
            },
            {
                service_code: 'CALL',
                service_name: 'Call Consultation',
                original_price: null,
                current_price: callPrice,
                discount_percentage: null,
                currency: 'INR',
                pricing_unit: 'PER_MINUTE',
                is_enabled: true,
                is_available: isAvailable,
                can_join_waitlist: false
            },
            {
                service_code: 'VIDEO',
                service_name: 'Video Consultation',
                original_price: null,
                current_price: videoPrice,
                discount_percentage: null,
                currency: 'INR',
                pricing_unit: 'PER_MINUTE',
                is_enabled: true,
                is_available: isAvailable,
                can_join_waitlist: false
            }
        ];
        return {
            astrologer_id: Number(astro.astrologer_id),
            display_name: astro.display_name,
            gender: astro.gender ?? null,
            experience_years: astro.experience_years !== null && astro.experience_years !== undefined ? Number(astro.experience_years) : 0,
            qualification: astro.qualification ?? null,
            about_me: astro.about_me ?? null,
            profile_image: astro.profile_image ?? null,
            cover_image: astro.cover_image ?? null,
            avg_rating: astro.avg_rating !== null && astro.avg_rating !== undefined ? Number(Number(astro.avg_rating).toFixed(2)) : 0,
            total_reviews: astro.total_reviews !== null && astro.total_reviews !== undefined ? Number(astro.total_reviews) : 0,
            total_consultations: astro.total_consultations !== null && astro.total_consultations !== undefined ? Number(astro.total_consultations) : null,
            is_verified: astro.is_verified !== null && astro.is_verified !== undefined ? Boolean(astro.is_verified) : null,
            is_recommended: astro.is_recommended !== null && astro.is_recommended !== undefined ? Boolean(astro.is_recommended) : null,
            is_featured: astro.is_featured !== null && astro.is_featured !== undefined ? Boolean(astro.is_featured) : false,
            response_time_minutes: astro.response_time_minutes !== null && astro.response_time_minutes !== undefined ? Number(astro.response_time_minutes) : null,
            availability: {
                status,
                is_available: isAvailable,
                waiting_list_count: astro.waiting_list_count !== null && astro.waiting_list_count !== undefined ? Number(astro.waiting_list_count) : null,
                next_available_at: null
            },
            profile_badges: profileBadges,
            astrology_tradition: astro.astrology_tradition ?? null,
            city: astro.city ?? null,
            state: astro.state ?? null,
            specializations,
            languages,
            services
        };
    }
    async listPublicAstrologers(query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 10));
        const skip = (page - 1) * limit;
        const where = {
            onboarding_status: 'APPROVED'
        };
        if (query.isOnline !== undefined) {
            where.is_online = query.isOnline;
        }
        if (query.gender) {
            where.gender = query.gender;
        }
        if (query.isFeatured !== undefined) {
            where.is_featured = query.isFeatured;
        }
        if (query.isRecommended !== undefined) {
            where.is_recommended = query.isRecommended;
        }
        if (query.search) {
            where.OR = [
                { display_name: { contains: query.search, mode: 'insensitive' } },
                { astrology_tradition: { contains: query.search, mode: 'insensitive' } },
                { city: { contains: query.search, mode: 'insensitive' } }
            ];
        }
        if (query.specializationId) {
            where.astrologer_specializations = {
                some: { specialization_id: query.specializationId }
            };
        }
        if (query.languageId) {
            where.astrologer_languages = {
                some: { language_id: query.languageId }
            };
        }
        let orderBy = [{ is_featured: 'desc' }, { avg_rating: 'desc' }];
        if (query.sortBy === 'experience')
            orderBy = [{ is_featured: 'desc' }, { experience_years: 'desc' }];
        if (query.sortBy === 'price_asc')
            orderBy = [{ is_featured: 'desc' }, { chat_rate: 'asc' }];
        if (query.sortBy === 'price_desc')
            orderBy = [{ is_featured: 'desc' }, { chat_rate: 'desc' }];
        if (query.sortBy === 'rating')
            orderBy = [{ is_featured: 'desc' }, { avg_rating: 'desc' }];
        const [total, list] = await Promise.all([
            database_1.prisma.astrologers.count({ where }),
            database_1.prisma.astrologers.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                select: {
                    astrologer_id: true,
                    display_name: true,
                    gender: true,
                    experience_years: true,
                    qualification: true,
                    about_me: true,
                    profile_image: true,
                    cover_image: true,
                    chat_rate: true,
                    call_rate: true,
                    video_rate: true,
                    avg_rating: true,
                    total_reviews: true,
                    total_consultations: true,
                    is_verified: true,
                    is_recommended: true,
                    is_featured: true,
                    response_time_minutes: true,
                    waiting_list_count: true,
                    profile_badges: true,
                    is_online: true,
                    is_busy: true,
                    astrology_tradition: true,
                    city: true,
                    state: true,
                    astrologer_specializations: {
                        select: { specializations: true }
                    },
                    astrologer_languages: {
                        select: { languages: true }
                    }
                }
            })
        ]);
        return {
            astrologers: list.map(a => this.formatAstrologerCard(a)),
            pagination: {
                total,
                page,
                limit,
                total_pages: Math.ceil(total / limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async getPublicProfile(astrologerId) {
        const astro = await database_1.prisma.astrologers.findFirst({
            where: {
                astrologer_id: astrologerId,
                onboarding_status: 'APPROVED'
            },
            select: {
                astrologer_id: true,
                display_name: true,
                gender: true,
                experience_years: true,
                qualification: true,
                about_me: true,
                profile_image: true,
                cover_image: true,
                chat_rate: true,
                call_rate: true,
                video_rate: true,
                avg_rating: true,
                total_reviews: true,
                total_consultations: true,
                is_verified: true,
                is_recommended: true,
                is_featured: true,
                response_time_minutes: true,
                waiting_list_count: true,
                profile_badges: true,
                is_online: true,
                is_busy: true,
                astrology_tradition: true,
                city: true,
                state: true,
                astrologer_specializations: {
                    select: { specializations: true }
                },
                astrologer_languages: {
                    select: { languages: true }
                }
            }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found or not approved', 'ASTROLOGER_NOT_FOUND');
        }
        return this.formatAstrologerCard(astro);
    }
    async getPublicAvailability(astrologerId) {
        const astro = await database_1.prisma.astrologers.findFirst({
            where: {
                astrologer_id: astrologerId,
                onboarding_status: 'APPROVED'
            }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found or not approved', 'ASTROLOGER_NOT_FOUND');
        }
        const slots = await database_1.prisma.astrologer_availability.findMany({
            where: { astrologer_id: astrologerId, is_active: true },
            orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }]
        });
        const exceptions = await database_1.prisma.astrologer_availability_exceptions.findMany({
            where: {
                astrologer_id: astrologerId,
                exception_date: { gte: new Date() }
            },
            orderBy: { exception_date: 'asc' }
        });
        return {
            astrologerId,
            timezone: astro.timezone,
            weeklySlots: slots,
            upcomingExceptions: exceptions
        };
    }
    async getPublicGallery(astrologerId) {
        const astro = await database_1.prisma.astrologers.findFirst({
            where: {
                astrologer_id: astrologerId,
                onboarding_status: 'APPROVED'
            }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found or not approved', 'ASTROLOGER_NOT_FOUND');
        }
        const images = await database_1.prisma.astrologer_gallery.findMany({
            where: {
                astrologer_id: astrologerId,
                is_active: true
            },
            orderBy: [
                { display_order: 'asc' },
                { created_at: 'desc' }
            ]
        });
        return {
            astrologer_id: Number(astrologerId),
            total_images: images.length,
            images: images.map(img => ({
                id: Number(img.id),
                image_url: img.image_url,
                caption: img.caption ?? null,
                title: img.title ?? null,
                display_order: img.display_order ?? 0,
                created_at: img.created_at
            }))
        };
    }
    // 10. ADMIN LIFECYCLE MANAGEMENT
    async adminListApplications(query) {
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(50, Math.max(1, query.limit || 10));
        const skip = (page - 1) * limit;
        const where = {};
        if (query.onboardingStatus) {
            where.onboarding_status = query.onboardingStatus;
        }
        if (query.search) {
            where.OR = [
                { display_name: { contains: query.search, mode: 'insensitive' } },
                { legal_name: { contains: query.search, mode: 'insensitive' } },
                { city: { contains: query.search, mode: 'insensitive' } }
            ];
        }
        const [total, applications] = await Promise.all([
            database_1.prisma.astrologers.count({ where }),
            database_1.prisma.astrologers.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_on: 'desc' },
                include: {
                    users_astrologers_user_idTousers: {
                        select: {
                            user_id: true,
                            mobile_no: true,
                            email: true,
                            full_name: true
                        }
                    },
                    astrologer_specializations: { include: { specializations: true } }
                }
            })
        ]);
        return {
            applications: applications.map(a => ({
                astrologerId: a.astrologer_id,
                userId: a.user_id,
                displayName: a.display_name,
                legalName: a.legal_name,
                mobileNumber: a.users_astrologers_user_idTousers?.mobile_no,
                email: a.users_astrologers_user_idTousers?.email,
                experienceYears: a.experience_years,
                city: a.city,
                state: a.state,
                onboardingStatus: a.onboarding_status,
                isVerified: a.is_verified,
                isOnline: a.is_online,
                submittedAt: a.submitted_at,
                createdOn: a.created_on,
                specializations: a.astrologer_specializations.map((s) => s.specializations?.specialization_name)
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async adminGetApplicationDetails(astrologerId) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { astrologer_id: astrologerId },
            include: {
                users_astrologers_user_idTousers: {
                    select: {
                        user_id: true,
                        mobile_no: true,
                        email: true,
                        status: true,
                        created_on: true,
                        full_name: true
                    }
                },
                astrologer_specializations: { include: { specializations: true } },
                astrologer_languages: { include: { languages: true } },
                astrologer_kyc: true,
                astrologer_qualifications: true,
                astrologer_documents: true,
                astrologer_status_history: {
                    orderBy: { created_at: 'desc' },
                    include: {
                        users: {
                            select: { full_name: true, mobile_no: true }
                        }
                    }
                }
            }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer application not found', 'ASTROLOGER_NOT_FOUND');
        }
        return astro;
    }
    async adminStartReview(astrologerId, adminUserId, dto) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { astrologer_id: astrologerId }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
        }
        if (astro.onboarding_status !== 'SUBMITTED') {
            throw new app_error_1.BadRequestError(`Cannot start review for status ${astro.onboarding_status}`, 'INVALID_STATUS');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.astrologers.update({
                where: { astrologer_id: astrologerId },
                data: {
                    onboarding_status: 'UNDER_REVIEW',
                    reviewed_by: adminUserId,
                    admin_notes: dto.notes ?? astro.admin_notes,
                    updated_on: new Date()
                }
            });
            await tx.astrologer_status_history.create({
                data: {
                    astrologer_id: astrologerId,
                    from_status: astro.onboarding_status,
                    to_status: 'UNDER_REVIEW',
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason: dto.notes ?? 'Admin initiated application review'
                }
            });
        });
        return {
            astrologerId,
            status: 'UNDER_REVIEW',
            message: 'Application is now marked as UNDER_REVIEW'
        };
    }
    async adminRequestChanges(astrologerId, adminUserId, dto) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { astrologer_id: astrologerId }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
        }
        const reason = `Action required: ${dto.notes}. Required fields: ${dto.actionRequiredFields.join(', ')}`;
        await database_1.prisma.$transaction(async (tx) => {
            await tx.astrologers.update({
                where: { astrologer_id: astrologerId },
                data: {
                    onboarding_status: 'ACTION_REQUIRED',
                    admin_notes: reason,
                    updated_on: new Date()
                }
            });
            await tx.astrologer_status_history.create({
                data: {
                    astrologer_id: astrologerId,
                    from_status: astro.onboarding_status,
                    to_status: 'ACTION_REQUIRED',
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason
                }
            });
        });
        return {
            astrologerId,
            status: 'ACTION_REQUIRED',
            adminNotes: reason,
            message: 'Change request sent to astrologer'
        };
    }
    async adminApproveApplication(astrologerId, adminUserId, dto) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { astrologer_id: astrologerId }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.astrologers.update({
                where: { astrologer_id: astrologerId },
                data: {
                    onboarding_status: 'APPROVED',
                    is_verified: true,
                    verification_date: new Date(),
                    reviewed_by: adminUserId,
                    reviewed_at: new Date(),
                    admin_notes: dto.notes ?? astro.admin_notes,
                    commission_percentage: dto.commissionPercentage !== undefined ? dto.commissionPercentage : astro.commission_percentage,
                    updated_on: new Date()
                }
            });
            // Assign ASTROLOGER role (role_id: 2) to the user if not already present
            const existingRole = await tx.user_roles.findFirst({
                where: {
                    user_id: astro.user_id,
                    role_id: 2
                }
            });
            if (!existingRole) {
                await tx.user_roles.create({
                    data: {
                        user_id: astro.user_id,
                        role_id: 2
                    }
                });
            }
            await tx.astrologer_status_history.create({
                data: {
                    astrologer_id: astrologerId,
                    from_status: astro.onboarding_status,
                    to_status: 'APPROVED',
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason: dto.notes ?? 'Application approved by administrator'
                }
            });
        });
        return {
            astrologerId,
            status: 'APPROVED',
            isVerified: true,
            message: 'Astrologer application approved successfully'
        };
    }
    async adminRejectApplication(astrologerId, adminUserId, dto) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { astrologer_id: astrologerId }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.astrologers.update({
                where: { astrologer_id: astrologerId },
                data: {
                    onboarding_status: 'REJECTED',
                    is_verified: false,
                    is_online: false,
                    rejection_reason: dto.reason,
                    admin_notes: dto.adminNotes ?? astro.admin_notes,
                    reviewed_by: adminUserId,
                    reviewed_at: new Date(),
                    updated_on: new Date()
                }
            });
            await tx.astrologer_status_history.create({
                data: {
                    astrologer_id: astrologerId,
                    from_status: astro.onboarding_status,
                    to_status: 'REJECTED',
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason: dto.reason
                }
            });
        });
        return {
            astrologerId,
            status: 'REJECTED',
            rejectionReason: dto.reason,
            message: 'Application rejected'
        };
    }
    async adminSuspendAstrologer(astrologerId, adminUserId, dto) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { astrologer_id: astrologerId }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.astrologers.update({
                where: { astrologer_id: astrologerId },
                data: {
                    onboarding_status: 'SUSPENDED',
                    is_online: false,
                    admin_notes: dto.reason,
                    updated_on: new Date()
                }
            });
            await tx.astrologer_status_history.create({
                data: {
                    astrologer_id: astrologerId,
                    from_status: astro.onboarding_status,
                    to_status: 'SUSPENDED',
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason: dto.reason
                }
            });
        });
        return {
            astrologerId,
            status: 'SUSPENDED',
            message: 'Astrologer suspended'
        };
    }
    async adminReactivateAstrologer(astrologerId, adminUserId) {
        const astro = await database_1.prisma.astrologers.findUnique({
            where: { astrologer_id: astrologerId }
        });
        if (!astro) {
            throw new app_error_1.NotFoundError('Astrologer not found', 'ASTROLOGER_NOT_FOUND');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.astrologers.update({
                where: { astrologer_id: astrologerId },
                data: {
                    onboarding_status: 'APPROVED',
                    updated_on: new Date()
                }
            });
            await tx.astrologer_status_history.create({
                data: {
                    astrologer_id: astrologerId,
                    from_status: astro.onboarding_status,
                    to_status: 'APPROVED',
                    actor_id: adminUserId,
                    actor_role: 'ADMIN',
                    reason: 'Astrologer account reactivated by admin'
                }
            });
        });
        return {
            astrologerId,
            status: 'APPROVED',
            message: 'Astrologer reactivated'
        };
    }
    async adminVerifyDocument(astrologerId, docId, adminUserId, dto) {
        const doc = await database_1.prisma.astrologer_documents.findFirst({
            where: {
                document_id: docId,
                astrologer_id: astrologerId
            }
        });
        if (!doc) {
            throw new app_error_1.NotFoundError('Document not found', 'DOCUMENT_NOT_FOUND');
        }
        const updated = await database_1.prisma.astrologer_documents.update({
            where: { document_id: docId },
            data: {
                verification_status: dto.status,
                rejection_reason: dto.rejectionReason,
                verified_by: adminUserId,
                verified_at: new Date()
            }
        });
        return updated;
    }
    async adminGetAuditHistory(astrologerId) {
        const history = await database_1.prisma.astrologer_status_history.findMany({
            where: { astrologer_id: astrologerId },
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
        return history;
    }
}
exports.AstrologerService = AstrologerService;
exports.astrologerService = new AstrologerService();
