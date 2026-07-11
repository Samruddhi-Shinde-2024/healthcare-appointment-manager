import { LeaveStatus } from '@prisma/client';
import { z } from 'zod';

function validateDateRange<T extends { startDate: Date; endDate: Date }>(value: T): boolean {
  return value.startDate.getTime() <= value.endDate.getTime();
}

export const createLeaveSchema = z
  .object({
    doctorId: z.string().uuid().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(validateDateRange, {
    message: 'Leave start date must be before or equal to end date.',
    path: ['endDate'],
  });

export const updateLeaveSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    reason: z.string().trim().max(500).nullable().optional(),
    status: z.nativeEnum(LeaveStatus).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export const leaveListQuerySchema = z.object({
  doctorId: z.string().uuid().optional(),
  status: z.nativeEnum(LeaveStatus).optional(),
});

export type CreateLeaveInput = z.infer<typeof createLeaveSchema>;
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>;
export type LeaveListQuery = z.infer<typeof leaveListQuerySchema>;
