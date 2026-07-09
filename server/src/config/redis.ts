// import IORedis from 'ioredis';
import { Redis } from 'ioredis';

import { environment } from './environment.js';
import { logger } from './logger.js';

// export const redis = new IORedis(environment.REDIS_URL, {
export const redis = new Redis(environment.REDIS_URL, {
  enableReadyCheck: true,
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

redis.on('error', (error: Error) => {
  logger.error('Redis connection error', { error });
});

// import Redis from "ioredis";

// import { environment } from "./environment.js";
// import { logger } from "./logger.js";

// export const redis = new Redis(environment.REDIS_URL, {
//   enableReadyCheck: true,
//   lazyConnect: true,
//   maxRetriesPerRequest: null,
// });

// redis.on("error", (error: Error) => {
//   logger.error("Redis connection error", { error });
// });
