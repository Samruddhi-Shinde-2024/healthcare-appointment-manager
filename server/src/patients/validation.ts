import { Gender } from '@prisma/client';
import { z } from 'zod';

import { emailSchema, passwordSchema } from '../auth/validation.js';
import { paginationQuerySchema } from '../common/pagination.js';

export const updatePatientSchema = z
  .object({
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    dateOfBirth: z.coerce.date().nullable().optional(),
    gender: z.nativeEnum(Gender).nullable().optional(),
    emergencyContact: z.string().trim().min(5).max(50).nullable().optional(),
    medicalNotes: z.string().trim().max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export const patientListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type PatientListQuery = z.infer<typeof patientListQuerySchema>;
