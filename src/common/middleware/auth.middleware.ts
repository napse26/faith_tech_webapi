import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../../modules/sessions/session.service';
import { prisma } from '../../config/database';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error';
import { UserStatus, SessionStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  mobileNumber: string;
  status: UserStatus;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Missing or malformed Authorization header', 'MISSING_TOKEN'));
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = sessionService.verifyAccessToken(token);

    // Verify session is active in database (revocation check)
    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      select: { id: true, status: true, expiresAt: true }
    });

    if (!session || session.status !== SessionStatus.ACTIVE || session.expiresAt < new Date()) {
      next(new UnauthorizedError('Session has been revoked or expired', 'SESSION_REVOKED'));
      return;
    }

    // Verify user in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, mobileNumber: true, status: true }
    });

    if (!user) {
      next(new UnauthorizedError('User account not found', 'USER_NOT_FOUND'));
      return;
    }

    if (user.status === UserStatus.BLOCKED) {
      next(new ForbiddenError('Account has been suspended or blocked', 'ACCOUNT_BLOCKED'));
      return;
    }

    if (user.status === UserStatus.DEACTIVATED) {
      next(new ForbiddenError('Account is deactivated. Please log in to reactivate.', 'ACCOUNT_DEACTIVATED'));
      return;
    }

    if (user.status === UserStatus.DELETION_PENDING) {
      next(new ForbiddenError('Account is pending deletion. Please log in to cancel deletion request.', 'ACCOUNT_DELETION_PENDING'));
      return;
    }

    req.user = {
      id: user.id,
      sessionId: payload.sid,
      mobileNumber: user.mobileNumber,
      status: user.status
    };

    next();
  } catch (error) {
    next(error);
  }
}

