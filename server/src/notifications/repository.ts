import type { NotificationChannel, NotificationType, Prisma, PrismaClient } from '@prisma/client';

export type CreateNotificationInput = Readonly<{
  recipientId: string;
  appointmentId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  actorId?: string;
}>;

export class NotificationsRepository {
  public constructor(private readonly database: PrismaClient) {}

  public async createMany(inputs: readonly CreateNotificationInput[]): Promise<number> {
    if (inputs.length === 0) {
      return 0;
    }

    const result = await this.database.notification.createMany({
      data: inputs.map((input): Prisma.NotificationCreateManyInput => ({
        recipientId: input.recipientId,
        ...(input.appointmentId === undefined ? {} : { appointmentId: input.appointmentId }),
        type: input.type,
        channel: input.channel,
        title: input.title,
        message: input.message,
        ...(input.actorId === undefined ? {} : { createdBy: input.actorId, updatedBy: input.actorId }),
      })),
    });

    return result.count;
  }
}
