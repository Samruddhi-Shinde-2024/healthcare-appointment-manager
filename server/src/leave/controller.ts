import type { Request, Response } from 'express';

import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { LeaveService } from './service.js';
// import type { CreateLeaveInput, LeaveListQuery, UpdateLeaveInput } from './validation.js';
import type { CreateLeaveInput, UpdateLeaveInput } from './validation.js';

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

export class LeaveController {
  public constructor(private readonly leaveService: LeaveService) {}

  public create = async (request: Request, response: Response): Promise<void> => {
    const leave = await this.leaveService.create(
      request.body as CreateLeaveInput,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 201, leave);
  };

  public list = async (request: Request, response: Response): Promise<void> => {
    // const leaves = await this.leaveService.list(
    //   request.query as unknown as LeaveListQuery,
    //   requireAuthenticatedUser(request),
    // );

    const leaves = await this.leaveService.list(
    request.query,
    requireAuthenticatedUser(request),
  );

    sendSuccess(response, 200, leaves);
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const leave = await this.leaveService.update(
      requireIdParam(request),
      request.body as UpdateLeaveInput,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, leave);
  };

  public cancel = async (request: Request, response: Response): Promise<void> => {
    const leave = await this.leaveService.cancel(
      requireIdParam(request),
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, leave);
  };
}
