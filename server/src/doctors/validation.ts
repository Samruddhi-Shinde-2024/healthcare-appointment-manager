import { z } from 'zod';

import { paginationQuerySchema } from '../common/pagination.js';
import { emailSchema, passwordSchema } from '../auth/validation.js';

const specializationNameSchema = z.string().trim().min(2).max(120);

export const createDoctorSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  specializationName: specializationNameSchema,
  experienceYears: z.number().int().min(0).max(70),
  consultationFee: z.coerce.number().min(0).max(1_000_000),
  slotDuration: z.number().int().min(5).max(240),
  bio: z.string().trim().max(2000).optional(),
});

export const updateDoctorSchema = z
  .object({
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    specializationName: specializationNameSchema.optional(),
    experienceYears: z.number().int().min(0).max(70).optional(),
    consultationFee: z.coerce.number().min(0).max(1_000_000).optional(),
    slotDuration: z.number().int().min(5).max(240).optional(),
    bio: z.string().trim().max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  });

export const doctorListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional(),
  isActive: z.coerce.boolean().optional(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorListQuery = z.infer<typeof doctorListQuerySchema>;
