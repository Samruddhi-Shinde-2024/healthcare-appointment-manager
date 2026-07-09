import type { Server } from 'node:http';

import { createApplication } from './app.js';
import { environment } from './config/environment.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { redis } from './config/redis.js';

const application = createApplication();
let server: Server | undefined;
let isShuttingDown = false;

async function start(): Promise<void> {
  await prisma.$connect();
  await redis.connect();

  server = application.listen(environment.PORT, () => {
    logger.info('API server started', {
      environment: environment.NODE_ENV,
      port: environment.PORT,
    });
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info('Graceful shutdown started', { signal });

  const forceShutdownTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out');
    process.exit(1);
  }, 10_000);
  forceShutdownTimer.unref();

  if (server !== undefined) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await Promise.all([prisma.$disconnect(), redis.quit()]);
  clearTimeout(forceShutdownTimer);
  logger.info('Graceful shutdown completed');
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal)
      .then(() => {
        process.exit(0);
      })
      .catch((error: unknown) => {
        logger.error('Graceful shutdown failed', { error, signal });
        process.exit(1);
      });
  });
}

void start().catch((error: unknown) => {
  logger.error('API server failed to start', { error });
  process.exit(1);
});
