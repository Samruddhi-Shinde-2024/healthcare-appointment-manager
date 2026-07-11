import type { Prisma, PrismaClient } from '@prisma/client';

const availabilityInclude = {
  doctor: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.DoctorAvailabilityInclude;

export type AvailabilityRecord = Prisma.DoctorAvailabilityGetPayload<{
  include: typeof availabilityInclude;
}>;

export class AvailabilityRepository {
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

  public findById(id: string): Promise<AvailabilityRecord | null> {
    return this.database.doctorAvailability.findUnique({
      where: {
        id,
      },
      include: availabilityInclude,
    });
  }

  public list(
    doctorId: string,
    filters: Readonly<{ isActive?: boolean }>,
  ): Promise<AvailabilityRecord[]> {
    return this.database.doctorAvailability.findMany({
      where: {
        doctorId,
        ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      },
      include: availabilityInclude,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  public create(
    input: Readonly<{
      doctorId: string;
      dayOfWeek: AvailabilityRecord['dayOfWeek'];
      startTime: Date;
      endTime: Date;
      slotDuration: number;
      isActive: boolean;
      actorId: string;
    }>,
  ): Promise<AvailabilityRecord> {
    return this.database.doctorAvailability.create({
      data: {
        doctorId: input.doctorId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDuration: input.slotDuration,
        isActive: input.isActive,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      },
      include: availabilityInclude,
    });
  }

  public update(
    id: string,
    input: Readonly<{
      dayOfWeek?: AvailabilityRecord['dayOfWeek'];
      startTime?: Date;
      endTime?: Date;
      slotDuration?: number;
      isActive?: boolean;
      actorId: string;
    }>,
  ): Promise<AvailabilityRecord> {
    return this.database.doctorAvailability.update({
      where: {
        id,
      },
      data: {
        ...(input.dayOfWeek === undefined ? {} : { dayOfWeek: input.dayOfWeek }),
        ...(input.startTime === undefined ? {} : { startTime: input.startTime }),
        ...(input.endTime === undefined ? {} : { endTime: input.endTime }),
        ...(input.slotDuration === undefined ? {} : { slotDuration: input.slotDuration }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
        updatedBy: input.actorId,
      },
      include: availabilityInclude,
    });
  }

  public delete(id: string): Promise<void> {
    return this.database.doctorAvailability
      .delete({
        where: {
          id,
        },
      })
      .then(() => undefined);
  }
}
