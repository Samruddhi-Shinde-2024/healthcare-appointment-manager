import { DayOfWeek } from '@prisma/client';
import { z } from 'zod';

const timeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format.')
  .transform((value) => {
    const [hour, minute] = value.split(':').map(Number);
    return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
  });

function validateTimeRange<T extends { startTime: Date; endTime: Date }>(value: T): boolean {
  return value.startTime.getTime() < value.endTime.getTime();
}

export const createAvailabilitySchema = z
  .object({
    doctorId: z.string().uuid(),
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
    slotDuration: z.number().int().min(5).max(240),
    isActive: z.boolean().default(true),
  })
  .refine(validateTimeRange, {
    message: 'Availability start time must be before end time.',
    path: ['endTime'],
  });

export const updateAvailabilitySchema = z
  .object({
    dayOfWeek: z.nativeEnum(DayOfWeek).optional(),
    startTime: timeStringSchema.optional(),
    endTime: timeStringSchema.optional(),
    slotDuration: z.number().int().min(5).max(240).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export const availabilityListQuerySchema = z.object({
  isActive: z.coerce.boolean().optional(),
});

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;
export type AvailabilityListQuery = z.infer<typeof availabilityListQuerySchema>;
