import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './common/utils/logger';
import { initSocketIO, closeSocketIO } from './realtime/socket';
import { startAllWorkers, stopAllWorkers } from './workers';

async function bootstrap() {
  try {
    // Validate database connection
    logger.info('Connecting to PostgreSQL database...');
    await connectDatabase();
    logger.info('Connected to PostgreSQL successfully.');

    // Create Node HTTP server and bind Socket.IO
    const server = http.createServer(app);
    initSocketIO(server);

    // Start background asynchronous workers (chat expiry sweeper, per-minute billing engine, outbox dispatcher)
    startAllWorkers();

    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(
        `🚀 FaithTech Astrology API server is running on http://0.0.0.0:${env.PORT} in ${env.NODE_ENV} mode`
      );
      logger.info(`📚 Swagger UI documentation available at http://0.0.0.0:${env.PORT}/api/docs/`);
      logger.info(`💓 Health check available at http://0.0.0.0:${env.PORT}/health`);
      logger.info(`⚡ Socket.IO realtime connection ready at ws://0.0.0.0:${env.PORT}`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Initiating graceful shutdown...`);
      stopAllWorkers();
      await closeSocketIO();

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
