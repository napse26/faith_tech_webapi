"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const validate_1 = require("../../common/middleware/validate");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const auth_schemas_1 = require("./auth.schemas");
const rate_limiter_1 = require("../../common/middleware/rate-limiter");
const router = (0, express_1.Router)();
// 7.1 Send OTP (Universal login/registration OTP trigger)
router.post('/send-otp', rate_limiter_1.otpInitiateLimiter, (0, validate_1.validate)({ body: auth_schemas_1.initiateAuthSchema }), auth_controller_1.authController.sendOtp);
router.post('/otp/send', rate_limiter_1.otpInitiateLimiter, (0, validate_1.validate)({ body: auth_schemas_1.initiateAuthSchema }), auth_controller_1.authController.sendOtp);
// 7.2 Verify OTP (Atomic verification, customer creation if new, token issuance)
router.post('/verify-otp', rate_limiter_1.otpVerifyLimiter, (0, validate_1.validate)({ body: auth_schemas_1.verifyAuthOtpSchema }), auth_controller_1.authController.verifyOtp);
router.post('/otp/verify', rate_limiter_1.otpVerifyLimiter, (0, validate_1.validate)({ body: auth_schemas_1.verifyAuthOtpSchema }), auth_controller_1.authController.verifyOtp);
// 7.3 Resend OTP
router.post('/resend-otp', rate_limiter_1.otpInitiateLimiter, (0, validate_1.validate)({ body: auth_schemas_1.resendAuthOtpSchema }), auth_controller_1.authController.resendOtp);
router.post('/otp/resend', rate_limiter_1.otpInitiateLimiter, (0, validate_1.validate)({ body: auth_schemas_1.resendAuthOtpSchema }), auth_controller_1.authController.resendOtp);
// 7.4 Refresh Token (Opaque token rotation with reuse detection)
router.post('/refresh-token', (0, validate_1.validate)({ body: auth_schemas_1.refreshTokenSchema }), auth_controller_1.authController.refreshToken);
router.post('/token/refresh', (0, validate_1.validate)({ body: auth_schemas_1.refreshTokenSchema }), auth_controller_1.authController.refreshToken);
// 7.5 Logout current device session
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.authController.logout);
// 7.6 Logout all devices
router.post('/logout-all', auth_middleware_1.authenticate, auth_controller_1.authController.logoutAll);
// 7.7 Current User Profile
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.authController.getMe);
// 7.8 Active Sessions
router.get('/sessions', auth_middleware_1.authenticate, auth_controller_1.authController.getSessions);
// 7.9 Revoke Selected Session
router.delete('/sessions/:sessionId', auth_middleware_1.authenticate, auth_controller_1.authController.revokeSession);
// 7.10 Mobile Number Change
router.post('/change-mobile/send-otp', auth_middleware_1.authenticate, rate_limiter_1.otpInitiateLimiter, (0, validate_1.validate)({ body: auth_schemas_1.changeMobileSendOtpSchema }), auth_controller_1.authController.changeMobileSendOtp);
router.post('/change-mobile/verify-otp', auth_middleware_1.authenticate, rate_limiter_1.otpVerifyLimiter, (0, validate_1.validate)({ body: auth_schemas_1.changeMobileVerifyOtpSchema }), auth_controller_1.authController.changeMobileVerifyOtp);
exports.authRoutes = router;
