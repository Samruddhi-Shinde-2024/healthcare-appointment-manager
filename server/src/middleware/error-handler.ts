import type { NextFunction, Request, Response } from 'express';

import { ApplicationError } from '../errors/application-error.js';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const isKnownError = error instanceof ApplicationError;
  const applicationError = isKnownError
    ? error
    : new ApplicationError('An unexpected error occurred.', 500, 'INTERNAL_SERVER_ERROR');

  logger.error(applicationError.message, {
    code: applicationError.code,
    ...(isKnownError ? {} : { originalError: error }),
    ...(isKnownError ? {} : { originalMessage: getErrorMessage(error) }),
    ...(isKnownError ? {} : { originalStack: getErrorStack(error) }),
    method: request.method,
    path: request.path,
    requestId: request.requestId,
  });

  response.status(applicationError.statusCode).json({
    success: false,
    error: {
      code: applicationError.code,
      message: applicationError.message,
      requestId: request.requestId,
      ...(applicationError.details === undefined ? {} : { details: applicationError.details }),
      ...(environment.NODE_ENV === 'development'
        ? {
            stack: getErrorStack(error) ?? applicationError.stack,
            ...(isKnownError ? {} : { cause: getErrorMessage(error) }),
          }
        : {}),
    },
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
