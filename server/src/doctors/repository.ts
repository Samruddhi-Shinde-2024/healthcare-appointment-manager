import { UserRole, type Prisma, type PrismaClient } from '@prisma/client';

import type { PaginationOptions } from '../common/pagination.js';
import { toSkip } from '../common/pagination.js';

export type DoctorRecord = Prisma.DoctorProfileGetPayload<{
  include: {
    specialization: true;
    user: true;
  };
}>;

type DoctorListFilters = Readonly<{
  search?: string;
  isActive?: boolean;
}>;

export class DoctorsRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findById(id: string): Promise<DoctorRecord | null> {
    return this.database.doctorProfile.findUnique({
      where: {
        id,
      },
      include: {
        specialization: true,
        user: true,
      },
    });
  }

  public async list(
    filters: DoctorListFilters,
    pagination: PaginationOptions,
  ): Promise<Readonly<{ doctors: DoctorRecord[]; total: number }>> {
    const where = this.toWhereInput(filters);

    const [doctors, total] = await this.database.$transaction([
      this.database.doctorProfile.findMany({
        where,
        include: {
          specialization: true,
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: toSkip(pagination),
        take: pagination.pageSize,
      }),
      this.database.doctorProfile.count({
        where,
      }),
    ]);

    return {
      doctors,
      total,
    };
  }

  public create(
    input: Readonly<{
      email: string;
      passwordHash: string;
      specializationName: string;
      experienceYears: number;
      consultationFee: string;
      slotDuration: number;
      bio?: string;
      actorId: string;
    }>,
  ): Promise<DoctorRecord> {
    return this.database.doctorProfile.create({
      data: {
        experienceYears: input.experienceYears,
        consultationFee: input.consultationFee,
        slotDuration: input.slotDuration,
        ...(input.bio === undefined ? {} : { bio: input.bio }),
        createdBy: input.actorId,
        updatedBy: input.actorId,
        user: {
          create: {
            email: input.email,
            passwordHash: input.passwordHash,
            role: UserRole.DOCTOR,
            createdBy: input.actorId,
            updatedBy: input.actorId,
          },
        },
        specialization: {
          connectOrCreate: {
            where: {
              name: input.specializationName,
            },
            create: {
              name: input.specializationName,
              createdBy: input.actorId,
              updatedBy: input.actorId,
            },
          },
        },
      },
      include: {
        specialization: true,
        user: true,
      },
    });
  }

  public update(
    id: string,
    input: Readonly<{
      email?: string;
      passwordHash?: string;
      specializationName?: string;
      experienceYears?: number;
      consultationFee?: string;
      slotDuration?: number;
      bio?: string | null;
      isActive?: boolean;
      actorId: string;
    }>,
  ): Promise<DoctorRecord> {
    return this.database.doctorProfile.update({
      where: {
        id,
      },
      data: {
        ...(input.experienceYears === undefined ? {} : { experienceYears: input.experienceYears }),
        ...(input.consultationFee === undefined
          ? {}
          : { consultationFee: input.consultationFee }),
        ...(input.slotDuration === undefined ? {} : { slotDuration: input.slotDuration }),
        ...(input.bio === undefined ? {} : { bio: input.bio }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
        updatedBy: input.actorId,
        ...(input.specializationName === undefined
          ? {}
          : {
              specialization: {
                connectOrCreate: {
                  where: {
                    name: input.specializationName,
                  },
                  create: {
                    name: input.specializationName,
                    createdBy: input.actorId,
                    updatedBy: input.actorId,
                  },
                },
              },
            }),
        user: {
          update: {
            ...(input.email === undefined ? {} : { email: input.email }),
            ...(input.passwordHash === undefined ? {} : { passwordHash: input.passwordHash }),
            ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
            updatedBy: input.actorId,
          },
        },
      },
      include: {
        specialization: true,
        user: true,
      },
    });
  }

  public deactivate(id: string, actorId: string): Promise<DoctorRecord> {
    return this.update(id, {
      isActive: false,
      actorId,
    });
  }

  private toWhereInput(filters: DoctorListFilters): Prisma.DoctorProfileWhereInput {
    return {
      ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
      ...(filters.search === undefined
        ? {}
        : {
            OR: [
              {
                user: {
                  email: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                specialization: {
                  name: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }),
    };
  }
}
