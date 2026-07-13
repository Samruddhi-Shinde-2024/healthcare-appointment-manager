import type { Request, Response } from 'express';

import type { AuthenticatedUser } from '../auth/types.js';
import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { CalendarService } from './service.js';
import type { GoogleCalendarCallbackInput } from './validation.js';

function requireAuthenticatedUser(request: Request): AuthenticatedUser {
  if (request.user === undefined) {
    throw new ApplicationError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
  }

  return request.user;
}

export class CalendarController {
  public constructor(private readonly calendarService: CalendarService) {}

  public connectGoogle = (request: Request, response: Response): void => {
    sendSuccess(response, 200, this.calendarService.buildConnectUrl(requireAuthenticatedUser(request)));
  };

  public completeGoogleConnection = async (request: Request, response: Response): Promise<void> => {
    const connection = await this.calendarService.completeConnection(
      (request.body as GoogleCalendarCallbackInput).code,
      requireAuthenticatedUser(request),
    );
    sendSuccess(response, 200, connection);
  };

  public disconnectGoogle = async (request: Request, response: Response): Promise<void> => {
    const connection = await this.calendarService.disconnect(requireAuthenticatedUser(request));
    sendSuccess(response, 200, connection);
  };
}
