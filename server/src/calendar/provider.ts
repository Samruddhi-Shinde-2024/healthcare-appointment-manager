import type { AppointmentRecord } from '../appointments/repository.js';
import { environment } from '../config/environment.js';
import { ApplicationError } from '../errors/application-error.js';

export type CalendarTokenSet = Readonly<{
  accessToken: string;
  refreshToken: string;
  providerAccountEmail: string;
  scopes: readonly string[];
  expiresAt: Date | null;
}>;

export type CalendarProviderConnection = Readonly<{
  accessToken: string;
  providerAccountEmail: string;
}>;

export type CalendarEventInput = Readonly<{
  appointment: AppointmentRecord;
  connection: CalendarProviderConnection;
}>;

export type CalendarEventResult = Readonly<{
  externalEventId: string;
}>;

export interface CalendarProviderClient {
  buildAuthorizationUrl(state: string): string;
  exchangeAuthorizationCode(code: string): Promise<CalendarTokenSet>;
  revoke(accessToken: string): Promise<void>;
  createEvent(input: CalendarEventInput): Promise<CalendarEventResult>;
  updateEvent(input: CalendarEventInput & Readonly<{ externalEventId: string }>): Promise<CalendarEventResult>;
  deleteEvent(input: Readonly<{ accessToken: string; externalEventId: string }>): Promise<void>;
}

type GoogleTokenResponse = Readonly<{
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}>;

type GoogleUserInfoResponse = Readonly<{
  email?: string;
}>;

type GoogleEventResponse = Readonly<{
  id?: string;
}>;

function requireGoogleConfig(): Readonly<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}> {
  if (
    environment.GOOGLE_CLIENT_ID === undefined ||
    environment.GOOGLE_CLIENT_SECRET === undefined ||
    environment.GOOGLE_REDIRECT_URI === undefined
  ) {
    throw new ApplicationError('Google Calendar integration is not configured.', 503, 'GOOGLE_NOT_CONFIGURED');
  }

  return {
    clientId: environment.GOOGLE_CLIENT_ID,
    clientSecret: environment.GOOGLE_CLIENT_SECRET,
    redirectUri: environment.GOOGLE_REDIRECT_URI,
  };
}

function buildGoogleEventBody(appointment: AppointmentRecord): Readonly<Record<string, unknown>> {
  return {
    summary: `Healthcare appointment with ${appointment.doctor.user.email}`,
    description: `Patient: ${appointment.patient.user.email}`,
    start: {
      dateTime: appointment.startTime.toISOString(),
    },
    end: {
      dateTime: appointment.endTime.toISOString(),
    },
    attendees: [
      {
        email: appointment.patient.user.email,
      },
      {
        email: appointment.doctor.user.email,
      },
    ],
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export class GoogleCalendarProvider implements CalendarProviderClient {
  public buildAuthorizationUrl(state: string): string {
    const config = requireGoogleConfig();
    const params = new URLSearchParams({
      access_type: 'offline',
      client_id: config.clientId,
      include_granted_scopes: 'true',
      prompt: 'consent',
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public async exchangeAuthorizationCode(code: string): Promise<CalendarTokenSet> {
    const config = requireGoogleConfig();
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new ApplicationError('Google authorization code exchange failed.', 502, 'GOOGLE_TOKEN_EXCHANGE_FAILED');
    }

    const tokenResponse = await parseJsonResponse<GoogleTokenResponse>(response);

    if (tokenResponse.access_token === undefined || tokenResponse.refresh_token === undefined) {
      throw new ApplicationError('Google did not return the required OAuth tokens.', 502, 'GOOGLE_TOKEN_MISSING');
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new ApplicationError('Google account lookup failed.', 502, 'GOOGLE_ACCOUNT_LOOKUP_FAILED');
    }

    const userInfo = await parseJsonResponse<GoogleUserInfoResponse>(userInfoResponse);

    if (userInfo.email === undefined) {
      throw new ApplicationError('Google account email was not returned.', 502, 'GOOGLE_ACCOUNT_EMAIL_MISSING');
    }

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      providerAccountEmail: userInfo.email,
      scopes: tokenResponse.scope?.split(' ') ?? [],
      expiresAt:
        tokenResponse.expires_in === undefined
          ? null
          : new Date(Date.now() + tokenResponse.expires_in * 1000),
    };
  }

  public async revoke(accessToken: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
    });
  }

  public async createEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.connection.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGoogleEventBody(input.appointment)),
    });

    if (!response.ok) {
      throw new ApplicationError('Google Calendar event creation failed.', 502, 'GOOGLE_EVENT_CREATE_FAILED');
    }

    const event = await parseJsonResponse<GoogleEventResponse>(response);

    if (event.id === undefined) {
      throw new ApplicationError('Google Calendar event id was not returned.', 502, 'GOOGLE_EVENT_ID_MISSING');
    }

    return {
      externalEventId: event.id,
    };
  }

  public async updateEvent(input: CalendarEventInput & Readonly<{ externalEventId: string }>): Promise<CalendarEventResult> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.externalEventId)}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${input.connection.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildGoogleEventBody(input.appointment)),
      },
    );

    if (!response.ok) {
      throw new ApplicationError('Google Calendar event update failed.', 502, 'GOOGLE_EVENT_UPDATE_FAILED');
    }

    return {
      externalEventId: input.externalEventId,
    };
  }

  public async deleteEvent(input: Readonly<{ accessToken: string; externalEventId: string }>): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.externalEventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
        },
      },
    );

    if (!response.ok && response.status !== 410 && response.status !== 404) {
      throw new ApplicationError('Google Calendar event deletion failed.', 502, 'GOOGLE_EVENT_DELETE_FAILED');
    }
  }
}
