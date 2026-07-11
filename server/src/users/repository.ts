import type { Prisma, PrismaClient, UserRole } from '@prisma/client';

export type UserWithProfiles = Prisma.UserGetPayload<{
  include: {
    adminProfile: true;
    doctorProfile: true;
    patientProfile: true;
  };
}>;

export class UsersRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findByEmail(email: string): Promise<UserWithProfiles | null> {
    return this.database.user.findUnique({
      where: {
        email,
      },
      include: {
        adminProfile: true,
        doctorProfile: true,
        patientProfile: true,
      },
    });
  }

  public findByIdAndRole(
    id: string,
    role: UserRole,
  ): Promise<UserWithProfiles | null> {
    return this.database.user.findFirst({
      where: {
        id,
        role,
      },
      include: {
        adminProfile: true,
        doctorProfile: true,
        patientProfile: true,
      },
    });
  }
}
