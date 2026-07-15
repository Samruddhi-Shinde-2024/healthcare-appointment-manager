import type { Request, Response } from 'express';

import type { AuthenticatedUser } from '../auth/types.js';
import { sendSuccess } from '../common/api-response.js';
import { ApplicationError } from '../errors/application-error.js';
import type { CalendarService } from './service.js';
import type { GoogleCalendarCallbackInput, GoogleCalendarCallbackQuery } from './validation.js';

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

  public completeGoogleBrowserCallback = async (request: Request, response: Response): Promise<void> => {
    const query = request.query as unknown as GoogleCalendarCallbackQuery;
    const connection = await this.calendarService.completeConnectionFromCallback(query.code, query.state);

    response.status(200).type('html').send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Google Calendar Connected</title>
        </head>
        <body style="font-family: system-ui, sans-serif; padding: 2rem; color: #0f172a;">
          <h1>Google Calendar connected</h1>
          <p>${escapeHtml(connection.providerAccountEmail)} is now connected. You can return to the Healthcare Appointment Manager.</p>
        </body>
      </html>
    `);
  };

  public disconnectGoogle = async (request: Request, response: Response): Promise<void> => {
    const connection = await this.calendarService.disconnect(requireAuthenticatedUser(request));
    sendSuccess(response, 200, connection);
  };
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
