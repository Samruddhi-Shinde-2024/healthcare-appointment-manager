// import { UserRole } from '@prisma/client';

import type { PaginationMeta } from '../common/pagination.js';
import { toPaginationMeta, toPaginationOptions } from '../common/pagination.js';
import { ApplicationError } from '../errors/application-error.js';
import { hashPassword } from '../auth/password.js';
import type { UsersRepository } from '../users/repository.js';
import type { DoctorRecord, DoctorsRepository } from './repository.js';
import type { CreateDoctorInput, DoctorListQuery, UpdateDoctorInput } from './validation.js';

export type DoctorResponse = Readonly<{
  id: string;
  userId: string;
  email: string;
  specialization: Readonly<{
    id: string;
    name: string;
  }>;
  experienceYears: number;
  consultationFee: string;
  slotDuration: number;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type DoctorListResponse = Readonly<{
  doctors: DoctorResponse[];
  meta: PaginationMeta;
}>;

function serializeDoctor(doctor: DoctorRecord): DoctorResponse {
  return {
    id: doctor.id,
    userId: doctor.userId,
    email: doctor.user.email,
    specialization: {
      id: doctor.specialization.id,
      name: doctor.specialization.name,
    },
    experienceYears: doctor.experienceYears,
    consultationFee: doctor.consultationFee.toString(),
    slotDuration: doctor.slotDuration,
    bio: doctor.bio,
    isActive: doctor.isActive && doctor.user.isActive,
    createdAt: doctor.createdAt.toISOString(),
    updatedAt: doctor.updatedAt.toISOString(),
  };
}

function toMoney(value: number): string {
  return value.toFixed(2);
}

export class DoctorsService {
  public constructor(
    private readonly doctorsRepository: DoctorsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  public async create(input: CreateDoctorInput, actorId: string): Promise<DoctorResponse> {
    await this.ensureEmailAvailable(input.email);

    const doctor = await this.doctorsRepository.create({
      email: input.email,
      passwordHash: await hashPassword(input.password),
      specializationName: input.specializationName,
      experienceYears: input.experienceYears,
      consultationFee: toMoney(input.consultationFee),
      slotDuration: input.slotDuration,
      ...(input.bio === undefined ? {} : { bio: input.bio }),
      actorId,
    });

    return serializeDoctor(doctor);
  }

  public async list(query: DoctorListQuery): Promise<DoctorListResponse> {
    const pagination = toPaginationOptions(query);
    const result = await this.doctorsRepository.list(
      {
        ...(query.search === undefined ? {} : { search: query.search }),
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      },
      pagination,
    );

    return {
      doctors: result.doctors.map(serializeDoctor),
      meta: toPaginationMeta(pagination, result.total),
    };
  }

  public async get(id: string): Promise<DoctorResponse> {
    return serializeDoctor(await this.getDoctorRecord(id));
  }

  public async update(
    id: string,
    input: UpdateDoctorInput,
    actorId: string,
  ): Promise<DoctorResponse> {
    const currentDoctor = await this.getDoctorRecord(id);

    if (input.email !== undefined && input.email !== currentDoctor.user.email) {
      await this.ensureEmailAvailable(input.email);
    }

    const doctor = await this.doctorsRepository.update(id, {
      ...(input.email === undefined ? {} : { email: input.email }),
      ...(input.password === undefined ? {} : { passwordHash: await hashPassword(input.password) }),
      ...(input.specializationName === undefined
        ? {}
        : { specializationName: input.specializationName }),
      ...(input.experienceYears === undefined ? {} : { experienceYears: input.experienceYears }),
      ...(input.consultationFee === undefined
        ? {}
        : { consultationFee: toMoney(input.consultationFee) }),
      ...(input.slotDuration === undefined ? {} : { slotDuration: input.slotDuration }),
      ...(input.bio === undefined ? {} : { bio: input.bio }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      actorId,
    });

    return serializeDoctor(doctor);
  }

  public async deactivate(id: string, actorId: string): Promise<DoctorResponse> {
    await this.getDoctorRecord(id);
    return serializeDoctor(await this.doctorsRepository.deactivate(id, actorId));
  }

  private async getDoctorRecord(id: string): Promise<DoctorRecord> {
    const doctor = await this.doctorsRepository.findById(id);

    if (doctor === null) {
      throw new ApplicationError('Doctor was not found.', 404, 'DOCTOR_NOT_FOUND');
    }

    return doctor;
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser !== null) {
      throw new ApplicationError('Email is already in use.', 409, 'EMAIL_ALREADY_IN_USE');
    }
  }
}
