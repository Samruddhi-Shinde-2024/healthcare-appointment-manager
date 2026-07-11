import type { Request, Response } from 'express';

import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { DoctorsService } from './service.js';
import type { CreateDoctorInput, DoctorListQuery, UpdateDoctorInput } from './validation.js';

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

export class DoctorsController {
  public constructor(private readonly doctorsService: DoctorsService) {}

  public create = async (request: Request, response: Response): Promise<void> => {
    const doctor = await this.doctorsService.create(
      request.body as CreateDoctorInput,
      requireActorId(request),
    );
    sendSuccess(response, 201, doctor);
  };

  public list = async (request: Request, response: Response): Promise<void> => {
    const result = await this.doctorsService.list(request.query as unknown as DoctorListQuery);
    sendSuccess(response, 200, result.doctors, result.meta);
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const doctor = await this.doctorsService.get(requireIdParam(request));
    sendSuccess(response, 200, doctor);
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const doctor = await this.doctorsService.update(
      requireIdParam(request),
      request.body as UpdateDoctorInput,
      requireActorId(request),
    );
    sendSuccess(response, 200, doctor);
  };

  public deactivate = async (request: Request, response: Response): Promise<void> => {
    const doctor = await this.doctorsService.deactivate(requireIdParam(request), requireActorId(request));
    sendSuccess(response, 200, doctor);
  };
}
