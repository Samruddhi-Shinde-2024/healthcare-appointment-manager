import { RefreshTokenStatus, UserRole, type Prisma, type PrismaClient } from '@prisma/client';

export type AuthUserRecord = Prisma.UserGetPayload<{
  include: {
    adminProfile: true;
    doctorProfile: true;
    patientProfile: true;
  };
}>;

export type RefreshTokenRecord = Prisma.RefreshTokenGetPayload<{
  include: {
    user: {
      include: {
        adminProfile: true;
        doctorProfile: true;
        patientProfile: true;
      };
    };
  };
}>;

export class AuthRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findUserByEmail(email: string): Promise<AuthUserRecord | null> {
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

  public findUserById(id: string): Promise<AuthUserRecord | null> {
    return this.database.user.findUnique({
      where: {
        id,
      },
      include: {
        adminProfile: true,
        doctorProfile: true,
        patientProfile: true,
      },
    });
  }

  public createPatientUser(
    input: Readonly<{
      email: string;
      passwordHash: string;
      dateOfBirth?: Date;
      gender?: Prisma.EnumGenderNullableFilter['equals'];
      emergencyContact?: string;
      medicalNotes?: string;
    }>,
  ): Promise<AuthUserRecord> {
    return this.database.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        role: UserRole.PATIENT,
        patientProfile: {
          create: {
            ...(input.dateOfBirth === undefined ? {} : { dateOfBirth: input.dateOfBirth }),
            ...(input.gender === undefined ? {} : { gender: input.gender }),
            ...(input.emergencyContact === undefined
              ? {}
              : { emergencyContact: input.emergencyContact }),
            ...(input.medicalNotes === undefined ? {} : { medicalNotes: input.medicalNotes }),
          },
        },
      },
      include: {
        adminProfile: true,
        doctorProfile: true,
        patientProfile: true,
      },
    });
  }

  public createRefreshToken(
    input: Readonly<{
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }>,
  ): Promise<void> {
    return this.database.refreshToken
      .create({
        data: {
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          createdBy: input.userId,
          updatedBy: input.userId,
        },
      })
      .then(() => undefined);
  }

  public findActiveRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.database.refreshToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: {
          include: {
            adminProfile: true,
            doctorProfile: true,
            patientProfile: true,
          },
        },
      },
    });
  }

  public rotateRefreshToken(
    input: Readonly<{
      oldTokenId: string;
      userId: string;
      newTokenHash: string;
      expiresAt: Date;
    }>,
  ): Promise<void> {
    return this.database
      .$transaction(async (transaction) => {
        await transaction.refreshToken.update({
          where: {
            id: input.oldTokenId,
          },
          data: {
            status: RefreshTokenStatus.REVOKED,
            revokedAt: new Date(),
            updatedBy: input.userId,
          },
        });

        await transaction.refreshToken.create({
          data: {
            userId: input.userId,
            tokenHash: input.newTokenHash,
            expiresAt: input.expiresAt,
            createdBy: input.userId,
            updatedBy: input.userId,
          },
        });
      })
      .then(() => undefined);
  }

  public revokeRefreshToken(
    input: Readonly<{
      tokenHash: string;
      updatedBy?: string;
    }>,
  ): Promise<void> {
    return this.database.refreshToken
      .updateMany({
        where: {
          tokenHash: input.tokenHash,
          status: RefreshTokenStatus.ACTIVE,
        },
        data: {
          status: RefreshTokenStatus.REVOKED,
          revokedAt: new Date(),
          ...(input.updatedBy === undefined ? {} : { updatedBy: input.updatedBy }),
        },
      })
      .then(() => undefined);
  }
}
