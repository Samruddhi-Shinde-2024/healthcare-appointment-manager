import type { UserRole } from '@prisma/client';

export type JwtPayload = Readonly<{
  userId: string;
  role: UserRole;
}>;

export type AuthenticatedUser = Readonly<{
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}>;

export type TokenPair = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

export type SanitizedUser = Readonly<{
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  patientProfileId: string | null;
  doctorProfileId: string | null;
  adminProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}>;
