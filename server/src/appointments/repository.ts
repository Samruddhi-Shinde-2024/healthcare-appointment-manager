import {
  AppointmentStatus,
  DayOfWeek,
  type Prisma,
  type PrismaClient,
  type UserRole,
} from '@prisma/client';

import type { PaginationOptions } from '../common/pagination.js';
import { toSkip } from '../common/pagination.js';
import { ApplicationError } from '../errors/application-error.js';

const appointmentInclude = {
  doctor: {
    include: {
      specialization: true,
      user: true,
    },
  },
  patient: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRecord = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

export type AppointmentActorContext = Readonly<{
  userId: string;
  role: UserRole;
}>;

export type AppointmentListFilters = Readonly<{
  status?: AppointmentStatus;
  doctorId?: string;
  patientId?: string;
}>;

export type BookingValidationContext = Readonly<{
  doctor: Prisma.DoctorProfileGetPayload<{
    include: {
      user: true;
      availabilities: true;
      leaves: true;
    };
  }>;
  patient: Prisma.PatientProfileGetPayload<{
    include: {
      user: true;
    };
  }>;
  conflictingAppointment: { id: string } | null;
}>;

export class AppointmentsRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findPatientProfileByUserId(userId: string): Promise<{ id: string } | null> {
    return this.database.patientProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });
  }

  public findDoctorProfileByUserId(userId: string): Promise<{ id: string } | null> {
    return this.database.doctorProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });
  }

  public findById(id: string): Promise<AppointmentRecord | null> {
    return this.database.appointment.findUnique({
      where: {
        id,
      },
      include: appointmentInclude,
    });
  }

  public async list(
    filters: AppointmentListFilters,
    actor: AppointmentActorContext,
    pagination: PaginationOptions,
  ): Promise<Readonly<{ appointments: AppointmentRecord[]; total: number }>> {
    const where = await this.toScopedWhereInput(filters, actor);

    const [appointments, total] = await this.database.$transaction([
      this.database.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: {
          startTime: 'desc',
        },
        skip: toSkip(pagination),
        take: pagination.pageSize,
      }),
      this.database.appointment.count({
        where,
      }),
    ]);

    return {
      appointments,
      total,
    };
  }

  public async create(
    input: Readonly<{
      doctorId: string;
      patientId: string;
      startTime: Date;
      endTime: Date;
      actorId: string;
    }>,
  ): Promise<AppointmentRecord> {
    return this.database.$transaction(
      async (transaction) => {
        return this.createInsideTransaction(transaction, input);
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  public async reschedule(
    input: Readonly<{
      appointmentId: string;
      doctorId: string;
      patientId: string;
      startTime: Date;
      endTime: Date;
      actorId: string;
    }>,
  ): Promise<AppointmentRecord> {
    return this.database.$transaction(
      async (transaction) => {
        await this.validateBookingInsideTransaction(transaction, {
          doctorId: input.doctorId,
          patientId: input.patientId,
          startTime: input.startTime,
          endTime: input.endTime,
          excludedAppointmentId: input.appointmentId,
        });

        return transaction.appointment.update({
          where: {
            id: input.appointmentId,
          },
          data: {
            startTime: input.startTime,
            endTime: input.endTime,
            status: AppointmentStatus.CONFIRMED,
            holdExpiresAt: null,
            cancellationReason: null,
            updatedBy: input.actorId,
          },
          include: appointmentInclude,
        });
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  public updateStatus(
    id: string,
    input: Readonly<{
      status: AppointmentStatus;
      actorId: string;
    }>,
  ): Promise<AppointmentRecord> {
    return this.database.appointment.update({
      where: {
        id,
      },
      data: {
        status: input.status,
        updatedBy: input.actorId,
      },
      include: appointmentInclude,
    });
  }

  public cancel(
    id: string,
    input: Readonly<{
      cancellationReason: string;
      actorId: string;
    }>,
  ): Promise<AppointmentRecord> {
    return this.database.appointment.update({
      where: {
        id,
      },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: input.cancellationReason,
        updatedBy: input.actorId,
      },
      include: appointmentInclude,
    });
  }

  public async getBookingValidationContext(
    input: Readonly<{
      doctorId: string;
      patientId: string;
      startTime: Date;
      endTime: Date;
      excludedAppointmentId?: string;
    }>,
  ): Promise<BookingValidationContext> {
    return this.database.$transaction(async (transaction) =>
      this.validateBookingInsideTransaction(transaction, input),
    );
  }

  private async createInsideTransaction(
    transaction: Prisma.TransactionClient,
    input: Readonly<{
      doctorId: string;
      patientId: string;
      startTime: Date;
      endTime: Date;
      actorId: string;
    }>,
  ): Promise<AppointmentRecord> {
    await this.validateBookingInsideTransaction(transaction, input);

    return transaction.appointment.create({
      data: {
        doctorId: input.doctorId,
        patientId: input.patientId,
        startTime: input.startTime,
        endTime: input.endTime,
        status: AppointmentStatus.CONFIRMED,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
      include: appointmentInclude,
    });
  }

  private async validateBookingInsideTransaction(
    transaction: Prisma.TransactionClient,
    input: Readonly<{
      doctorId: string;
      patientId: string;
      startTime: Date;
      endTime: Date;
      excludedAppointmentId?: string;
    }>,
  ): Promise<BookingValidationContext> {
    const [doctor, patient, conflictingAppointment] = await Promise.all([
      transaction.doctorProfile.findUnique({
        where: {
          id: input.doctorId,
        },
        include: {
          user: true,
          availabilities: {
            where: {
              isActive: true,
            },
          },
          leaves: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
      }),
      transaction.patientProfile.findUnique({
        where: {
          id: input.patientId,
        },
        include: {
          user: true,
        },
      }),
      transaction.appointment.findFirst({
        where: {
          doctorId: input.doctorId,
          startTime: input.startTime,
          ...(input.excludedAppointmentId === undefined
            ? {}
            : {
                id: {
                  not: input.excludedAppointmentId,
                },
              }),
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (doctor === null) {
      throw new ApplicationError('Doctor was not found.', 404, 'DOCTOR_NOT_FOUND');
    }

    if (patient === null) {
      throw new ApplicationError('Patient was not found.', 404, 'PATIENT_NOT_FOUND');
    }

    if (!doctor.isActive || !doctor.user.isActive) {
      throw new ApplicationError('Doctor is inactive.', 409, 'DOCTOR_INACTIVE');
    }

    if (!patient.user.isActive) {
      throw new ApplicationError('Patient is inactive.', 409, 'PATIENT_INACTIVE');
    }

    if (conflictingAppointment !== null) {
      throw new ApplicationError('The selected appointment slot is already booked.', 409, 'SLOT_BOOKED');
    }

    if (doctor.leaves.some((leave) => appointmentDateFallsWithinLeave(input.startTime, leave))) {
      throw new ApplicationError('Doctor is on leave for the selected date.', 409, 'DOCTOR_ON_LEAVE');
    }

    if (!doctor.availabilities.some((availability) => appointmentFitsAvailability(input, availability))) {
      throw new ApplicationError(
        'Appointment is outside doctor availability.',
        409,
        'OUTSIDE_DOCTOR_AVAILABILITY',
      );
    }

    return {
      doctor,
      patient,
      conflictingAppointment,
    };
  }

  private async toScopedWhereInput(
    filters: AppointmentListFilters,
    actor: AppointmentActorContext,
  ): Promise<Prisma.AppointmentWhereInput> {
    const baseWhere: Prisma.AppointmentWhereInput = {
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.doctorId === undefined ? {} : { doctorId: filters.doctorId }),
      ...(filters.patientId === undefined ? {} : { patientId: filters.patientId }),
    };

    if (actor.role === 'ADMIN') {
      return baseWhere;
    }

    if (actor.role === 'DOCTOR') {
      const doctorProfile = await this.findDoctorProfileByUserId(actor.userId);
      return {
        ...baseWhere,
        doctorId: doctorProfile?.id ?? '00000000-0000-0000-0000-000000000000',
      };
    }

    const patientProfile = await this.findPatientProfileByUserId(actor.userId);
    return {
      ...baseWhere,
      patientId: patientProfile?.id ?? '00000000-0000-0000-0000-000000000000',
    };
  }

}

function appointmentDateFallsWithinLeave(
  appointmentStart: Date,
  leave: Readonly<{ startDate: Date; endDate: Date }>,
): boolean {
  const appointmentDate = toUtcDateKey(appointmentStart);
  return appointmentDate >= toUtcDateKey(leave.startDate) && appointmentDate <= toUtcDateKey(leave.endDate);
}

function appointmentFitsAvailability(
  input: Readonly<{ startTime: Date; endTime: Date }>,
  availability: Readonly<{
    dayOfWeek: DayOfWeek;
    startTime: Date;
    endTime: Date;
    slotDuration: number;
  }>,
): boolean {
  const appointmentDuration = differenceInMinutes(input.startTime, input.endTime);

  return (
    toDayOfWeek(input.startTime) === availability.dayOfWeek &&
    appointmentDuration === availability.slotDuration &&
    toMinutesSinceMidnight(input.startTime) >= toMinutesSinceMidnight(availability.startTime) &&
    toMinutesSinceMidnight(input.endTime) <= toMinutesSinceMidnight(availability.endTime)
  );
}

function differenceInMinutes(startTime: Date, endTime: Date): number {
  return Math.round((endTime.getTime() - startTime.getTime()) / 60_000);
}

function toMinutesSinceMidnight(value: Date): number {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

function toUtcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toDayOfWeek(value: Date): DayOfWeek {
  const day = value.getUTCDay();

  switch (day) {
    case 0:
      return DayOfWeek.SUNDAY;
    case 1:
      return DayOfWeek.MONDAY;
    case 2:
      return DayOfWeek.TUESDAY;
    case 3:
      return DayOfWeek.WEDNESDAY;
    case 4:
      return DayOfWeek.THURSDAY;
    case 5:
      return DayOfWeek.FRIDAY;
    case 6:
      return DayOfWeek.SATURDAY;
    default:
      throw new ApplicationError('Invalid appointment day.', 400, 'INVALID_APPOINTMENT_DAY');
  }
}
