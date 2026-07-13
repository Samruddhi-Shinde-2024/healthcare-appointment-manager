import {
  BackgroundJobStatus,
  type BackgroundJobType,
  type Prisma,
  type PrismaClient,
} from '@prisma/client';

export type BackgroundJobRecord = Prisma.BackgroundJobGetPayload<object>;

export type EnqueueJobInput = Readonly<{
  type: BackgroundJobType;
  queueName: string;
  jobKey: string;
  payload: Prisma.InputJsonValue;
  actorId?: string;
  appointmentId?: string;
  notificationId?: string;
  emailLogId?: string;
  medicationReminderId?: string;
  calendarEventId?: string;
  llmSummaryId?: string;
  scheduledFor?: Date;
  maxAttempts?: number;
}>;

export class BackgroundJobsRepository {
  public constructor(private readonly database: PrismaClient) {}

  public enqueue(input: EnqueueJobInput): Promise<BackgroundJobRecord> {
    const createData = {
      type: input.type,
      status: BackgroundJobStatus.QUEUED,
      queueName: input.queueName,
      jobKey: input.jobKey,
      payload: input.payload,
      maxAttempts: input.maxAttempts ?? 3,
      ...(input.scheduledFor === undefined ? {} : { scheduledFor: input.scheduledFor }),
      ...(input.actorId === undefined ? {} : { actorId: input.actorId, createdBy: input.actorId, updatedBy: input.actorId }),
      ...(input.appointmentId === undefined ? {} : { appointmentId: input.appointmentId }),
      ...(input.notificationId === undefined ? {} : { notificationId: input.notificationId }),
      ...(input.emailLogId === undefined ? {} : { emailLogId: input.emailLogId }),
      ...(input.medicationReminderId === undefined
        ? {}
        : { medicationReminderId: input.medicationReminderId }),
      ...(input.calendarEventId === undefined ? {} : { calendarEventId: input.calendarEventId }),
      ...(input.llmSummaryId === undefined ? {} : { llmSummaryId: input.llmSummaryId }),
    } satisfies Prisma.BackgroundJobUncheckedCreateInput;

    return this.database.backgroundJob.upsert({
      where: {
        queueName_jobKey: {
          queueName: input.queueName,
          jobKey: input.jobKey,
        },
      },
      create: createData,
      update: {
        payload: input.payload,
        status: BackgroundJobStatus.QUEUED,
        scheduledFor: input.scheduledFor ?? null,
        lastError: null,
        ...(input.actorId === undefined ? {} : { updatedBy: input.actorId }),
      },
    });
  }

  public findRunnable(limit: number, now: Date): Promise<BackgroundJobRecord[]> {
    return this.database.backgroundJob.findMany({
      where: {
        status: {
          in: [BackgroundJobStatus.QUEUED, BackgroundJobStatus.RETRYING],
        },
        OR: [
          {
            scheduledFor: null,
          },
          {
            scheduledFor: {
              lte: now,
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });
  }

  public markRunning(id: string): Promise<BackgroundJobRecord> {
    return this.database.backgroundJob.update({
      where: {
        id,
      },
      data: {
        status: BackgroundJobStatus.ACTIVE,
        processedAt: new Date(),
        attempts: {
          increment: 1,
        },
      },
    });
  }

  public markCompleted(id: string): Promise<BackgroundJobRecord> {
    return this.database.backgroundJob.update({
      where: {
        id,
      },
      data: {
        status: BackgroundJobStatus.COMPLETED,
        completedAt: new Date(),
        lastError: null,
      },
    });
  }

  public markFailed(
    job: Pick<BackgroundJobRecord, 'id' | 'attempts' | 'maxAttempts'>,
    errorMessage: string,
  ): Promise<BackgroundJobRecord> {
    const nextAttempts = job.attempts + 1;
    const shouldRetry = nextAttempts < job.maxAttempts;

    return this.database.backgroundJob.update({
      where: {
        id: job.id,
      },
      data: {
        status: shouldRetry ? BackgroundJobStatus.RETRYING : BackgroundJobStatus.FAILED,
        failedAt: shouldRetry ? null : new Date(),
        lastError: errorMessage,
        scheduledFor: shouldRetry ? new Date(Date.now() + 60_000 * nextAttempts) : null,
      },
    });
  }
}
