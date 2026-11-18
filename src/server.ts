import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './common/utils/logger';

async function bootstrap() {
  try {
    // Validate database connection
    logger.info('Connecting to PostgreSQL database...');
    await connectDatabase();
    logger.info('Connected to PostgreSQL successfully.');

    const server = app.listen(env.PORT, () => {
      logger.info(
        `🚀 FaithTech Astrology API server is running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`
      );
      logger.info(`📚 Swagger UI documentation available at http://localhost:${env.PORT}/api/docs`);
      logger.info(`💓 Health check available at http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Initiating graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        logger.info('Database connection closed.');
        process.exit(0);
      });

      // Force shutdown if hung
      setTimeout(() => {
        logger.error('Forcefully terminating process after 10s timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Failed to start application server');
    process.exit(1);
  }
}

bootstrap();
