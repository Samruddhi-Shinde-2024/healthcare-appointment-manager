import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types.js';
import type { BackgroundJobsService } from '../jobs/service.js';
import { ApplicationError } from '../errors/application-error.js';
import type {
  MedicationReminderRecord,
  MedicationRemindersRepository,
  PrescriptionAccessRecord,
} from './repository.js';
import type {
  CreateMedicationRemindersInput,
  MedicationReminderListQuery,
  UpdateMedicationReminderStatusInput,
} from './validation.js';

export type MedicationReminderResponse = Readonly<{
  id: string;
  prescriptionId: string;
  patientId: string;
  patientEmail: string;
  scheduledAt: string;
  status: string;
  retryCount: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

function serializeReminder(reminder: MedicationReminderRecord): MedicationReminderResponse {
  return {
    id: reminder.id,
    prescriptionId: reminder.prescriptionId,
    patientId: reminder.patientId,
    patientEmail: reminder.patient.user.email,
    scheduledAt: reminder.scheduledAt.toISOString(),
    status: reminder.status,
    retryCount: reminder.retryCount,
    sentAt: reminder.sentAt?.toISOString() ?? null,
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString(),
  };
}

export class MedicationRemindersService {
  public constructor(
    private readonly medicationRemindersRepository: MedicationRemindersRepository,
    private readonly backgroundJobsService?: BackgroundJobsService,
  ) {}

  public async create(
    input: CreateMedicationRemindersInput,
    actor: AuthenticatedUser,
  ): Promise<MedicationReminderResponse[]> {
    const prescription = await this.requirePrescription(input.prescriptionId);
    this.assertCanManagePrescription(prescription, actor);

    const reminders = await this.medicationRemindersRepository.createMany({
      prescriptionId: prescription.id,
      patientId: prescription.appointment.patientId,
      scheduledAt: input.scheduledAt,
      actorId: actor.id,
    });

    const backgroundJobsService = this.backgroundJobsService;

    if (backgroundJobsService !== undefined) {
      await Promise.all(
        reminders.map((reminder) =>
          backgroundJobsService.enqueueMedicationReminder(
            reminder.id,
            actor.id,
            reminder.scheduledAt,
          ),
        ),
      );
    }

    return reminders.map(serializeReminder);
  }

  public async list(
    query: MedicationReminderListQuery,
    actor: AuthenticatedUser,
  ): Promise<MedicationReminderResponse[]> {
    const reminders = await this.medicationRemindersRepository.list({
      ...(query.prescriptionId !== undefined && {
        prescriptionId: query.prescriptionId,
      }),
      ...(query.patientId !== undefined && {
        patientId: query.patientId,
      }),
      ...(query.status !== undefined && {
        status: query.status,
      }),
    });
    return reminders.filter((reminder) => this.canAccessReminder(reminder, actor)).map(serializeReminder);
  }

  public async updateStatus(
    id: string,
    input: UpdateMedicationReminderStatusInput,
    actor: AuthenticatedUser,
  ): Promise<MedicationReminderResponse> {
    const reminder = await this.medicationRemindersRepository.findById(id);

    if (reminder === null) {
      throw new ApplicationError('Medication reminder was not found.', 404, 'REMINDER_NOT_FOUND');
    }

    if (!this.canAccessReminder(reminder, actor)) {
      throw new ApplicationError('You are not allowed to update this reminder.', 403, 'FORBIDDEN');
    }

    return serializeReminder(
      await this.medicationRemindersRepository.updateStatus(id, {
        status: input.status,
        actorId: actor.id,
      }),
    );
  }

  private async requirePrescription(id: string): Promise<PrescriptionAccessRecord> {
    const prescription = await this.medicationRemindersRepository.findPrescription(id);

    if (prescription === null) {
      throw new ApplicationError('Prescription was not found.', 404, 'PRESCRIPTION_NOT_FOUND');
    }

    return prescription;
  }

  private assertCanManagePrescription(
    prescription: PrescriptionAccessRecord,
    actor: AuthenticatedUser,
  ): void {
    if (actor.role === UserRole.ADMIN) {
      return;
    }

    if (actor.role === UserRole.DOCTOR && prescription.appointment.doctor.userId === actor.id) {
      return;
    }

    throw new ApplicationError('You are not allowed to manage reminders for this prescription.', 403, 'FORBIDDEN');
  }

  private canAccessReminder(reminder: MedicationReminderRecord, actor: AuthenticatedUser): boolean {
    if (actor.role === UserRole.ADMIN) {
      return true;
    }

    if (actor.role === UserRole.DOCTOR) {
      return reminder.prescription.appointment.doctor.userId === actor.id;
    }

    return reminder.patient.userId === actor.id;
  }
}
