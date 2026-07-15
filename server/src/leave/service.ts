import { LeaveStatus, UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types.js';
import { ApplicationError } from '../errors/application-error.js';
import type { LeaveRecord, LeaveRepository } from './repository.js';
import type { CreateLeaveInput, LeaveListQuery, UpdateLeaveInput } from './validation.js';

export type LeaveResponse = Readonly<{
  id: string;
  doctorId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  affectedAppointmentIds: string[];
  createdAt: string;
  updatedAt: string;
}>;

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function serializeLeave(leave: LeaveRecord, affectedAppointmentIds: string[]): LeaveResponse {
  return {
    id: leave.id,
    doctorId: leave.doctorId,
    startDate: toDateOnly(leave.startDate),
    endDate: toDateOnly(leave.endDate),
    reason: leave.reason,
    status: leave.status,
    affectedAppointmentIds,
    createdAt: leave.createdAt.toISOString(),
    updatedAt: leave.updatedAt.toISOString(),
  };
}

function ensureDateRange(startDate: Date, endDate: Date): void {
  if (startDate.getTime() > endDate.getTime()) {
    throw new ApplicationError(
      'Leave start date must be before or equal to end date.',
      400,
      'INVALID_LEAVE_RANGE',
    );
  }
}

export class LeaveService {
  public constructor(private readonly leaveRepository: LeaveRepository) {}

  public async create(input: CreateLeaveInput, actor: AuthenticatedUser): Promise<LeaveResponse> {
    const doctorId = await this.resolveDoctorId(input.doctorId, actor);
    await this.ensureDoctorExists(doctorId);
    ensureDateRange(input.startDate, input.endDate);
    await this.ensureNoOverlap({
      doctorId,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const affectedAppointmentIds = await this.leaveRepository.findAffectedAppointmentIds({
      doctorId,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const leave = await this.leaveRepository.create({
      doctorId,
      startDate: input.startDate,
      endDate: input.endDate,
      ...(input.reason === undefined ? {} : { reason: input.reason }),
      actorId: actor.id,
    });

    return serializeLeave(leave, affectedAppointmentIds);
  }

  public async list(query: LeaveListQuery, actor: AuthenticatedUser): Promise<LeaveResponse[]> {
    const doctorId =
      actor.role === UserRole.ADMIN && query.doctorId === undefined
        ? undefined
        : await this.resolveDoctorId(query.doctorId, actor);
    const leaves = await this.leaveRepository.list({
      ...(doctorId === undefined ? {} : { doctorId }),
      ...(query.status === undefined ? {} : { status: query.status }),
    });

    return Promise.all(
      leaves.map(async (leave) =>
        serializeLeave(
          leave,
          await this.leaveRepository.findAffectedAppointmentIds({
            doctorId: leave.doctorId,
            startDate: leave.startDate,
            endDate: leave.endDate,
          }),
        ),
      ),
    );
  }

  public async update(
    id: string,
    input: UpdateLeaveInput,
    actor: AuthenticatedUser,
  ): Promise<LeaveResponse> {
    const leave = await this.getAuthorizedLeave(id, actor);
    const nextStartDate = input.startDate ?? leave.startDate;
    const nextEndDate = input.endDate ?? leave.endDate;
    const nextStatus = input.status ?? leave.status;

    ensureDateRange(nextStartDate, nextEndDate);

    if (nextStatus === LeaveStatus.ACTIVE) {
      await this.ensureNoOverlap({
        doctorId: leave.doctorId,
        startDate: nextStartDate,
        endDate: nextEndDate,
        excludedLeaveId: leave.id,
      });
    }

    const affectedAppointmentIds = await this.leaveRepository.findAffectedAppointmentIds({
      doctorId: leave.doctorId,
      startDate: nextStartDate,
      endDate: nextEndDate,
    });

    const updatedLeave = await this.leaveRepository.update(id, {
      ...(input.startDate === undefined ? {} : { startDate: input.startDate }),
      ...(input.endDate === undefined ? {} : { endDate: input.endDate }),
      ...(input.reason === undefined ? {} : { reason: input.reason }),
      ...(input.status === undefined ? {} : { status: input.status }),
      actorId: actor.id,
    });

    return serializeLeave(updatedLeave, affectedAppointmentIds);
  }

  public async cancel(id: string, actor: AuthenticatedUser): Promise<LeaveResponse> {
    const leave = await this.getAuthorizedLeave(id, actor);
    const affectedAppointmentIds = await this.leaveRepository.findAffectedAppointmentIds({
      doctorId: leave.doctorId,
      startDate: leave.startDate,
      endDate: leave.endDate,
    });

    return serializeLeave(await this.leaveRepository.cancel(id, actor.id), affectedAppointmentIds);
  }

  private async resolveDoctorId(
    requestedDoctorId: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<string> {
    if (actor.role === UserRole.ADMIN) {
      if (requestedDoctorId === undefined) {
        throw new ApplicationError('Doctor id is required.', 400, 'DOCTOR_ID_REQUIRED');
      }

      return requestedDoctorId;
    }

    if (actor.role !== UserRole.DOCTOR) {
      throw new ApplicationError('Only doctors and administrators can manage leave.', 403, 'FORBIDDEN');
    }

    const doctor = await this.leaveRepository.findDoctorByUserId(actor.id);

    if (doctor === null) {
      throw new ApplicationError('Doctor profile was not found.', 404, 'DOCTOR_NOT_FOUND');
    }

    if (requestedDoctorId !== undefined && requestedDoctorId !== doctor.id) {
      throw new ApplicationError('Doctors can only manage their own leave.', 403, 'FORBIDDEN');
    }

    return doctor.id;
  }

  private async getAuthorizedLeave(id: string, actor: AuthenticatedUser): Promise<LeaveRecord> {
    const leave = await this.leaveRepository.findById(id);

    if (leave === null) {
      throw new ApplicationError('Leave record was not found.', 404, 'LEAVE_NOT_FOUND');
    }

    if (actor.role === UserRole.ADMIN) {
      return leave;
    }

    if (actor.role === UserRole.DOCTOR) {
      const doctor = await this.leaveRepository.findDoctorByUserId(actor.id);

      if (doctor?.id === leave.doctorId) {
        return leave;
      }
    }

    throw new ApplicationError('You are not allowed to access this leave record.', 403, 'FORBIDDEN');
  }

  private async ensureDoctorExists(doctorId: string): Promise<void> {
    const doctor = await this.leaveRepository.findDoctorById(doctorId);

    if (doctor === null) {
      throw new ApplicationError('Doctor was not found.', 404, 'DOCTOR_NOT_FOUND');
    }
  }

  private async ensureNoOverlap(
    input: Readonly<{
      doctorId: string;
      startDate: Date;
      endDate: Date;
      excludedLeaveId?: string;
    }>,
  ): Promise<void> {
    const overlappingLeave = await this.leaveRepository.findOverlappingLeave(input);

    if (overlappingLeave !== null) {
      throw new ApplicationError('Leave dates overlap an existing leave.', 409, 'LEAVE_OVERLAP');
    }
  }
}
