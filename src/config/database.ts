import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../common/utils/logger';

export const basePrisma =
  global.basePrisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  });

if (env.NODE_ENV !== 'production') {
  global.basePrisma = basePrisma;
}

/**
 * Detects transient connection drops, pool timeouts, and socket closures
 */
export const isConnectionError = (err: any): boolean => {
  if (!err) return false;
  const message = String(err.message || '').toLowerCase();
  const code = String(err.code || '');

  return (
    code === 'P1001' || // Can't reach database server
    code === 'P1002' || // Database server reached but timed out
    code === 'P1008' || // Operations timed out
    code === 'P1017' || // Server has closed the connection
    code === 'P2024' || // Timed out fetching a connection from pool
    message.includes("can't reach database server") ||
    message.includes('server has closed the connection') ||
    message.includes('server closed the connection') ||
    message.includes('connection terminated unexpectedly') ||
    message.includes('connection closed') ||
    message.includes('connection lost') ||
    message.includes('econnreset') ||
    message.includes('epipe') ||
    message.includes('etimedout') ||
    message.includes('socket hang up') ||
    message.includes('broken pipe')
  );
};

/**
 * Creates an extended Prisma client with automated query retry on transient connection drops
 */
export function createResilientPrismaClient(client: PrismaClient) {
  return client.$extends({
    name: 'auto-reconnect-retry',
    query: {
      $allOperations: async ({ model, operation, args, query }) => {
        let attempts = 0;
        const maxRetries = 2;

        while (true) {
          try {
            return await query(args);
          } catch (error: any) {
            attempts++;

            if (isConnectionError(error) && attempts <= maxRetries) {
              logger.warn(
                { model: model || 'raw', operation, attempt: attempts, maxRetries },
                '[Prisma] Transient connection drop detected. Auto-reconnecting and retrying query...'
              );

              try {
                await basePrisma.$disconnect().catch(() => {});
                await basePrisma.$connect().catch(() => {});
              } catch (reconnectErr: any) {
                logger.warn(
                  { err: reconnectErr.message },
                  '[Prisma] Reconnection attempt failed, retrying...'
                );
              }

              // Brief backoff before retrying
              await new Promise((resolve) => setTimeout(resolve, 150 * attempts));
              continue;
            }

            throw error;
          }
        }
      }
    }
  });
}

declare global {
  // eslint-disable-next-line no-var
  var basePrisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma || (createResilientPrismaClient(basePrisma) as unknown as PrismaClient);

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

let heartbeatInterval: NodeJS.Timeout | null = null;

export function startDatabaseHeartbeat(): void {
  if (heartbeatInterval) return;

  // Run a lightweight heartbeat every 25 seconds to keep the Supabase connection warm
  // .unref() ensures this timer does not prevent the Node process from terminating
  heartbeatInterval = setInterval(async () => {
    try {
      await basePrisma.$queryRaw`SELECT 1`;
    } catch (err: any) {
      if (isConnectionError(err)) {
        try {
          await basePrisma.$disconnect().catch(() => {});
          await basePrisma.$connect().catch(() => {});
        } catch {
          // Ignored on background keepalive
        }
      }
    }
  }, 25000);

  heartbeatInterval.unref();
}

export function stopDatabaseHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Auto-start heartbeat if not in test environment
if (env.NODE_ENV !== 'test') {
  startDatabaseHeartbeat();
}

export async function connectDatabase(): Promise<void> {
  await basePrisma.$connect();
  // Warm up connection with active query to ensure connection pool is ready
  await basePrisma.$queryRaw`SELECT 1`;
  startDatabaseHeartbeat();
}

export async function disconnectDatabase(): Promise<void> {
  stopDatabaseHeartbeat();
  await basePrisma.$disconnect();
}
