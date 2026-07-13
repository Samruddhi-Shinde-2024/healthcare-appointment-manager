import { NotificationChannel, NotificationType } from '@prisma/client';

import type { AppointmentRecord } from '../appointments/repository.js';
import { logger } from '../config/logger.js';
import type { NotificationsRepository } from './repository.js';

export class NotificationsService {
  public constructor(private readonly notificationsRepository: NotificationsRepository) {}

  public async createAppointmentBooked(appointment: AppointmentRecord, actorId: string): Promise<void> {
    await this.createAppointmentNotifications({
      appointment,
      actorId,
      type: NotificationType.BOOKING_CONFIRMATION,
      title: 'Appointment booked',
      message: `Your appointment is booked for ${appointment.startTime.toISOString()}.`,
    });
  }

  public async createAppointmentRescheduled(appointment: AppointmentRecord, actorId: string): Promise<void> {
    await this.createAppointmentNotifications({
      appointment,
      actorId,
      type: NotificationType.BOOKING_CONFIRMATION,
      title: 'Appointment rescheduled',
      message: `Your appointment was rescheduled to ${appointment.startTime.toISOString()}.`,
    });
  }

  public async createAppointmentCancelled(appointment: AppointmentRecord, actorId: string): Promise<void> {
    await this.createAppointmentNotifications({
      appointment,
      actorId,
      type: NotificationType.CANCELLATION,
      title: 'Appointment cancelled',
      message: `Your appointment scheduled for ${appointment.startTime.toISOString()} was cancelled.`,
    });
  }

  public async createAppointmentReminder(appointment: AppointmentRecord, actorId?: string): Promise<void> {
    await this.createAppointmentNotifications({
      appointment,
      ...(actorId === undefined ? {} : { actorId }),
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Appointment reminder',
      message: `Reminder: appointment starts at ${appointment.startTime.toISOString()}.`,
    });
  }

  private async createAppointmentNotifications(input: Readonly<{
    appointment: AppointmentRecord;
    actorId?: string;
    type: NotificationType;
    title: string;
    message: string;
  }>): Promise<void> {
    try {
      await this.notificationsRepository.createMany([
        {
          recipientId: input.appointment.patient.userId,
          appointmentId: input.appointment.id,
          type: input.type,
          channel: NotificationChannel.IN_APP,
          title: input.title,
          message: input.message,
          ...(input.actorId === undefined ? {} : { actorId: input.actorId }),
        },
        {
          recipientId: input.appointment.doctor.userId,
          appointmentId: input.appointment.id,
          type: input.type,
          channel: NotificationChannel.IN_APP,
          title: input.title,
          message: input.message,
          ...(input.actorId === undefined ? {} : { actorId: input.actorId }),
        },
      ]);
    } catch (error) {
      logger.warn('Notification creation failed.', {
        appointmentId: input.appointment.id,
        notificationType: input.type,
        error,
      });
    }
  }
}
