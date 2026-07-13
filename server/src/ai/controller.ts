import type { Request, Response } from 'express';

import type { AuthenticatedUser } from '../auth/types.js';
import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { AiService } from './service.js';

function requireAuthenticatedUser(request: Request): AuthenticatedUser {
  if (request.user === undefined) {
    throw new ApplicationError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
  }

  return request.user;
}

function requireIdParam(request: Request): string {
  const id = request.params.id;

  if (typeof id !== 'string') {
    throw new ApplicationError('Route id parameter is required.', 400, 'VALIDATION_ERROR');
  }

  return id;
}

export class AiController {
  public constructor(private readonly aiService: AiService) {}

  public generatePreVisitSummary = async (request: Request, response: Response): Promise<void> => {
    const summary = await this.aiService.generatePreVisitSummary(
      requireIdParam(request),
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, summary);
  };

  public generatePostVisitSummary = async (request: Request, response: Response): Promise<void> => {
    const summary = await this.aiService.generatePostVisitSummary(
      requireIdParam(request),
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, summary);
  };
}
