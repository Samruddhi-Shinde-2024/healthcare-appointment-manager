import { AppointmentStatus } from '@prisma/client';
import { z } from 'zod';

import { paginationQuerySchema } from '../common/pagination.js';

const appointmentDateSchema = z.coerce.date();

function validateChronology<T extends { startTime: Date; endTime: Date }>(value: T): boolean {
  return value.startTime.getTime() < value.endTime.getTime();
}

function validateFutureStart<T extends { startTime: Date }>(value: T): boolean {
  return value.startTime.getTime() > Date.now();
}

export const bookAppointmentSchema = z
  .object({
    doctorId: z.string().uuid(),
    patientId: z.string().uuid().optional(),
    startTime: appointmentDateSchema,
    endTime: appointmentDateSchema,
  })
  .refine(validateChronology, {
    message: 'Appointment start time must be before end time.',
    path: ['endTime'],
  })
  .refine(validateFutureStart, {
    message: 'Appointment start time must be in the future.',
    path: ['startTime'],
  });

export const updateAppointmentSchema = z.object({
  status: z.enum([
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.NO_SHOW,
  ]),
});

export const rescheduleAppointmentSchema = z
  .object({
    startTime: appointmentDateSchema,
    endTime: appointmentDateSchema,
  })
  .refine(validateChronology, {
    message: 'Appointment start time must be before end time.',
    path: ['endTime'],
  })
  .refine(validateFutureStart, {
    message: 'Appointment start time must be in the future.',
    path: ['startTime'],
  });

export const cancelAppointmentSchema = z.object({
  cancellationReason: z.string().trim().min(3).max(500),
});

export const appointmentListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(AppointmentStatus).optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type AppointmentListQuery = z.infer<typeof appointmentListQuerySchema>;
