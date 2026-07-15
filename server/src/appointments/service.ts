import { AppointmentStatus, LLMSummaryType, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types.js';
import type { PaginationMeta } from '../common/pagination.js';
import { toPaginationMeta, toPaginationOptions } from '../common/pagination.js';
import type { AiService } from '../ai/service.js';
import type { CalendarService } from '../calendar/service.js';
import { logger } from '../config/logger.js';
import type { EmailService } from '../email/service.js';
import { ApplicationError } from '../errors/application-error.js';
import type { BackgroundJobsService } from '../jobs/service.js';
import type { NotificationsService } from '../notifications/service.js';
import type { AppointmentRecord, AppointmentsRepository } from './repository.js';
import { findSummaryByType } from './repository.js';
import type {
  AppointmentListQuery,
  BookAppointmentInput,
  CancelAppointmentInput,
  RescheduleAppointmentInput,
  UpdateAppointmentInput,
} from './validation.js';

export type AppointmentResponse = Readonly<{
  id: string;
  doctorId: string;
  doctorEmail: string;
  doctorSpecialization: string;
  patientId: string;
  patientEmail: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancellationReason: string | null;
  symptoms: {
    symptoms: string;
    duration: string | null;
    severity: string | null;
    additionalNotes: string | null;
  } | null;
  preVisitSummary: {
    status: string;
    content: string;
    urgencyLevel: string | null;
    chiefComplaint: string | null;
    failureReason: string | null;
  } | null;
  postVisitSummary: {
    status: string;
    content: string;
    followUpGuidance: string | null;
    failureReason: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}>;

export type AppointmentListResponse = Readonly<{
  appointments: AppointmentResponse[];
  meta: PaginationMeta;
}>;

function serializeAppointment(appointment: AppointmentRecord): AppointmentResponse {
  const preVisitSummary = findSummaryByType(appointment, LLMSummaryType.PRE_VISIT);
  const postVisitSummary = findSummaryByType(appointment, LLMSummaryType.POST_VISIT);

  return {
    id: appointment.id,
    doctorId: appointment.doctorId,
    doctorEmail: appointment.doctor.user.email,
    doctorSpecialization: appointment.doctor.specialization.name,
    patientId: appointment.patientId,
    patientEmail: appointment.patient.user.email,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
    status: appointment.status,
    cancellationReason: appointment.cancellationReason,
    symptoms:
      appointment.symptoms === null
        ? null
        : {
            symptoms: appointment.symptoms.symptoms,
            duration: appointment.symptoms.duration,
            severity: appointment.symptoms.severity,
            additionalNotes: appointment.symptoms.additionalNotes,
          },
    preVisitSummary:
      preVisitSummary === null
        ? null
        : {
            status: preVisitSummary.status,
            content: preVisitSummary.content,
            urgencyLevel: preVisitSummary.urgencyLevel,
            chiefComplaint: preVisitSummary.chiefComplaint,
            failureReason: preVisitSummary.failureReason,
          },
    postVisitSummary:
      postVisitSummary === null
        ? null
        : {
            status: postVisitSummary.status,
            content: postVisitSummary.content,
            followUpGuidance: postVisitSummary.followUpGuidance,
            failureReason: postVisitSummary.failureReason,
          },
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  };
}

function isPrismaConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function isSerializableRetryFailure(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2034'
  );
}

export class AppointmentsService {
  public constructor(
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly emailService?: EmailService,
    private readonly notificationsService?: NotificationsService,
    private readonly aiService?: AiService,
    private readonly backgroundJobsService?: BackgroundJobsService,
    private readonly calendarService?: CalendarService,
  ) {}

  public async book(
    input: BookAppointmentInput,
    actor: AuthenticatedUser,
  ): Promise<AppointmentResponse> {
    if (actor.role === UserRole.DOCTOR) {
      throw new ApplicationError('Doctors cannot book appointments.', 403, 'FORBIDDEN');
    }

    const patientId = await this.resolvePatientIdForBooking(input.patientId, actor);

    try {
      const appointment = await this.appointmentsRepository.create({
        doctorId: input.doctorId,
        patientId,
        startTime: input.startTime,
        endTime: input.endTime,
        ...(input.symptomSubmission === undefined
          ? {}
          : { symptomSubmission: input.symptomSubmission }),
        actorId: actor.id,
      });

      await this.afterAppointmentBooked(appointment, actor);

      return serializeAppointment(appointment);
    } catch (error) {
      if (isPrismaConflict(error) || isSerializableRetryFailure(error)) {
        throw new ApplicationError('The selected appointment slot is already booked.', 409, 'SLOT_BOOKED');
      }

      throw error;
    }
  }

  public async list(
    query: AppointmentListQuery,
    actor: AuthenticatedUser,
  ): Promise<AppointmentListResponse> {
    const pagination = toPaginationOptions(query);
    const result = await this.appointmentsRepository.list(
      {
        ...(query.status === undefined ? {} : { status: query.status }),
        ...(query.doctorId === undefined ? {} : { doctorId: query.doctorId }),
        ...(query.patientId === undefined ? {} : { patientId: query.patientId }),
      },
      {
        userId: actor.id,
        role: actor.role,
      },
      pagination,
    );

    return {
      appointments: result.appointments.map(serializeAppointment),
      meta: toPaginationMeta(pagination, result.total),
    };
  }

  public async get(id: string, actor: AuthenticatedUser): Promise<AppointmentResponse> {
    const appointment = await this.getAuthorizedAppointment(id, actor);
    return serializeAppointment(appointment);
  }

  public async update(
    id: string,
    input: UpdateAppointmentInput,
    actor: AuthenticatedUser,
  ): Promise<AppointmentResponse> {
    if (actor.role === UserRole.PATIENT) {
      throw new ApplicationError('Patients cannot update appointment status.', 403, 'FORBIDDEN');
    }

    const appointment = await this.getAuthorizedAppointment(id, actor);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new ApplicationError('Cancelled appointments cannot be updated.', 409, 'APPOINTMENT_CANCELLED');
    }

    const updatedAppointment = await this.appointmentsRepository.updateStatus(id, {
        status: input.status,
        actorId: actor.id,
      });

    await this.afterAppointmentUpdated(updatedAppointment, actor);

    return serializeAppointment(updatedAppointment);
  }

  public async reschedule(
    id: string,
    input: RescheduleAppointmentInput,
    actor: AuthenticatedUser,
  ): Promise<AppointmentResponse> {
    const appointment = await this.getAuthorizedAppointment(id, actor);

    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.NO_SHOW
    ) {
      throw new ApplicationError(
        'This appointment cannot be rescheduled.',
        409,
        'APPOINTMENT_NOT_RESCHEDULABLE',
      );
    }

    try {
      const rescheduledAppointment = await this.appointmentsRepository.reschedule({
          appointmentId: appointment.id,
          doctorId: appointment.doctorId,
          patientId: appointment.patientId,
          startTime: input.startTime,
          endTime: input.endTime,
          actorId: actor.id,
        });

      await this.afterAppointmentRescheduled(rescheduledAppointment, actor);

      return serializeAppointment(rescheduledAppointment);
    } catch (error) {
      if (isPrismaConflict(error) || isSerializableRetryFailure(error)) {
        throw new ApplicationError('The selected appointment slot is already booked.', 409, 'SLOT_BOOKED');
      }

      throw error;
    }
  }

  public async cancel(
    id: string,
    input: CancelAppointmentInput,
    actor: AuthenticatedUser,
  ): Promise<AppointmentResponse> {
    const appointment = await this.getAuthorizedAppointment(id, actor);

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new ApplicationError('Appointment is already cancelled.', 409, 'APPOINTMENT_CANCELLED');
    }

    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new ApplicationError(
        'Completed appointments cannot be cancelled.',
        409,
        'APPOINTMENT_COMPLETED',
      );
    }

    const cancelledAppointment = await this.appointmentsRepository.cancel(id, {
        cancellationReason: input.cancellationReason,
        actorId: actor.id,
      });

    await this.afterAppointmentCancelled(cancelledAppointment, actor);

    return serializeAppointment(cancelledAppointment);
  }

  private async resolvePatientIdForBooking(
    requestedPatientId: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<string> {
    if (actor.role === UserRole.ADMIN) {
      if (requestedPatientId === undefined) {
        throw new ApplicationError('Patient id is required.', 400, 'PATIENT_ID_REQUIRED');
      }

      return requestedPatientId;
    }

    const patientProfile = await this.appointmentsRepository.findPatientProfileByUserId(actor.id);

    if (patientProfile === null) {
      throw new ApplicationError('Patient profile was not found.', 404, 'PATIENT_NOT_FOUND');
    }

    if (requestedPatientId !== undefined && requestedPatientId !== patientProfile.id) {
      throw new ApplicationError('Patients can only book for themselves.', 403, 'FORBIDDEN');
    }

    return patientProfile.id;
  }

  private async getAuthorizedAppointment(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<AppointmentRecord> {
    const appointment = await this.appointmentsRepository.findById(id);

    if (appointment === null) {
      throw new ApplicationError('Appointment was not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (actor.role === UserRole.ADMIN) {
      return appointment;
    }

    if (actor.role === UserRole.DOCTOR) {
      const doctorProfile = await this.appointmentsRepository.findDoctorProfileByUserId(actor.id);

      if (doctorProfile?.id === appointment.doctorId) {
        return appointment;
      }
    }

    if (actor.role === UserRole.PATIENT) {
      const patientProfile = await this.appointmentsRepository.findPatientProfileByUserId(actor.id);

      if (patientProfile?.id === appointment.patientId) {
        return appointment;
      }
    }

    throw new ApplicationError('You are not allowed to access this appointment.', 403, 'FORBIDDEN');
  }

  private async afterAppointmentBooked(
    appointment: AppointmentRecord,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await Promise.all([
      this.runSideEffect('appointment booked email', appointment.id, () =>
        this.emailService?.sendAppointmentBooked(appointment, actor.id),
      ),
      this.runSideEffect('appointment booked notification', appointment.id, () =>
        this.notificationsService?.createAppointmentBooked(appointment, actor.id),
      ),
      this.runSideEffect('appointment reminder notification', appointment.id, () =>
        this.notificationsService?.createAppointmentReminder(appointment, actor.id),
      ),
      this.runSideEffect('pre-visit AI summary', appointment.id, () =>
        this.aiService?.generatePreVisitSummary(appointment.id, actor),
      ),
      this.runSideEffect('pre-visit AI summary job', appointment.id, () =>
        this.backgroundJobsService?.enqueueAiSummary(appointment.id, actor.id, 'PRE_VISIT'),
      ),
      this.runSideEffect('appointment booked email job', appointment.id, () =>
        this.backgroundJobsService?.enqueueEmailDelivery(appointment.id, actor.id, 'APPOINTMENT_BOOKED'),
      ),
      this.runSideEffect('appointment reminder job', appointment.id, () =>
        this.backgroundJobsService?.enqueueAppointmentReminder(
          appointment.id,
          actor.id,
          reminderScheduleForAppointment(appointment.startTime),
        ),
      ),
      this.runSideEffect('calendar event creation', appointment.id, () =>
        this.calendarService?.createEventForAppointment(appointment, actor.id),
      ),
      this.runSideEffect('calendar creation job', appointment.id, () =>
        this.backgroundJobsService?.enqueueCalendarSync(appointment.id, actor.id, 'CREATE'),
      ),
    ]);
  }

  private async afterAppointmentUpdated(
    appointment: AppointmentRecord,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      return;
    }

    await this.runSideEffect('post-visit AI summary', appointment.id, () =>
      this.aiService?.generatePostVisitSummary(appointment.id, actor),
    );
    await this.runSideEffect('post-visit AI summary job', appointment.id, () =>
      this.backgroundJobsService?.enqueueAiSummary(appointment.id, actor.id, 'POST_VISIT'),
    );
  }

  private async afterAppointmentRescheduled(
    appointment: AppointmentRecord,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await Promise.all([
      this.runSideEffect('appointment rescheduled email', appointment.id, () =>
        this.emailService?.sendAppointmentRescheduled(appointment, actor.id),
      ),
      this.runSideEffect('appointment rescheduled notification', appointment.id, () =>
        this.notificationsService?.createAppointmentRescheduled(appointment, actor.id),
      ),
      this.runSideEffect('appointment reminder notification', appointment.id, () =>
        this.notificationsService?.createAppointmentReminder(appointment, actor.id),
      ),
      this.runSideEffect('appointment rescheduled email job', appointment.id, () =>
        this.backgroundJobsService?.enqueueEmailDelivery(appointment.id, actor.id, 'APPOINTMENT_RESCHEDULED'),
      ),
      this.runSideEffect('appointment reminder job', appointment.id, () =>
        this.backgroundJobsService?.enqueueAppointmentReminder(
          appointment.id,
          actor.id,
          reminderScheduleForAppointment(appointment.startTime),
        ),
      ),
      this.runSideEffect('calendar event update', appointment.id, () =>
        this.calendarService?.updateEventForAppointment(appointment, actor.id),
      ),
      this.runSideEffect('calendar update job', appointment.id, () =>
        this.backgroundJobsService?.enqueueCalendarSync(appointment.id, actor.id, 'UPDATE'),
      ),
    ]);
  }

  private async afterAppointmentCancelled(
    appointment: AppointmentRecord,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await Promise.all([
      this.runSideEffect('appointment cancelled email', appointment.id, () =>
        this.emailService?.sendAppointmentCancelled(appointment, actor.id),
      ),
      this.runSideEffect('appointment cancelled notification', appointment.id, () =>
        this.notificationsService?.createAppointmentCancelled(appointment, actor.id),
      ),
      this.runSideEffect('appointment cancelled email job', appointment.id, () =>
        this.backgroundJobsService?.enqueueEmailDelivery(appointment.id, actor.id, 'APPOINTMENT_CANCELLED'),
      ),
      this.runSideEffect('calendar event deletion', appointment.id, () =>
        this.calendarService?.deleteEventForAppointment(appointment, actor.id),
      ),
      this.runSideEffect('calendar deletion job', appointment.id, () =>
        this.backgroundJobsService?.enqueueCalendarSync(appointment.id, actor.id, 'DELETE'),
      ),
    ]);
  }

  private async runSideEffect<T>(
    label: string,
    appointmentId: string,
    operation: () => Promise<T> | undefined,
  ): Promise<void> {
    try {
      await operation();
    } catch (error) {
      logger.warn('Appointment side effect failed.', {
        appointmentId,
        sideEffect: label,
        error,
      });
    }
  }
}

function reminderScheduleForAppointment(startTime: Date): Date {
  const reminderTime = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
  return reminderTime.getTime() > Date.now() ? reminderTime : new Date();
}
