import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types.js';
import { ApplicationError } from '../errors/application-error.js';
import type { AvailabilityRecord, AvailabilityRepository } from './repository.js';
import type {
  AvailabilityListQuery,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from './validation.js';

export type AvailabilityResponse = Readonly<{
  id: string;
  doctorId: string;
  dayOfWeek: AvailabilityRecord['dayOfWeek'];
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>;

function serializeTime(value: Date): string {
  return `${value.getUTCHours().toString().padStart(2, '0')}:${value
    .getUTCMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function serializeAvailability(availability: AvailabilityRecord): AvailabilityResponse {
  return {
    id: availability.id,
    doctorId: availability.doctorId,
    dayOfWeek: availability.dayOfWeek,
    startTime: serializeTime(availability.startTime),
    endTime: serializeTime(availability.endTime),
    slotDuration: availability.slotDuration,
    isActive: availability.isActive,
    createdAt: availability.createdAt.toISOString(),
    updatedAt: availability.updatedAt.toISOString(),
  };
}

function isPrismaUniqueConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function ensureTimeRange(startTime: Date, endTime: Date): void {
  if (startTime.getTime() >= endTime.getTime()) {
    throw new ApplicationError(
      'Availability start time must be before end time.',
      400,
      'INVALID_AVAILABILITY_RANGE',
    );
  }
}

export class AvailabilityService {
  public constructor(private readonly availabilityRepository: AvailabilityRepository) {}

  public async list(
    doctorId: string,
    query: AvailabilityListQuery,
  ): Promise<AvailabilityResponse[]> {
    await this.ensureDoctorExists(doctorId);
    return (
      await this.availabilityRepository.list(doctorId, {
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      })
    ).map(serializeAvailability);
  }

  public async create(
    input: CreateAvailabilityInput,
    actor: AuthenticatedUser,
  ): Promise<AvailabilityResponse> {
    this.ensureAdmin(actor);
    await this.ensureDoctorExists(input.doctorId);
    ensureTimeRange(input.startTime, input.endTime);

    try {
      return serializeAvailability(
        await this.availabilityRepository.create({
          doctorId: input.doctorId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          slotDuration: input.slotDuration,
          isActive: input.isActive,
          actorId: actor.id,
        }),
      );
    } catch (error) {
      if (isPrismaUniqueConflict(error)) {
        throw new ApplicationError(
          'Doctor availability already exists for that time range.',
          409,
          'AVAILABILITY_ALREADY_EXISTS',
        );
      }

      throw error;
    }
  }

  public async update(
    id: string,
    input: UpdateAvailabilityInput,
    actor: AuthenticatedUser,
  ): Promise<AvailabilityResponse> {
    this.ensureAdmin(actor);
    const existingAvailability = await this.getAvailabilityRecord(id);

    ensureTimeRange(input.startTime ?? existingAvailability.startTime, input.endTime ?? existingAvailability.endTime);

    try {
      return serializeAvailability(
        await this.availabilityRepository.update(id, {
          ...(input.dayOfWeek === undefined ? {} : { dayOfWeek: input.dayOfWeek }),
          ...(input.startTime === undefined ? {} : { startTime: input.startTime }),
          ...(input.endTime === undefined ? {} : { endTime: input.endTime }),
          ...(input.slotDuration === undefined ? {} : { slotDuration: input.slotDuration }),
          ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
          actorId: actor.id,
        }),
      );
    } catch (error) {
      if (isPrismaUniqueConflict(error)) {
        throw new ApplicationError(
          'Doctor availability already exists for that time range.',
          409,
          'AVAILABILITY_ALREADY_EXISTS',
        );
      }

      throw error;
    }
  }

  public async delete(id: string, actor: AuthenticatedUser): Promise<Readonly<{ id: string }>> {
    this.ensureAdmin(actor);
    await this.getAvailabilityRecord(id);
    await this.availabilityRepository.delete(id);
    return { id };
  }

  private async ensureDoctorExists(doctorId: string): Promise<void> {
    const doctor = await this.availabilityRepository.findDoctorById(doctorId);

    if (doctor === null) {
      throw new ApplicationError('Doctor was not found.', 404, 'DOCTOR_NOT_FOUND');
    }
  }

  private async getAvailabilityRecord(id: string): Promise<AvailabilityRecord> {
    const availability = await this.availabilityRepository.findById(id);

    if (availability === null) {
      throw new ApplicationError('Availability was not found.', 404, 'AVAILABILITY_NOT_FOUND');
    }

    return availability;
  }

  private ensureAdmin(actor: AuthenticatedUser): void {
    if (actor.role !== UserRole.ADMIN) {
      throw new ApplicationError('Only administrators can manage availability.', 403, 'FORBIDDEN');
    }
  }
}
