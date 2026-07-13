import { CalendarSyncStatus } from '@prisma/client';

import type { AppointmentRecord } from '../appointments/repository.js';
import type { AuthenticatedUser } from '../auth/types.js';
import { logger } from '../config/logger.js';
import { ApplicationError } from '../errors/application-error.js';
import { decryptToken, encryptToken } from './crypto.js';
import type { CalendarProviderClient } from './provider.js';
import type { CalendarConnectionRecord, CalendarEventRecord, CalendarRepository } from './repository.js';

export type CalendarConnectionResponse = Readonly<{
  id: string;
  providerAccountEmail: string;
  scopes: readonly string[];
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type CalendarConnectResponse = Readonly<{
  authorizationUrl: string;
}>;

function serializeConnection(connection: CalendarConnectionRecord): CalendarConnectionResponse {
  return {
    id: connection.id,
    providerAccountEmail: connection.providerAccountEmail,
    scopes: connection.scopes,
    expiresAt: connection.expiresAt?.toISOString() ?? null,
    revokedAt: connection.revokedAt?.toISOString() ?? null,
    createdAt: connection.createdAt.toISOString(),
    updatedAt: connection.updatedAt.toISOString(),
  };
}

export class CalendarService {
  public constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly provider: CalendarProviderClient,
  ) {}

  public buildConnectUrl(actor: AuthenticatedUser): CalendarConnectResponse {
    return {
      authorizationUrl: this.provider.buildAuthorizationUrl(actor.id),
    };
  }

  public async completeConnection(code: string, actor: AuthenticatedUser): Promise<CalendarConnectionResponse> {
    const tokenSet = await this.provider.exchangeAuthorizationCode(code);
    const connection = await this.calendarRepository.upsertConnection({
      userId: actor.id,
      providerAccountEmail: tokenSet.providerAccountEmail,
      accessTokenEncrypted: encryptToken(tokenSet.accessToken),
      refreshTokenEncrypted: encryptToken(tokenSet.refreshToken),
      scopes: tokenSet.scopes,
      expiresAt: tokenSet.expiresAt,
      actorId: actor.id,
    });

    return serializeConnection(connection);
  }

  public async disconnect(actor: AuthenticatedUser): Promise<CalendarConnectionResponse | null> {
    const connection = await this.calendarRepository.findActiveConnectionByUserId(actor.id);

    if (connection !== null) {
      await this.provider.revoke(decryptToken(connection.accessTokenEncrypted));
    }

    const revokedConnection = await this.calendarRepository.revokeConnection(actor.id, actor.id);
    return revokedConnection === null ? null : serializeConnection(revokedConnection);
  }

  public async createEventForAppointment(appointment: AppointmentRecord, actorId: string): Promise<CalendarEventRecord | null> {
    const connection = await this.calendarRepository.findActiveConnectionByUserId(appointment.doctor.userId);

    if (connection === null) {
      return null;
    }

    try {
      const result = await this.provider.createEvent({
        appointment,
        connection: {
          accessToken: decryptToken(connection.accessTokenEncrypted),
          providerAccountEmail: connection.providerAccountEmail,
        },
      });

      return this.calendarRepository.upsertEvent({
        appointmentId: appointment.id,
        calendarConnectionId: connection.id,
        externalEventId: result.externalEventId,
        syncStatus: CalendarSyncStatus.SYNCED,
        actorId,
      });
    } catch (error) {
      logger.warn('Calendar event creation failed.', {
        appointmentId: appointment.id,
        error,
      });

      return this.calendarRepository.upsertEvent({
        appointmentId: appointment.id,
        calendarConnectionId: connection.id,
        externalEventId: `local-${appointment.id}`,
        syncStatus: CalendarSyncStatus.FAILED,
        actorId,
      });
    }
  }

  public async updateEventForAppointment(appointment: AppointmentRecord, actorId: string): Promise<CalendarEventRecord | null> {
    const [connection, existingEvent] = await Promise.all([
      this.calendarRepository.findActiveConnectionByUserId(appointment.doctor.userId),
      this.calendarRepository.findEventByAppointmentId(appointment.id),
    ]);

    if (connection === null) {
      return null;
    }

    if (existingEvent === null || existingEvent.syncStatus === CalendarSyncStatus.FAILED) {
      return this.createEventForAppointment(appointment, actorId);
    }

    try {
      const result = await this.provider.updateEvent({
        appointment,
        externalEventId: existingEvent.externalEventId,
        connection: {
          accessToken: decryptToken(connection.accessTokenEncrypted),
          providerAccountEmail: connection.providerAccountEmail,
        },
      });

      return this.calendarRepository.upsertEvent({
        appointmentId: appointment.id,
        calendarConnectionId: connection.id,
        externalEventId: result.externalEventId,
        syncStatus: CalendarSyncStatus.SYNCED,
        actorId,
      });
    } catch (error) {
      logger.warn('Calendar event update failed.', {
        appointmentId: appointment.id,
        error,
      });

      return this.calendarRepository.upsertEvent({
        appointmentId: appointment.id,
        calendarConnectionId: connection.id,
        externalEventId: existingEvent.externalEventId,
        syncStatus: CalendarSyncStatus.FAILED,
        actorId,
      });
    }
  }

  public async deleteEventForAppointment(appointment: AppointmentRecord, actorId: string): Promise<CalendarEventRecord | null> {
    const existingEvent = await this.calendarRepository.findEventByAppointmentId(appointment.id);

    if (existingEvent === null) {
      return null;
    }

    const connection = await this.calendarRepository.findActiveConnectionByUserId(appointment.doctor.userId);

    if (connection === null) {
      return this.calendarRepository.markEventDeleted(existingEvent.id, actorId);
    }

    try {
      if (!existingEvent.externalEventId.startsWith('local-')) {
        await this.provider.deleteEvent({
          accessToken: decryptToken(connection.accessTokenEncrypted),
          externalEventId: existingEvent.externalEventId,
        });
      }
    } catch (error) {
      logger.warn('Calendar event deletion failed.', {
        appointmentId: appointment.id,
        error,
      });
      throw new ApplicationError('Calendar event deletion failed.', 502, 'CALENDAR_DELETE_FAILED');
    }

    return this.calendarRepository.markEventDeleted(existingEvent.id, actorId);
  }
}
