"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerController = exports.CustomerController = void 0;
const customer_service_1 = require("./customer.service");
const api_response_1 = require("../../common/types/api-response");
class CustomerController {
    // =========================================================================
    // 3. CORE CUSTOMER PROFILE
    // =========================================================================
    async getProfile(req, res, next) {
        try {
            const profile = await customer_service_1.customerService.getProfile(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(profile, 'Customer profile retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const updated = await customer_service_1.customerService.updateProfile(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(updated, 'Customer profile updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getStatus(req, res, next) {
        try {
            const status = await customer_service_1.customerService.getStatus(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(status, 'Profile status retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async uploadProfilePhoto(req, res, next) {
        try {
            const photoUrl = req.body.profilePhotoUrl || req.body.photoUrl || 'https://storage.supabase.co/profiles/avatar.jpg';
            const result = await customer_service_1.customerService.updateProfilePhoto(req.user.userId, photoUrl);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Profile photo updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async removeProfilePhoto(req, res, next) {
        try {
            await customer_service_1.customerService.removeProfilePhoto(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Profile photo removed successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 4. BIRTH PROFILES
    // =========================================================================
    async listBirthProfiles(req, res, next) {
        try {
            const list = await customer_service_1.customerService.listBirthProfiles(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(list, 'Birth profiles retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async createBirthProfile(req, res, next) {
        try {
            const created = await customer_service_1.customerService.createBirthProfile(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(created, 'Birth profile created successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getBirthProfile(req, res, next) {
        try {
            const profileId = BigInt(String(req.params.profileId));
            const profile = await customer_service_1.customerService.getBirthProfile(req.user.userId, profileId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(profile, 'Birth profile retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateBirthProfile(req, res, next) {
        try {
            const profileId = BigInt(String(req.params.profileId));
            const updated = await customer_service_1.customerService.updateBirthProfile(req.user.userId, profileId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(updated, 'Birth profile updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async deleteBirthProfile(req, res, next) {
        try {
            const profileId = BigInt(String(req.params.profileId));
            await customer_service_1.customerService.deleteBirthProfile(req.user.userId, profileId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Birth profile deleted successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async setDefaultBirthProfile(req, res, next) {
        try {
            const profileId = BigInt(String(req.params.profileId));
            const updated = await customer_service_1.customerService.setDefaultBirthProfile(req.user.userId, profileId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(updated, 'Default birth profile updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 5. CONTACT VERIFICATION / CHANGE
    // =========================================================================
    async initiateMobileChange(req, res, next) {
        try {
            const { newMobileNumber } = req.body;
            const ip = req.ip || req.socket.remoteAddress;
            const result = await customer_service_1.customerService.initiateMobileChange(req.user.userId, newMobileNumber, ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Verification code sent to new mobile number', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async verifyMobileChange(req, res, next) {
        try {
            const { verificationId, challengeId, otp } = req.body;
            const targetId = verificationId || challengeId;
            const ip = req.ip || req.socket.remoteAddress;
            const result = await customer_service_1.customerService.verifyMobileChange(req.user.userId, targetId, otp, ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Mobile number updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async initiateEmailVerification(req, res, next) {
        try {
            const { email } = req.body;
            const result = await customer_service_1.customerService.initiateEmailVerification(req.user.userId, email);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Verification code sent to email', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async verifyEmailVerification(req, res, next) {
        try {
            const { verificationId, challengeId, verificationCode, otp } = req.body;
            const targetId = verificationId || challengeId;
            const code = verificationCode || otp;
            const result = await customer_service_1.customerService.verifyEmailVerification(req.user.userId, targetId, code);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Email verified successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async removeEmail(req, res, next) {
        try {
            await customer_service_1.customerService.removeEmail(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Email removed successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 6. PREFERENCES
    // =========================================================================
    async getPreferences(req, res, next) {
        try {
            const preferences = await customer_service_1.customerService.getPreferences(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(preferences, 'Preferences retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updatePreferences(req, res, next) {
        try {
            const updated = await customer_service_1.customerService.updatePreferences(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(updated, 'Preferences updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getNotificationPreferences(req, res, next) {
        try {
            const preferences = await customer_service_1.customerService.getNotificationPreferences(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(preferences, 'Notification preferences retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateNotificationPreferences(req, res, next) {
        try {
            const updated = await customer_service_1.customerService.updateNotificationPreferences(req.user.userId, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(updated, 'Notification preferences updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 7. SESSIONS AND DEVICES
    // =========================================================================
    async getSessions(req, res, next) {
        try {
            const sessions = await customer_service_1.customerService.getSessions(req.user.userId, req.user.sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(sessions, 'Sessions retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async revokeSession(req, res, next) {
        try {
            const sessionId = String(req.params.sessionId);
            await customer_service_1.customerService.revokeSession(req.user.userId, sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Session revoked successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async revokeOtherSessions(req, res, next) {
        try {
            const count = await customer_service_1.customerService.revokeOtherSessions(req.user.userId, req.user.sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)({ revokedCount: count }, 'Other sessions revoked successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getDevices(req, res, next) {
        try {
            const devices = await customer_service_1.customerService.getDevices(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(devices, 'Devices retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async removeDevice(req, res, next) {
        try {
            const deviceId = String(req.params.deviceId);
            await customer_service_1.customerService.removeDevice(req.user.userId, deviceId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Device removed successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // 8. SECURITY & LOGOUT
    // =========================================================================
    async getSecurityOverview(req, res, next) {
        try {
            const overview = await customer_service_1.customerService.getSecurityOverview(req.user.userId, req.user.sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(overview, 'Security overview retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            await customer_service_1.customerService.revokeSession(req.user.userId, req.user.sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Logged out successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async logoutAll(req, res, next) {
        try {
            await customer_service_1.customerService.revokeOtherSessions(req.user.userId, '');
            await customer_service_1.customerService.revokeSession(req.user.userId, req.user.sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Logged out from all devices successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // PRIVACY & CONSENT (Phase 3)
    // =========================================================================
    async getConsents(req, res, next) {
        try {
            const consents = await customer_service_1.customerService.getConsents(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(consents, 'Consents retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateConsents(req, res, next) {
        try {
            const consents = await customer_service_1.customerService.updateConsents(req.user.userId, req.body, {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });
            res.status(200).json((0, api_response_1.createSuccessResponse)(consents, 'Consents updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async acceptConsent(req, res, next) {
        try {
            const consent = await customer_service_1.customerService.acceptConsent(req.user.userId, req.body, {
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });
            res.status(200).json((0, api_response_1.createSuccessResponse)(consent, 'Consent accepted successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getPrivacyOverview(req, res, next) {
        try {
            const overview = await customer_service_1.customerService.getPrivacyOverview(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(overview, 'Privacy overview retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // ACCOUNT LIFECYCLE (Phase 3)
    // =========================================================================
    async deactivateAccount(req, res, next) {
        try {
            const result = await customer_service_1.customerService.deactivateAccount(req.user.userId, req.body, req.ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Account deactivated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async reactivateAccount(req, res, next) {
        try {
            const result = await customer_service_1.customerService.reactivateAccount(req.user.userId, req.body, req.ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Account reactivated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async requestAccountDeletion(req, res, next) {
        try {
            const result = await customer_service_1.customerService.requestAccountDeletion(req.user.userId, req.body, req.ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Account deletion requested successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getDeletionRequest(req, res, next) {
        try {
            const result = await customer_service_1.customerService.getDeletionRequest(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Account deletion request retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async cancelAccountDeletion(req, res, next) {
        try {
            const result = await customer_service_1.customerService.cancelAccountDeletion(req.user.userId, req.ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Account deletion request cancelled successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // SUPPORT REQUESTS (Phase 4)
    // =========================================================================
    async listSupportTickets(req, res, next) {
        try {
            const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
            const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10))) : 20;
            const result = await customer_service_1.customerService.listSupportTickets(req.user.userId, page, limit);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Support tickets retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async createSupportTicket(req, res, next) {
        try {
            const ticket = await customer_service_1.customerService.createSupportTicket(req.user.userId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(ticket, 'Support ticket created successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getSupportTicket(req, res, next) {
        try {
            const ticketId = String(req.params.ticketId);
            const ticket = await customer_service_1.customerService.getSupportTicket(req.user.userId, ticketId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(ticket, 'Support ticket retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async addTicketMessage(req, res, next) {
        try {
            const ticketId = String(req.params.ticketId);
            const message = await customer_service_1.customerService.addTicketMessage(req.user.userId, ticketId, req.body);
            res.status(201).json((0, api_response_1.createSuccessResponse)(message, 'Message added to support ticket successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // FAVORITES & RECENT ASTROLOGERS (Phase 4)
    // =========================================================================
    async listFavorites(req, res, next) {
        try {
            const favorites = await customer_service_1.customerService.listFavorites(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(favorites, 'Favorite astrologers retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async addFavorite(req, res, next) {
        try {
            const astrologerId = BigInt(String(req.params.astrologerId));
            const result = await customer_service_1.customerService.addFavorite(req.user.userId, astrologerId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Astrologer added to favorites successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async removeFavorite(req, res, next) {
        try {
            const astrologerId = BigInt(String(req.params.astrologerId));
            await customer_service_1.customerService.removeFavorite(req.user.userId, astrologerId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Astrologer removed from favorites successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async listRecentAstrologers(req, res, next) {
        try {
            const limit = req.query.limit ? Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10))) : 10;
            const recent = await customer_service_1.customerService.listRecentAstrologers(req.user.userId, limit);
            res.status(200).json((0, api_response_1.createSuccessResponse)(recent, 'Recent astrologers retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    // =========================================================================
    // CUSTOMER ACTIVITY (Phase 4)
    // =========================================================================
    async getCustomerActivity(req, res, next) {
        try {
            const page = req.query.page ? Math.max(1, parseInt(String(req.query.page), 10)) : 1;
            const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10))) : 20;
            const activity = await customer_service_1.customerService.getCustomerActivity(req.user.userId, page, limit);
            res.status(200).json((0, api_response_1.createSuccessResponse)(activity, 'Customer activity retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CustomerController = CustomerController;
exports.customerController = new CustomerController();
