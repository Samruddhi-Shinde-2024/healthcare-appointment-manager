import { EmailDeliveryStatus, ReminderStatus, type PrismaClient } from '@prisma/client';
import { createTransport } from 'nodemailer';

import type { AppointmentRecord } from '../appointments/repository.js';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';

export type EmailTemplateType =
  | 'APPOINTMENT_BOOKED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_REMINDER'
  | 'MEDICATION_REMINDER';

type EmailDeliveryResult = Readonly<{ ok: true } | { ok: false; failureReason: string }>;

type AppointmentEmailContext = Readonly<{
  id: string;
  startTime: Date;
  endTime: Date;
  doctor: {
    user: {
      email: string;
    };
  };
  patient: {
    user: {
      email: string;
    };
  };
}>;

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

  public async sendAppointmentReminder(appointment: AppointmentRecord, actorId: string): Promise<void> {
    await this.sendAppointmentEmails(appointment, actorId, 'APPOINTMENT_REMINDER');
  }

  public async sendAppointmentEmailById(
    appointmentId: string,
    actorId: string,
    templateType: EmailTemplateType,
  ): Promise<void> {
    const appointment = await this.database.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        doctor: {
          include: {
            user: true,
          },
        },
        patient: {
          include: {
            user: true,
          },
        },
      },
    });

    if (appointment === null) {
      logger.warn('Email job skipped because appointment was not found.', {
        appointmentId,
        templateType,
      });
      return;
    }

    await this.sendAppointmentEmails(appointment, actorId, templateType);
  }

  public async sendMedicationReminderById(reminderId: string, actorId: string): Promise<void> {
    const reminder = await this.database.medicationReminder.findUnique({
      where: {
        id: reminderId,
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        prescription: {
          include: {
            appointment: {
              include: {
                doctor: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (reminder === null || reminder.status === ReminderStatus.CANCELLED) {
      return;
    }

    const deliveryResult = await this.persistDeliveryAttempt(
      reminder.prescription.appointmentId,
      {
        recipient: reminder.patient.user.email,
        templateType: 'MEDICATION_REMINDER',
        subject: 'Medication reminder',
        body: [
          'This is a reminder to follow your medication schedule.',
          `Scheduled reminder time: ${reminder.scheduledAt.toISOString()}.`,
          `Doctor: ${reminder.prescription.appointment.doctor.user.email}.`,
        ].join('\n'),
      },
      actorId,
    );

    await this.database.medicationReminder.update({
      where: {
        id: reminder.id,
      },
      data: {
        status: deliveryResult.ok ? ReminderStatus.SENT : ReminderStatus.FAILED,
        sentAt: deliveryResult.ok ? new Date() : null,
        retryCount: deliveryResult.ok ? reminder.retryCount : { increment: 1 },
        updatedBy: actorId,
      },
    });
  }

  private async sendAppointmentEmails(
    appointment: AppointmentEmailContext,
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
  ): Promise<EmailDeliveryResult> {
    const deliveryResult = await this.deliver(email);

    try {
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

    return deliveryResult;
  }

  private async deliver(email: AppointmentEmail): Promise<EmailDeliveryResult> {
    if (
      environment.SMTP_HOST === undefined ||
      environment.SMTP_USER === undefined ||
      environment.SMTP_PASSWORD === undefined ||
      environment.EMAIL_FROM === undefined
    ) {
      return {
        ok: false,
        failureReason: 'SMTP delivery is not configured.',
      };
    }

    try {
      const transporter = createTransport({
        host: environment.SMTP_HOST,
        port: environment.SMTP_PORT,
        secure: environment.SMTP_PORT === 465,
        auth: {
          user: environment.SMTP_USER,
          pass: environment.SMTP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: environment.EMAIL_FROM,
        to: email.recipient,
        subject: email.subject,
        text: email.body,
      });

      return {
        ok: true,
      };
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'SMTP delivery failed.';
      logger.warn('SMTP email delivery failed.', {
        recipient: email.recipient,
        templateType: email.templateType,
        error,
      });

      return {
        ok: false,
        failureReason,
      };
    }
  }

  private buildAppointmentEmail(
    recipient: string,
    appointment: AppointmentEmailContext,
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
      case 'APPOINTMENT_REMINDER':
        return {
          recipient,
          templateType,
          subject: 'Appointment reminder',
          body: `Reminder: your appointment starts at ${appointmentTime}.`,
        };
      case 'MEDICATION_REMINDER':
        return {
          recipient,
          templateType,
          subject: 'Medication reminder',
          body: 'This is a reminder to follow your medication schedule.',
        };
    }
  }
}
