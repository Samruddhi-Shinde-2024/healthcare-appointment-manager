import { Gender } from '@prisma/client';
import { z } from 'zod';

export const emailSchema = z.string().trim().email().toLowerCase().max(255);
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  dateOfBirth: z.coerce.date().optional(),
  gender: z.nativeEnum(Gender).optional(),
  emergencyContact: z.string().trim().min(5).max(50).optional(),
  medicalNotes: z.string().trim().max(2000).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(32).max(512),
});

export const logoutSchema = refreshTokenSchema;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
