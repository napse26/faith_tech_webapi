import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../common/middleware/validate';
import { authenticate } from '../../common/middleware/auth.middleware';
import {
  initiateAuthSchema,
  verifyAuthOtpSchema,
  resendAuthOtpSchema,
  refreshTokenSchema
} from './auth.schemas';
import { otpInitiateLimiter, otpVerifyLimiter } from '../../common/middleware/rate-limiter';

const router = Router();

// Signup
router.post(
  '/signup/initiate',
  otpInitiateLimiter,
  validate({ body: initiateAuthSchema }),
  authController.initiateSignup
);

router.post(
  '/signup/verify-otp',
  otpVerifyLimiter,
  validate({ body: verifyAuthOtpSchema }),
  authController.verifySignupOtp
);

// Login
router.post(
  '/login/initiate',
  otpInitiateLimiter,
  validate({ body: initiateAuthSchema }),
  authController.initiateLogin
);

router.post(
  '/login/verify-otp',
  otpVerifyLimiter,
  validate({ body: verifyAuthOtpSchema }),
  authController.verifyLoginOtp
);

// Resend OTP
router.post(
  '/otp/resend',
  validate({ body: resendAuthOtpSchema }),
  authController.resendOtp
);

// Refresh Token
router.post(
  '/token/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refreshToken
);

// Logout
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

export const authRoutes = router;
