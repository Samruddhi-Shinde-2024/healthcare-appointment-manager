import { ReminderStatus } from '@prisma/client';
import { z } from 'zod';

export const createMedicationRemindersSchema = z.object({
  prescriptionId: z.string().uuid(),
  scheduledAt: z.array(z.coerce.date()).min(1).max(100),
});

export const updateMedicationReminderStatusSchema = z.object({
  status: z.enum([ReminderStatus.PENDING, ReminderStatus.SENT, ReminderStatus.FAILED, ReminderStatus.CANCELLED]),
});

export const medicationReminderListQuerySchema = z.object({
  prescriptionId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.nativeEnum(ReminderStatus).optional(),
});

export type CreateMedicationRemindersInput = z.infer<typeof createMedicationRemindersSchema>;
export type UpdateMedicationReminderStatusInput = z.infer<typeof updateMedicationReminderStatusSchema>;
export type MedicationReminderListQuery = z.infer<typeof medicationReminderListQuerySchema>;
