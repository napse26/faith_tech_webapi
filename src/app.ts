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

// Ensure BigInt values serialize cleanly to JSON
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

export function createApp(): Express {
  const app = express();

  // Basic security and request parsing
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request correlation / trace ID
  app.use(requestIdMiddleware);

  // Health check & readiness probes (unthrottled)
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json(
      createSuccessResponse(
        {
          status: 'UP',
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
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

  // Swagger Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/api/docs.json', (req: Request, res: Response) => {
    res.json(openapiSpec);
  });

  // Global rate limiter applied to API endpoints
  app.use('/api', globalLimiter);

  // Mount versioned module routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', profileRoutes);
  app.use('/api/v1/users', birthDetailsRoutes);
  app.use('/api/v1/users', userRoutes);

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
