import winston from 'winston';

import { environment } from './environment.js';

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    const context =
      Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata, serializeLogValue)}` : '';
    return `${String(timestamp)} ${level}: ${String(message)}${context}`;
  }),
);

export const logger = winston.createLogger({
  level: environment.LOG_LEVEL,
  format: environment.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'healthcare-api' },
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

function serializeLogValue(_key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause,
    };
  }

  return value;
}
