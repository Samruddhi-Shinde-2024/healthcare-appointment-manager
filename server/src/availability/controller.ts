import type { Request, Response } from 'express';

import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { AvailabilityService } from './service.js';
// import type {
//   AvailabilityListQuery,
//   CreateAvailabilityInput,
//   UpdateAvailabilityInput,
// } from './validation.js';

import type {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from './validation.js';

function requireAuthenticatedUser(request: Request) {
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

export class AvailabilityController {
  public constructor(private readonly availabilityService: AvailabilityService) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    // const availability = await this.availabilityService.list(
    //   requireIdParam(request),
    //   request.query as unknown as AvailabilityListQuery,
    // );

    const availability = await this.availabilityService.list(
    requireIdParam(request),
    request.query,
  );

    sendSuccess(response, 200, availability);
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    const availability = await this.availabilityService.create(
      request.body as CreateAvailabilityInput,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 201, availability);
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const availability = await this.availabilityService.update(
      requireIdParam(request),
      request.body as UpdateAvailabilityInput,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, availability);
  };

  public delete = async (request: Request, response: Response): Promise<void> => {
    const result = await this.availabilityService.delete(
      requireIdParam(request),
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, result);
  };
}
