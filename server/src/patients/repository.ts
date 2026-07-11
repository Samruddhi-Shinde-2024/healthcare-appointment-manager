import { UserRole, type Prisma, type PrismaClient } from '@prisma/client';

import type { PaginationOptions } from '../common/pagination.js';
import { toSkip } from '../common/pagination.js';

export type PatientRecord = Prisma.PatientProfileGetPayload<{
  include: {
    user: true;
  };
}>;

type PatientListFilters = Readonly<{
  search?: string;
  isActive?: boolean;
}>;

export class PatientsRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findById(id: string): Promise<PatientRecord | null> {
    return this.database.patientProfile.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
      },
    });
  }

  public async list(
    filters: PatientListFilters,
    pagination: PaginationOptions,
  ): Promise<Readonly<{ patients: PatientRecord[]; total: number }>> {
    const where = this.toWhereInput(filters);

    const [patients, total] = await this.database.$transaction([
      this.database.patientProfile.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: toSkip(pagination),
        take: pagination.pageSize,
      }),
      this.database.patientProfile.count({
        where,
      }),
    ]);

    return {
      patients,
      total,
    };
  }

  public update(
    id: string,
    input: Readonly<{
      email?: string;
      passwordHash?: string;
      dateOfBirth?: Date | null;
      gender?: PatientRecord['gender'];
      emergencyContact?: string | null;
      medicalNotes?: string | null;
      isActive?: boolean;
      actorId: string;
    }>,
  ): Promise<PatientRecord> {
    return this.database.patientProfile.update({
      where: {
        id,
      },
      data: {
        ...(input.dateOfBirth === undefined ? {} : { dateOfBirth: input.dateOfBirth }),
        ...(input.gender === undefined ? {} : { gender: input.gender }),
        ...(input.emergencyContact === undefined
          ? {}
          : { emergencyContact: input.emergencyContact }),
        ...(input.medicalNotes === undefined ? {} : { medicalNotes: input.medicalNotes }),
        updatedBy: input.actorId,
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
        user: true,
      },
    });
  }

  public deactivate(id: string, actorId: string): Promise<PatientRecord> {
    return this.update(id, {
      isActive: false,
      actorId,
    });
  }

  private toWhereInput(filters: PatientListFilters): Prisma.PatientProfileWhereInput {
    return {
      user: {
        role: UserRole.PATIENT,
        ...(filters.isActive === undefined ? {} : { isActive: filters.isActive }),
        ...(filters.search === undefined
          ? {}
          : {
              email: {
                contains: filters.search,
                mode: 'insensitive',
              },
            }),
      },
    };
  }
}
