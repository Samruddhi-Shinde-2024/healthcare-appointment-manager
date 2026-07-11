import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { prisma } from '../config/prisma.js';
import { ApplicationError } from '../errors/application-error.js';
import { verifyAccessToken } from './jwt.js';
import type { AuthenticatedUser } from './types.js';

function readBearerToken(request: Request): string {
  const authorization = request.header('authorization');

  if (authorization === undefined) {
    throw new ApplicationError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || token === undefined || token.trim() === '') {
    throw new ApplicationError('Invalid authorization header.', 401, 'INVALID_AUTHORIZATION_HEADER');
  }

  return token;
}

export function authenticate(): RequestHandler {
  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = verifyAccessToken(readBearerToken(request));
      const user = await prisma.user.findUnique({
        where: {
          id: payload.userId,
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (user === null) {
        throw new ApplicationError('User was not found.', 401, 'INVALID_ACCESS_TOKEN');
      }

      if (!user.isActive) {
        throw new ApplicationError('User account is inactive.', 403, 'USER_INACTIVE');
      }

      request.user = user satisfies AuthenticatedUser;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function authorize(...roles: readonly AuthenticatedUser['role'][]): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    if (request.user === undefined) {
      next(new ApplicationError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED'));
      return;
    }

    if (!roles.includes(request.user.role)) {
      next(new ApplicationError('You are not allowed to access this resource.', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
}
