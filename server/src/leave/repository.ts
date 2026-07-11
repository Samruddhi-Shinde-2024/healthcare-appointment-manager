import { AppointmentStatus, LeaveStatus, type Prisma, type PrismaClient } from '@prisma/client';

const leaveInclude = {
  doctor: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.DoctorLeaveInclude;

export type LeaveRecord = Prisma.DoctorLeaveGetPayload<{
  include: typeof leaveInclude;
}>;

export class LeaveRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findDoctorById(id: string): Promise<Prisma.DoctorProfileGetPayload<{ include: { user: true } }> | null> {
    return this.database.doctorProfile.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });
  }

  public findDoctorByUserId(userId: string): Promise<{ id: string } | null> {
    return this.database.doctorProfile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
      },
    });
  }

  public findById(id: string): Promise<LeaveRecord | null> {
    return this.database.doctorLeave.findUnique({
      where: {
        id,
      },
      include: leaveInclude,
    });
  }

  public list(filters: Readonly<{ doctorId?: string; status?: LeaveStatus }>): Promise<LeaveRecord[]> {
    return this.database.doctorLeave.findMany({
      where: {
        ...(filters.doctorId === undefined ? {} : { doctorId: filters.doctorId }),
        ...(filters.status === undefined ? {} : { status: filters.status }),
      },
      include: leaveInclude,
      orderBy: {
        startDate: 'desc',
      },
    });
  }

  public findOverlappingLeave(
    input: Readonly<{
      doctorId: string;
      startDate: Date;
      endDate: Date;
      excludedLeaveId?: string;
    }>,
  ): Promise<{ id: string } | null> {
    return this.database.doctorLeave.findFirst({
      where: {
        doctorId: input.doctorId,
        status: LeaveStatus.ACTIVE,
        startDate: {
          lte: input.endDate,
        },
        endDate: {
          gte: input.startDate,
        },
        ...(input.excludedLeaveId === undefined
          ? {}
          : {
              id: {
                not: input.excludedLeaveId,
              },
            }),
      },
      select: {
        id: true,
      },
    });
  }

  public findAffectedAppointmentIds(
    input: Readonly<{
      doctorId: string;
      startDate: Date;
      endDate: Date;
    }>,
  ): Promise<string[]> {
    return this.database.appointment
      .findMany({
        where: {
          doctorId: input.doctorId,
          status: {
            in: [AppointmentStatus.HELD, AppointmentStatus.CONFIRMED],
          },
          startTime: {
            gte: startOfUtcDay(input.startDate),
            lt: startOfNextUtcDay(input.endDate),
          },
        },
        select: {
          id: true,
        },
        orderBy: {
          startTime: 'asc',
        },
      })
      .then((appointments) => appointments.map((appointment) => appointment.id));
  }

  public create(
    input: Readonly<{
      doctorId: string;
      startDate: Date;
      endDate: Date;
      reason?: string;
      actorId: string;
    }>,
  ): Promise<LeaveRecord> {
    return this.database.doctorLeave.create({
      data: {
        doctorId: input.doctorId,
        startDate: input.startDate,
        endDate: input.endDate,
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        status: LeaveStatus.ACTIVE,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
      include: leaveInclude,
    });
  }

  public update(
    id: string,
    input: Readonly<{
      startDate?: Date;
      endDate?: Date;
      reason?: string | null;
      status?: LeaveStatus;
      actorId: string;
    }>,
  ): Promise<LeaveRecord> {
    return this.database.doctorLeave.update({
      where: {
        id,
      },
      data: {
        ...(input.startDate === undefined ? {} : { startDate: input.startDate }),
        ...(input.endDate === undefined ? {} : { endDate: input.endDate }),
        ...(input.reason === undefined ? {} : { reason: input.reason }),
        ...(input.status === undefined ? {} : { status: input.status }),
        updatedBy: input.actorId,
      },
      include: leaveInclude,
    });
  }

  public cancel(id: string, actorId: string): Promise<LeaveRecord> {
    return this.update(id, {
      status: LeaveStatus.CANCELLED,
      actorId,
    });
  }
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function startOfNextUtcDay(value: Date): Date {
  const nextDay = startOfUtcDay(value);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay;
}
