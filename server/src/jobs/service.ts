import { BackgroundJobType, type Prisma } from '@prisma/client';

import { logger } from '../config/logger.js';
import type { BackgroundJobRecord, BackgroundJobsRepository } from './repository.js';

export type ProcessJobsResponse = Readonly<{
  processed: number;
  completed: number;
  failed: number;
}>;

export class BackgroundJobsService {
  public constructor(private readonly backgroundJobsRepository: BackgroundJobsRepository) {}

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
        await this.backgroundJobsRepository.markRunning(job.id);
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
}
