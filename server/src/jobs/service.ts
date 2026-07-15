import { BackgroundJobType, type Prisma, type PrismaClient } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types.js';
import { logger } from '../config/logger.js';
import type { AiService } from '../ai/service.js';
import type { EmailService, EmailTemplateType } from '../email/service.js';
import type { BackgroundJobRecord, BackgroundJobsRepository } from './repository.js';

export type ProcessJobsResponse = Readonly<{
  processed: number;
  completed: number;
  failed: number;
}>;

export class BackgroundJobsService {
  public constructor(
    private readonly backgroundJobsRepository: BackgroundJobsRepository,
    private readonly database?: PrismaClient,
    private readonly emailService?: EmailService,
    private readonly aiService?: AiService,
  ) {}

  public enqueueAiSummary(appointmentId: string, actorId: string, summaryType: 'PRE_VISIT' | 'POST_VISIT'): Promise<BackgroundJobRecord> {
    return this.enqueue({
      type: BackgroundJobType.LLM_SUMMARY,
      queueName: 'ai-summary',
      jobKey: `${appointmentId}:${summaryType}`,
      appointmentId,
      actorId,
      payload: {
        appointmentId,
        summaryType,
      },
    });
  }

  public enqueueEmailDelivery(appointmentId: string, actorId: string, templateType: string): Promise<BackgroundJobRecord> {
    return this.enqueue({
      type: BackgroundJobType.EMAIL_DELIVERY,
      queueName: 'email-delivery',
      jobKey: `${appointmentId}:${templateType}`,
      appointmentId,
      actorId,
      payload: {
        appointmentId,
        templateType,
      },
    });
  }

  public enqueueAppointmentReminder(
    appointmentId: string,
    actorId: string,
    scheduledFor: Date,
  ): Promise<BackgroundJobRecord> {
    return this.enqueue({
      type: BackgroundJobType.NOTIFICATION_DELIVERY,
      queueName: 'appointment-reminders',
      jobKey: appointmentId,
      appointmentId,
      actorId,
      scheduledFor,
      payload: {
        appointmentId,
      },
    });
  }

  public enqueueCalendarSync(
    appointmentId: string,
    actorId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    calendarEventId?: string,
  ): Promise<BackgroundJobRecord> {
    return this.enqueue({
      type: BackgroundJobType.CALENDAR_SYNC,
      queueName: 'calendar-sync',
      jobKey: `${appointmentId}:${action}`,
      appointmentId,
      actorId,
      ...(calendarEventId === undefined ? {} : { calendarEventId }),
      payload: {
        appointmentId,
        action,
      },
    });
  }

  public enqueueMedicationReminder(
    medicationReminderId: string,
    actorId: string,
    scheduledFor: Date,
  ): Promise<BackgroundJobRecord> {
    return this.enqueue({
      type: BackgroundJobType.MEDICATION_REMINDER,
      queueName: 'medication-reminders',
      jobKey: medicationReminderId,
      medicationReminderId,
      actorId,
      scheduledFor,
      payload: {
        medicationReminderId,
      },
    });
  }

  public async processDueJobs(limit = 25): Promise<ProcessJobsResponse> {
    const jobs = await this.backgroundJobsRepository.findRunnable(limit, new Date());
    let completed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        const runningJob = await this.backgroundJobsRepository.markRunning(job.id);
        await this.processJob(runningJob);
        await this.backgroundJobsRepository.markCompleted(job.id);
        completed += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Background job processing failed.';
        await this.backgroundJobsRepository.markFailed(job, message);
        logger.warn('Background job processing failed.', {
          jobId: job.id,
          queueName: job.queueName,
          error,
        });
      }
    }

    return {
      processed: jobs.length,
      completed,
      failed,
    };
  }

  private enqueue(input: Readonly<{
    type: BackgroundJobType;
    queueName: string;
    jobKey: string;
    payload: Prisma.InputJsonValue;
    actorId?: string;
    appointmentId?: string;
    medicationReminderId?: string;
    calendarEventId?: string;
    scheduledFor?: Date;
  }>): Promise<BackgroundJobRecord> {
    return this.backgroundJobsRepository.enqueue(input);
  }

  private async processJob(job: BackgroundJobRecord): Promise<void> {
    switch (job.type) {
      case BackgroundJobType.EMAIL_DELIVERY:
        await this.processAppointmentEmailJob(job);
        return;
      case BackgroundJobType.NOTIFICATION_DELIVERY:
        await this.processAppointmentReminderJob(job);
        return;
      case BackgroundJobType.MEDICATION_REMINDER:
        await this.processMedicationReminderJob(job);
        return;
      case BackgroundJobType.LLM_SUMMARY:
        await this.processAiSummaryJob(job);
        return;
      case BackgroundJobType.CALENDAR_SYNC:
      case BackgroundJobType.CLEANUP:
        logger.info('Background job has no direct processor in this runtime.', {
          jobId: job.id,
          jobType: job.type,
        });
        return;
    }
  }

  private async processAppointmentEmailJob(job: BackgroundJobRecord): Promise<void> {
    if (this.emailService === undefined) {
      throw new Error('Email service is not configured for background jobs.');
    }

    const appointmentId = readString(job.payload, 'appointmentId') ?? job.appointmentId;
    const templateType = readEmailTemplateType(job.payload);

    if (appointmentId === null || templateType === null || job.actorId === null) {
      throw new Error('Email delivery job payload is invalid.');
    }

    await this.emailService.sendAppointmentEmailById(appointmentId, job.actorId, templateType);
  }

  private async processAppointmentReminderJob(job: BackgroundJobRecord): Promise<void> {
    if (this.emailService === undefined) {
      throw new Error('Email service is not configured for appointment reminder jobs.');
    }

    const appointmentId = readString(job.payload, 'appointmentId') ?? job.appointmentId;

    if (appointmentId === null || job.actorId === null) {
      throw new Error('Appointment reminder job payload is invalid.');
    }

    await this.emailService.sendAppointmentEmailById(appointmentId, job.actorId, 'APPOINTMENT_REMINDER');
  }

  private async processMedicationReminderJob(job: BackgroundJobRecord): Promise<void> {
    if (this.emailService === undefined) {
      throw new Error('Email service is not configured for medication reminder jobs.');
    }

    const medicationReminderId = readString(job.payload, 'medicationReminderId') ?? job.medicationReminderId;

    if (medicationReminderId === null || job.actorId === null) {
      throw new Error('Medication reminder job payload is invalid.');
    }

    await this.emailService.sendMedicationReminderById(medicationReminderId, job.actorId);
  }

  private async processAiSummaryJob(job: BackgroundJobRecord): Promise<void> {
    if (this.aiService === undefined || this.database === undefined) {
      throw new Error('AI service is not configured for background jobs.');
    }

    const appointmentId = readString(job.payload, 'appointmentId') ?? job.appointmentId;
    const summaryType = readString(job.payload, 'summaryType');

    if (
      appointmentId === null ||
      job.actorId === null ||
      (summaryType !== 'PRE_VISIT' && summaryType !== 'POST_VISIT')
    ) {
      throw new Error('AI summary job payload is invalid.');
    }

    const actor = await this.findActor(job.actorId);

    if (summaryType === 'PRE_VISIT') {
      await this.aiService.generatePreVisitSummary(appointmentId, actor);
      return;
    }

    await this.aiService.generatePostVisitSummary(appointmentId, actor);
  }

  private async findActor(actorId: string): Promise<AuthenticatedUser> {
    if (this.database === undefined) {
      throw new Error('Database client is not configured for background jobs.');
    }

    const actor = await this.database.user.findUnique({
      where: {
        id: actorId,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        role: true,
      },
    });

    if (actor === null) {
      throw new Error('Background job actor was not found.');
    }

    return actor;
  }
}

function readString(payload: Prisma.JsonValue, key: string): string | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return null;
  }

  const value = payload[key];
  return typeof value === 'string' ? value : null;
}

function readEmailTemplateType(payload: Prisma.JsonValue): EmailTemplateType | null {
  const value = readString(payload, 'templateType');

  switch (value) {
    case 'APPOINTMENT_BOOKED':
    case 'APPOINTMENT_RESCHEDULED':
    case 'APPOINTMENT_CANCELLED':
    case 'APPOINTMENT_REMINDER':
    case 'MEDICATION_REMINDER':
      return value;
    default:
      return null;
  }
}
