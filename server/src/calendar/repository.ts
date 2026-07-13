import {
  CalendarProvider,
  CalendarSyncStatus,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';

export type CalendarConnectionRecord = Prisma.CalendarConnectionGetPayload<object>;
export type CalendarEventRecord = Prisma.CalendarEventGetPayload<object>;

export class CalendarRepository {
  public constructor(private readonly database: PrismaClient) {}

  public upsertConnection(input: Readonly<{
    userId: string;
    providerAccountEmail: string;
    accessTokenEncrypted: string;
    refreshTokenEncrypted: string;
    scopes: readonly string[];
    expiresAt: Date | null;
    actorId: string;
  }>): Promise<CalendarConnectionRecord> {
    return this.database.calendarConnection.upsert({
      where: {
        userId_provider: {
          userId: input.userId,
          provider: CalendarProvider.GOOGLE,
        },
      },
      create: {
        userId: input.userId,
        provider: CalendarProvider.GOOGLE,
        providerAccountEmail: input.providerAccountEmail,
        accessTokenEncrypted: input.accessTokenEncrypted,
        refreshTokenEncrypted: input.refreshTokenEncrypted,
        scopes: [...input.scopes],
        expiresAt: input.expiresAt,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
      update: {
        providerAccountEmail: input.providerAccountEmail,
        accessTokenEncrypted: input.accessTokenEncrypted,
        refreshTokenEncrypted: input.refreshTokenEncrypted,
        scopes: [...input.scopes],
        expiresAt: input.expiresAt,
        revokedAt: null,
        updatedBy: input.actorId,
      },
    });
  }

  public findActiveConnectionByUserId(userId: string): Promise<CalendarConnectionRecord | null> {
    return this.database.calendarConnection.findFirst({
      where: {
        userId,
        provider: CalendarProvider.GOOGLE,
        revokedAt: null,
      },
    });
  }

  public async revokeConnection(userId: string, actorId: string): Promise<CalendarConnectionRecord | null> {
    const connection = await this.findActiveConnectionByUserId(userId);

    if (connection === null) {
      return null;
    }

    return this.database.calendarConnection.update({
      where: {
        id: connection.id,
      },
      data: {
        revokedAt: new Date(),
        updatedBy: actorId,
      },
    });
  }

  public findEventByAppointmentId(appointmentId: string): Promise<CalendarEventRecord | null> {
    return this.database.calendarEvent.findUnique({
      where: {
        appointmentId,
      },
    });
  }

  public upsertEvent(input: Readonly<{
    appointmentId: string;
    calendarConnectionId: string;
    externalEventId: string;
    syncStatus: CalendarSyncStatus;
    actorId: string;
  }>): Promise<CalendarEventRecord> {
    return this.database.calendarEvent.upsert({
      where: {
        appointmentId: input.appointmentId,
      },
      create: {
        appointmentId: input.appointmentId,
        calendarConnectionId: input.calendarConnectionId,
        provider: CalendarProvider.GOOGLE,
        externalEventId: input.externalEventId,
        syncStatus: input.syncStatus,
        lastSynchronizedAt: input.syncStatus === CalendarSyncStatus.SYNCED ? new Date() : null,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
      update: {
        calendarConnectionId: input.calendarConnectionId,
        externalEventId: input.externalEventId,
        syncStatus: input.syncStatus,
        lastSynchronizedAt: input.syncStatus === CalendarSyncStatus.SYNCED ? new Date() : null,
        updatedBy: input.actorId,
      },
    });
  }

  public markEventDeleted(id: string, actorId: string): Promise<CalendarEventRecord> {
    return this.database.calendarEvent.update({
      where: {
        id,
      },
      data: {
        syncStatus: CalendarSyncStatus.DELETED,
        lastSynchronizedAt: new Date(),
        updatedBy: actorId,
      },
    });
  }
}
