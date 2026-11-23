"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const api_response_1 = require("../../common/types/api-response");
class AuthController {
    async sendOtp(req, res, next) {
        try {
            const { phoneNumber, mobileNumber, countryCode, purpose, channel } = req.body;
            const targetPhone = phoneNumber || mobileNumber;
            const ip = req.ip || req.socket.remoteAddress;
            const result = await auth_service_1.authService.sendOtp(targetPhone, countryCode || '+91', purpose || 'LOGIN', channel || 'SMS', ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'OTP sent successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async verifyOtp(req, res, next) {
        try {
            const { challengeId, otp, device, deviceId, deviceName, platform } = req.body;
            const deviceInfo = {
                deviceId: device?.deviceId || deviceId,
                deviceName: device?.deviceName || deviceName,
                platform: device?.platform || platform,
                appVersion: device?.appVersion,
                ipAddress: req.ip || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            };
            const result = await auth_service_1.authService.verifyOtp(challengeId, otp, deviceInfo);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Login successful', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async resendOtp(req, res, next) {
        try {
            const { challengeId } = req.body;
            const ip = req.ip || req.socket.remoteAddress;
            const result = await auth_service_1.authService.resendOtp(challengeId, ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'OTP resent successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const ip = req.ip || req.socket.remoteAddress;
            const ua = req.headers['user-agent'];
            const tokens = await auth_service_1.authService.refreshToken(refreshToken, ip, ua);
            res.status(200).json((0, api_response_1.createSuccessResponse)(tokens, 'Token refreshed successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            if (req.user) {
                await auth_service_1.authService.logout(req.user.sessionId, req.user.userId);
            }
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Logged out successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async logoutAll(req, res, next) {
        try {
            if (req.user) {
                await auth_service_1.authService.logoutAll(req.user.userId);
            }
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Logged out from all devices successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getMe(req, res, next) {
        try {
            const user = await auth_service_1.authService.getCurrentUser(req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(user, 'Current user profile fetched successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async getSessions(req, res, next) {
        try {
            const sessions = await auth_service_1.authService.getSessions(req.user.userId, req.user.sessionId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(sessions, 'Active sessions retrieved successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async revokeSession(req, res, next) {
        try {
            const sessionId = String(req.params.sessionId);
            await auth_service_1.authService.revokeSession(sessionId, req.user.userId);
            res.status(200).json((0, api_response_1.createSuccessResponse)(null, 'Session revoked successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async changeMobileSendOtp(req, res, next) {
        try {
            const { newPhoneNumber, phoneNumber, countryCode } = req.body;
            const targetPhone = newPhoneNumber || phoneNumber;
            const ip = req.ip || req.socket.remoteAddress;
            const result = await auth_service_1.authService.changeMobileSendOtp(req.user.userId, targetPhone, countryCode || '+91', ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'OTP sent to new mobile number', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
    async changeMobileVerifyOtp(req, res, next) {
        try {
            const { challengeId, otp } = req.body;
            const ip = req.ip || req.socket.remoteAddress;
            const result = await auth_service_1.authService.changeMobileVerifyOtp(req.user.userId, challengeId, otp, ip);
            res.status(200).json((0, api_response_1.createSuccessResponse)(result, 'Mobile number updated successfully', req.traceId));
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
