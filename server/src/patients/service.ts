import type { PaginationMeta } from '../common/pagination.js';
import { toPaginationMeta, toPaginationOptions } from '../common/pagination.js';
import { ApplicationError } from '../errors/application-error.js';
import { hashPassword } from '../auth/password.js';
import type { UsersRepository } from '../users/repository.js';
import type { PatientRecord, PatientsRepository } from './repository.js';
import type { PatientListQuery, UpdatePatientInput } from './validation.js';

export type PatientResponse = Readonly<{
  id: string;
  userId: string;
  email: string;
  dateOfBirth: string | null;
  gender: string | null;
  emergencyContact: string | null;
  medicalNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type PatientListResponse = Readonly<{
  patients: PatientResponse[];
  meta: PaginationMeta;
}>;

function serializePatient(patient: PatientRecord): PatientResponse {
  return {
    id: patient.id,
    userId: patient.userId,
    email: patient.user.email,
    dateOfBirth: patient.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    gender: patient.gender,
    emergencyContact: patient.emergencyContact,
    medicalNotes: patient.medicalNotes,
    isActive: patient.user.isActive,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}

export class PatientsService {
  public constructor(
    private readonly patientsRepository: PatientsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  public async list(query: PatientListQuery): Promise<PatientListResponse> {
    const pagination = toPaginationOptions(query);
    const result = await this.patientsRepository.list(
      {
        ...(query.search === undefined ? {} : { search: query.search }),
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      },
      pagination,
    );

    return {
      patients: result.patients.map(serializePatient),
      meta: toPaginationMeta(pagination, result.total),
    };
  }

  public async get(id: string): Promise<PatientResponse> {
    return serializePatient(await this.getPatientRecord(id));
  }

  public async update(
    id: string,
    input: UpdatePatientInput,
    actorId: string,
  ): Promise<PatientResponse> {
    const currentPatient = await this.getPatientRecord(id);

    if (input.email !== undefined && input.email !== currentPatient.user.email) {
      const existingUser = await this.usersRepository.findByEmail(input.email);

      if (existingUser !== null) {
        throw new ApplicationError('Email is already in use.', 409, 'EMAIL_ALREADY_IN_USE');
      }
    }

    const patient = await this.patientsRepository.update(id, {
      ...(input.email === undefined ? {} : { email: input.email }),
      ...(input.password === undefined ? {} : { passwordHash: await hashPassword(input.password) }),
      ...(input.dateOfBirth === undefined ? {} : { dateOfBirth: input.dateOfBirth }),
      ...(input.gender === undefined ? {} : { gender: input.gender }),
      ...(input.emergencyContact === undefined
        ? {}
        : { emergencyContact: input.emergencyContact }),
      ...(input.medicalNotes === undefined ? {} : { medicalNotes: input.medicalNotes }),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      actorId,
    });

    return serializePatient(patient);
  }

  public async deactivate(id: string, actorId: string): Promise<PatientResponse> {
    await this.getPatientRecord(id);
    return serializePatient(await this.patientsRepository.deactivate(id, actorId));
  }

  private async getPatientRecord(id: string): Promise<PatientRecord> {
    const patient = await this.patientsRepository.findById(id);

    if (patient === null) {
      throw new ApplicationError('Patient was not found.', 404, 'PATIENT_NOT_FOUND');
    }

    return patient;
  }
}
