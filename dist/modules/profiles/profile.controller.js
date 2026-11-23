"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileController = exports.ProfileController = void 0;
const profile_service_1 = require("./profile.service");
const api_response_1 = require("../../common/types/api-response");
class ProfileController {
    async getProfile(req, res, next) {
        try {
            const profile = await profile_service_1.profileService.getProfile(req.user.id);
            res.status(200).json((0, api_response_1.createSuccessResponse)(profile, 'Profile retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const profile = await profile_service_1.profileService.updateProfile(req.user.id, req.body);
            res.status(200).json((0, api_response_1.createSuccessResponse)(profile, 'Profile updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async uploadPhoto(req, res, next) {
        try {
            const { fileType, fileSize } = req.body;
            const result = await profile_service_1.profileService.initiateProfilePhotoUpload(req.user.id, fileType, fileSize);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Profile photo upload URL generated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async initiateEmailVerification(req, res, next) {
        try {
            const { email } = req.body;
            const result = await profile_service_1.profileService.initiateEmailVerification(req.user.id, email);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Email verification code sent', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async confirmEmailVerification(req, res, next) {
        try {
            const { challengeId, otp } = req.body;
            const result = await profile_service_1.profileService.confirmEmailVerification(req.user.id, challengeId, otp);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Email verified successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProfileController = ProfileController;
exports.profileController = new ProfileController();
