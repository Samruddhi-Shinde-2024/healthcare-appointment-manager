import type { Request, Response } from 'express';

import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { PatientsService } from './service.js';
import type { PatientListQuery, UpdatePatientInput } from './validation.js';

function requireActorId(request: Request): string {
  if (request.user === undefined) {
    throw new ApplicationError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
  }

  return request.user.id;
}

function requireIdParam(request: Request): string {
  const id = request.params.id;

  if (typeof id !== 'string') {
    throw new ApplicationError('Route id parameter is required.', 400, 'VALIDATION_ERROR');
  }

  return id;
}

export class PatientsController {
  public constructor(private readonly patientsService: PatientsService) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const result = await this.patientsService.list(request.query as unknown as PatientListQuery);
    sendSuccess(response, 200, result.patients, result.meta);
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const patient = await this.patientsService.get(requireIdParam(request));
    sendSuccess(response, 200, patient);
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const patient = await this.patientsService.update(
      requireIdParam(request),
      request.body as UpdatePatientInput,
      requireActorId(request),
    );
    sendSuccess(response, 200, patient);
  };

  public deactivate = async (request: Request, response: Response): Promise<void> => {
    const patient = await this.patientsService.deactivate(
      requireIdParam(request),
      requireActorId(request),
    );
    sendSuccess(response, 200, patient);
  };
}
