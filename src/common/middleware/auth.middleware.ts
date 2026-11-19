import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../../modules/sessions/session.service';
import { prisma } from '../../config/database';
import { UnauthorizedError, ForbiddenError } from '../errors/app-error';

export interface AuthenticatedUser {
  id: string;
  userId: bigint;
  sessionId: string;
  mobileNumber: string;
  role: string;
  status: string;
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
    next(new UnauthorizedError('Missing or malformed Authorization header', 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.substring(7).trim();

  try {
    const payload = sessionService.verifyAccessToken(token);

    // Verify session is active in database (revocation check)
    const session = await prisma.user_sessions.findUnique({
      where: { id: payload.sid },
      select: { id: true, revoked_at: true, expires_at: true }
    });

    if (!session || session.revoked_at !== null || session.expires_at < new Date()) {
      next(new UnauthorizedError('Session has been revoked or expired', 'SESSION_REVOKED'));
      return;
    }

    // Touch session activity asynchronously
    prisma.user_sessions.update({
      where: { id: session.id },
      data: { last_active_at: new Date() }
    }).catch(() => {});

    // Verify user in DB with their roles
    const user = await prisma.users.findUnique({
      where: { user_id: BigInt(payload.sub) },
      include: {
        user_roles: {
          include: {
            roles: true
          }
        }
      }
    });

    if (!user) {
      next(new UnauthorizedError('User account not found', 'USER_NOT_FOUND'));
      return;
    }

    const accountStatus = user.status || (user.is_active ? 'ACTIVE' : 'INACTIVE');

    if (accountStatus === 'BLOCKED') {
      next(new ForbiddenError('Account has been blocked', 'ACCOUNT_BLOCKED'));
      return;
    }

    if (accountStatus === 'SUSPENDED') {
      next(new ForbiddenError('Account has been suspended', 'ACCOUNT_SUSPENDED'));
      return;
    }

    const primaryRole = user.user_roles[0]?.roles?.role_name || 'CUSTOMER';

    req.user = {
      id: user.user_id.toString(),
      userId: user.user_id,
      sessionId: payload.sid,
      mobileNumber: user.mobile_no,
      role: primaryRole,
      status: accountStatus
    };

    next();
  } catch (error) {
    next(error);
  }
}
