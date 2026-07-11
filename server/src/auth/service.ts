import { RefreshTokenStatus, type UserRole } from '@prisma/client';

import { ApplicationError } from '../errors/application-error.js';
import {
  createRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
  signAccessToken,
} from './jwt.js';
import { hashPassword, verifyPassword } from './password.js';
import type { AuthRepository, AuthUserRecord, RefreshTokenRecord } from './repository.js';
import type { LoginInput, RefreshTokenInput, RegisterInput } from './validation.js';
import type { SanitizedUser, TokenPair } from './types.js';

type AuthResult = Readonly<{
  user: SanitizedUser;
  tokens: TokenPair;
}>;

function toIsoString(value: Date): string {
  return value.toISOString();
}

export function sanitizeUser(user: AuthUserRecord): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    patientProfileId: user.patientProfile?.id ?? null,
    doctorProfileId: user.doctorProfile?.id ?? null,
    adminProfileId: user.adminProfile?.id ?? null,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt),
  };
}

function ensureActiveRefreshToken(record: RefreshTokenRecord | null): RefreshTokenRecord {
  if (record === null) {
    throw new ApplicationError('Invalid refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (record.status !== RefreshTokenStatus.ACTIVE || record.expiresAt.getTime() <= Date.now()) {
    throw new ApplicationError('Invalid refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  if (!record.user.isActive) {
    throw new ApplicationError('User account is inactive.', 403, 'USER_INACTIVE');
  }

  return record;
}

export class AuthService {
  public constructor(private readonly authRepository: AuthRepository) {}

  public async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await this.authRepository.findUserByEmail(input.email);

    if (existingUser !== null) {
      throw new ApplicationError('Email is already registered.', 409, 'EMAIL_ALREADY_REGISTERED');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.authRepository.createPatientUser({
      email: input.email,
      passwordHash,
      ...(input.dateOfBirth === undefined ? {} : { dateOfBirth: input.dateOfBirth }),
      ...(input.gender === undefined ? {} : { gender: input.gender }),
      ...(input.emergencyContact === undefined ? {} : { emergencyContact: input.emergencyContact }),
      ...(input.medicalNotes === undefined ? {} : { medicalNotes: input.medicalNotes }),
    });

    return {
      user: sanitizeUser(user),
      tokens: await this.issueTokens(user.id, user.role),
    };
  }

  public async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.authRepository.findUserByEmail(input.email);

    if (user === null) {
      throw new ApplicationError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new ApplicationError('User account is inactive.', 403, 'USER_INACTIVE');
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);

    if (!passwordMatches) {
      throw new ApplicationError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    return {
      user: sanitizeUser(user),
      tokens: await this.issueTokens(user.id, user.role),
    };
  }

  public async refresh(input: RefreshTokenInput): Promise<AuthResult> {
    const tokenHash = hashRefreshToken(input.refreshToken);
    const refreshTokenRecord = ensureActiveRefreshToken(
      await this.authRepository.findActiveRefreshToken(tokenHash),
    );

    const nextRefreshToken = createRefreshToken();

    await this.authRepository.rotateRefreshToken({
      oldTokenId: refreshTokenRecord.id,
      userId: refreshTokenRecord.userId,
      newTokenHash: hashRefreshToken(nextRefreshToken),
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      user: sanitizeUser(refreshTokenRecord.user),
      tokens: {
        accessToken: signAccessToken({
          userId: refreshTokenRecord.userId,
          role: refreshTokenRecord.user.role,
        }),
        refreshToken: nextRefreshToken,
      },
    };
  }

  public async logout(input: RefreshTokenInput): Promise<void> {
    const tokenHash = hashRefreshToken(input.refreshToken);
    const tokenRecord = await this.authRepository.findActiveRefreshToken(tokenHash);

    await this.authRepository.revokeRefreshToken({
      tokenHash,
      ...(tokenRecord === null ? {} : { updatedBy: tokenRecord.userId }),
    });
  }

  public async getCurrentUser(userId: string): Promise<SanitizedUser> {
    const user = await this.authRepository.findUserById(userId);

    if (user === null) {
      throw new ApplicationError('User was not found.', 404, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw new ApplicationError('User account is inactive.', 403, 'USER_INACTIVE');
    }

    return sanitizeUser(user);
  }

  private async issueTokens(userId: string, role: UserRole): Promise<TokenPair> {
    const refreshToken = createRefreshToken();

    await this.authRepository.createRefreshToken({
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      accessToken: signAccessToken({
        userId,
        role,
      }),
      refreshToken,
    };
  }
}
