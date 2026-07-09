import type { NextFunction, Request, Response } from 'express';

import { ApplicationError } from '../errors/application-error.js';

export function notFound(request: Request, _response: Response, next: NextFunction): void {
  next(
    new ApplicationError(
      `Route ${request.method} ${request.path} was not found.`,
      404,
      'NOT_FOUND',
    ),
  );
}
