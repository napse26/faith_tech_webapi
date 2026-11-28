"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const logger_1 = require("./common/utils/logger");
const socket_1 = require("./realtime/socket");
const workers_1 = require("./workers");
async function bootstrap() {
    try {
        // Validate database connection
        logger_1.logger.info('Connecting to PostgreSQL database...');
        await (0, database_1.connectDatabase)();
        logger_1.logger.info('Connected to PostgreSQL successfully.');
        // Create Node HTTP server and bind Socket.IO
        const server = http_1.default.createServer(app_1.app);
        (0, socket_1.initSocketIO)(server);
        // Start background asynchronous workers (chat expiry sweeper, per-minute billing engine, outbox dispatcher)
        (0, workers_1.startAllWorkers)();
        server.listen(env_1.env.PORT, '0.0.0.0', () => {
            logger_1.logger.info(`🚀 FaithTech Astrology API server is running on http://0.0.0.0:${env_1.env.PORT} in ${env_1.env.NODE_ENV} mode`);
            logger_1.logger.info(`📚 Swagger UI documentation available at http://0.0.0.0:${env_1.env.PORT}/api/docs/`);
            logger_1.logger.info(`💓 Health check available at http://0.0.0.0:${env_1.env.PORT}/health`);
            logger_1.logger.info(`⚡ Socket.IO realtime connection ready at ws://0.0.0.0:${env_1.env.PORT}`);
        });
        // Graceful shutdown handling
        const shutdown = async (signal) => {
            logger_1.logger.info(`${signal} received. Initiating graceful shutdown...`);
            (0, workers_1.stopAllWorkers)();
            await (0, socket_1.closeSocketIO)();
            server.close(async () => {
                logger_1.logger.info('HTTP server closed.');
                await (0, database_1.disconnectDatabase)();
                logger_1.logger.info('Database connection closed.');
                process.exit(0);
            });
            // Force shutdown if hung
            setTimeout(() => {
                logger_1.logger.error('Forcefully terminating process after 10s timeout.');
                process.exit(1);
            }, 10000).unref();
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_1.logger.fatal({ error }, 'Failed to start application server');
        process.exit(1);
    }
}
bootstrap();
