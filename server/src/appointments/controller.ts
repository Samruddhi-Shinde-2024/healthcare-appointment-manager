import type { Request, Response } from 'express';

import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { AppointmentsService } from './service.js';
import type {
  AppointmentListQuery,
  BookAppointmentInput,
  CancelAppointmentInput,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
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

export class AppointmentsController {
  public constructor(private readonly appointmentsService: AppointmentsService) {}

  public book = async (request: Request, response: Response): Promise<void> => {
    const appointment = await this.appointmentsService.book(
      request.body as BookAppointmentInput,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 201, appointment);
  };

  public list = async (request: Request, response: Response): Promise<void> => {
    const result = await this.appointmentsService.list(
      request.query as unknown as AppointmentListQuery,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, result.appointments, result.meta);
  };

  public get = async (request: Request, response: Response): Promise<void> => {
    const appointment = await this.appointmentsService.get(
      requireIdParam(request),
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, appointment);
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    const appointment = await this.appointmentsService.update(
      requireIdParam(request),
      request.body as UpdateAppointmentInput,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, appointment);
  };

  public reschedule = async (request: Request, response: Response): Promise<void> => {
    const appointment = await this.appointmentsService.reschedule(
      requireIdParam(request),
      request.body as RescheduleAppointmentInput,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, appointment);
  };

  public cancel = async (request: Request, response: Response): Promise<void> => {
    const appointment = await this.appointmentsService.cancel(
      requireIdParam(request),
      request.body as CancelAppointmentInput,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, appointment);
  };
}
