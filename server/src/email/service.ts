import { EmailDeliveryStatus, type PrismaClient } from '@prisma/client';

import type { AppointmentRecord } from '../appointments/repository.js';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';

type EmailTemplateType = 'APPOINTMENT_BOOKED' | 'APPOINTMENT_RESCHEDULED' | 'APPOINTMENT_CANCELLED';

type AppointmentEmail = Readonly<{
  recipient: string;
  templateType: EmailTemplateType;
  subject: string;
  body: string;
}>;

export class EmailService {
  public constructor(private readonly database: PrismaClient) {}

  public async sendAppointmentBooked(appointment: AppointmentRecord, actorId: string): Promise<void> {
    await this.sendAppointmentEmails(appointment, actorId, 'APPOINTMENT_BOOKED');
  }

  public async sendAppointmentRescheduled(appointment: AppointmentRecord, actorId: string): Promise<void> {
    await this.sendAppointmentEmails(appointment, actorId, 'APPOINTMENT_RESCHEDULED');
  }

  public async sendAppointmentCancelled(appointment: AppointmentRecord, actorId: string): Promise<void> {
    await this.sendAppointmentEmails(appointment, actorId, 'APPOINTMENT_CANCELLED');
  }

  private async sendAppointmentEmails(
    appointment: AppointmentRecord,
    actorId: string,
    templateType: EmailTemplateType,
  ): Promise<void> {
    const emails = [
      this.buildAppointmentEmail(appointment.patient.user.email, appointment, templateType),
      this.buildAppointmentEmail(appointment.doctor.user.email, appointment, templateType),
    ];

    await Promise.all(emails.map((email) => this.persistDeliveryAttempt(appointment.id, email, actorId)));
  }

  private async persistDeliveryAttempt(
    appointmentId: string,
    email: AppointmentEmail,
    actorId: string,
  ): Promise<void> {
    try {
      const deliveryResult = await this.deliver(email);

      await this.database.emailLog.create({
        data: {
          appointmentId,
          recipient: email.recipient,
          templateType: email.templateType,
          status: deliveryResult.ok ? EmailDeliveryStatus.SENT : EmailDeliveryStatus.FAILED,
          sentAt: deliveryResult.ok ? new Date() : null,
          failureReason: deliveryResult.ok ? null : deliveryResult.failureReason,
          retryCount: deliveryResult.ok ? 0 : 1,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
    } catch (error) {
      logger.warn('Email delivery attempt could not be persisted.', {
        appointmentId,
        recipient: email.recipient,
        templateType: email.templateType,
        error,
      });
    }
  }

  private deliver(email: AppointmentEmail): Promise<Readonly<{ ok: true } | { ok: false; failureReason: string }>> {
    if (
      environment.SMTP_HOST === undefined ||
      environment.SMTP_USER === undefined ||
      environment.SMTP_PASSWORD === undefined ||
      environment.EMAIL_FROM === undefined
    ) {
      return Promise.resolve({
        ok: false,
        failureReason: 'SMTP delivery is not configured.',
      });
    }

    logger.info('Email delivery provider is configured; delivery is recorded for retry-capable processing.', {
      recipient: email.recipient,
      templateType: email.templateType,
      smtpHost: environment.SMTP_HOST,
      smtpPort: environment.SMTP_PORT,
      from: environment.EMAIL_FROM,
      subject: email.subject,
    });

    return Promise.resolve({
      ok: false,
      failureReason: 'SMTP transport package is not installed in this phase.',
    });
  }

  private buildAppointmentEmail(
    recipient: string,
    appointment: AppointmentRecord,
    templateType: EmailTemplateType,
  ): AppointmentEmail {
    const appointmentTime = appointment.startTime.toISOString();

    switch (templateType) {
      case 'APPOINTMENT_BOOKED':
        return {
          recipient,
          templateType,
          subject: 'Appointment booked',
          body: `Your appointment is booked for ${appointmentTime}.`,
        };
      case 'APPOINTMENT_RESCHEDULED':
        return {
          recipient,
          templateType,
          subject: 'Appointment rescheduled',
          body: `Your appointment was rescheduled to ${appointmentTime}.`,
        };
      case 'APPOINTMENT_CANCELLED':
        return {
          recipient,
          templateType,
          subject: 'Appointment cancelled',
          body: `Your appointment scheduled for ${appointmentTime} was cancelled.`,
        };
    }
  }
}
