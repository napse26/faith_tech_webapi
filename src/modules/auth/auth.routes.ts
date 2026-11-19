import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../common/middleware/validate';
import { authenticate } from '../../common/middleware/auth.middleware';
import {
  initiateAuthSchema,
  verifyAuthOtpSchema,
  resendAuthOtpSchema,
  refreshTokenSchema,
  changeMobileSendOtpSchema,
  changeMobileVerifyOtpSchema
} from './auth.schemas';
import { otpInitiateLimiter, otpVerifyLimiter } from '../../common/middleware/rate-limiter';

const router = Router();

// 7.1 Send OTP (Universal login/registration OTP trigger)
router.post(
  '/send-otp',
  otpInitiateLimiter,
  validate({ body: initiateAuthSchema }),
  authController.sendOtp
);
router.post(
  '/otp/send',
  otpInitiateLimiter,
  validate({ body: initiateAuthSchema }),
  authController.sendOtp
);

// 7.2 Verify OTP (Atomic verification, customer creation if new, token issuance)
router.post(
  '/verify-otp',
  otpVerifyLimiter,
  validate({ body: verifyAuthOtpSchema }),
  authController.verifyOtp
);
router.post(
  '/otp/verify',
  otpVerifyLimiter,
  validate({ body: verifyAuthOtpSchema }),
  authController.verifyOtp
);

// 7.3 Resend OTP
router.post(
  '/resend-otp',
  otpInitiateLimiter,
  validate({ body: resendAuthOtpSchema }),
  authController.resendOtp
);
router.post(
  '/otp/resend',
  otpInitiateLimiter,
  validate({ body: resendAuthOtpSchema }),
  authController.resendOtp
);

// 7.4 Refresh Token (Opaque token rotation with reuse detection)
router.post(
  '/refresh-token',
  validate({ body: refreshTokenSchema }),
  authController.refreshToken
);
router.post(
  '/token/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refreshToken
);

// 7.5 Logout current device session
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// 7.6 Logout all devices
router.post(
  '/logout-all',
  authenticate,
  authController.logoutAll
);

// 7.7 Current User Profile
router.get(
  '/me',
  authenticate,
  authController.getMe
);

// 7.8 Active Sessions
router.get(
  '/sessions',
  authenticate,
  authController.getSessions
);

// 7.9 Revoke Selected Session
router.delete(
  '/sessions/:sessionId',
  authenticate,
  authController.revokeSession
);

// 7.10 Mobile Number Change
router.post(
  '/change-mobile/send-otp',
  authenticate,
  otpInitiateLimiter,
  validate({ body: changeMobileSendOtpSchema }),
  authController.changeMobileSendOtp
);

router.post(
  '/change-mobile/verify-otp',
  authenticate,
  otpVerifyLimiter,
  validate({ body: changeMobileVerifyOtpSchema }),
  authController.changeMobileVerifyOtp
);

export const authRoutes = router;
