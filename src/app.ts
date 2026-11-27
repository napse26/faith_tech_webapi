import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { requestIdMiddleware } from './common/middleware/request-id';
import { errorHandler } from './common/middleware/error-handler';
import { globalLimiter } from './common/middleware/rate-limiter';
import { prisma } from './config/database';
import { createSuccessResponse, createErrorResponse } from './common/types/api-response';
import openapiSpec from './docs/openapi.json';

// Route imports
import { authRoutes } from './modules/auth/auth.routes';
import { profileRoutes } from './modules/profiles/profile.routes';
import { birthDetailsRoutes } from './modules/birth-details/birth-details.routes';
import { userRoutes } from './modules/users/user.routes';
import { customerRoutes } from './modules/customer/customer.routes';
import { customerV1Router } from './modules/customer/customer-feature.routes';
import { astrologerRoutes } from './modules/astrologers/astrologer.routes';
import { adminAstrologerRoutes } from './modules/astrologers/admin-astrologer.routes';
import { poojaRoutes } from './modules/poojas/pooja.routes';
import { poojaBookingRoutes } from './modules/poojas/pooja-booking.routes';
import { adminPoojaRoutes } from './modules/poojas/admin-pooja.routes';
import { adminPoojaBookingRoutes } from './modules/poojas/admin-pooja-booking.routes';

// Ensure BigInt values serialize cleanly to JSON
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

export function createApp(): Express {
  const app = express();

  // Trust reverse proxies (Nginx, AWS ALB, Cloudflare) on deployed servers
  app.set('trust proxy', 1);

  // Basic security and request parsing
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disables Helmet CSP so Swagger UI and HTTP IP deployments load reliably
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request correlation / trace ID
  app.use(requestIdMiddleware);

  // Root route: Redirect browsers to Swagger UI documentation, return API info for JSON clients
  app.get('/', (req: Request, res: Response) => {
    if (req.accepts('html')) {
      return res.redirect('/api/docs/');
    }
    return res.status(200).json(
      createSuccessResponse(
        {
          name: 'DharmaDarshan Astrology & Customer Management API',
          version: '1.0.0',
          docs: '/api/docs/',
          health: '/health',
          ready: '/ready',
          status: 'DEPLOYED_LATEST'
        },
        'Welcome to FaithTech DharmaDarshan API',
        req.traceId
      )
    );
  });

  // Health check & readiness probes (unthrottled)
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json(
      createSuccessResponse(
        {
          status: 'UP',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          deployment: 'LATEST'
        },
        'Service is healthy',
        req.traceId
      )
    );
  });

  app.get('/ready', async (req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json(
        createSuccessResponse(
          {
            database: 'CONNECTED',
            status: 'READY'
          },
          'Service and database are ready',
          req.traceId
        )
      );
    } catch (error) {
      res.status(503).json(
        createErrorResponse(
          'Service not ready: Database connection failed',
          [{ code: 'DATABASE_UNAVAILABLE', message: 'Unable to reach PostgreSQL database' }],
          req.traceId
        )
      );
    }
  });

  // Swagger Documentation Options
  const swaggerUiOptions: swaggerUi.SwaggerOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      tryItOutEnabled: true, // Enables Try It Out by default so parameters and body inputs are editable immediately
      filter: true
    },
    customSiteTitle: 'DharmaDarshan API Documentation'
  };

  // Swagger Documentation aliases & trailing slash handlers
  app.get(['/docs', '/swagger'], (req: Request, res: Response) => {
    res.redirect('/api/docs/');
  });

  // Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, swaggerUiOptions));
  app.get('/api/docs.json', (req: Request, res: Response) => {
    res.json(openapiSpec);
  });

  // Global rate limiter applied to API endpoints
  app.use('/api', globalLimiter);

  // Mount versioned module routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/customer', customerV1Router);
  app.use('/api/v1/customers', customerV1Router);
  app.use('/api/v1/customers/me', customerRoutes);
  app.use('/api/v1/users', profileRoutes);
  app.use('/api/v1/users', birthDetailsRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/astrologers', astrologerRoutes);
  app.use('/api/v1/admin/astrologers', adminAstrologerRoutes);
  app.use('/api/v1/poojas', poojaRoutes);
  app.use('/api/v1/pooja-bookings', poojaBookingRoutes);
  app.use('/api/v1/admin/poojas', adminPoojaRoutes);
  app.use('/api/v1/admin/pooja-bookings', adminPoojaBookingRoutes);

  // Catch-all 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json(
      createErrorResponse(
        `Endpoint ${req.method} ${req.originalUrl} not found`,
        [{ code: 'ROUTE_NOT_FOUND', message: 'The requested route does not exist' }],
        req.traceId
      )
    );
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
