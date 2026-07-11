import { createHmac, randomBytes } from 'node:crypto';

import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { environment } from '../config/environment.js';
import { ApplicationError } from '../errors/application-error.js';
import type { JwtPayload } from './types.js';

export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

const jwtPayloadSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['ADMIN', 'DOCTOR', 'PATIENT']),
});

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, environment.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, environment.JWT_SECRET);
    const parsed = jwtPayloadSchema.safeParse(decoded);

    if (!parsed.success) {
      throw new ApplicationError('Invalid access token.', 401, 'INVALID_ACCESS_TOKEN');
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }

    throw new ApplicationError('Invalid access token.', 401, 'INVALID_ACCESS_TOKEN');
  }
}

export function createRefreshToken(): string {
  return randomBytes(64).toString('base64url');
}

export function hashRefreshToken(refreshToken: string): string {
  return createHmac('sha256', environment.JWT_REFRESH_SECRET).update(refreshToken).digest('hex');
}

export function getRefreshTokenExpiry(now = new Date()): Date {
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);
  return expiresAt;
}
