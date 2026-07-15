import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, type ZodTypeAny } from 'zod';

import { ApplicationError } from '../errors/application-error.js';

type RequestSchemas = Readonly<{
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}>;

function formatValidationIssues(error: z.ZodError): Readonly<Record<string, unknown>> {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

function parseRequestPart(schema: ZodTypeAny, value: unknown): unknown {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ApplicationError(
      'Request validation failed.',
      400,
      'VALIDATION_ERROR',
      formatValidationIssues(result.error),
    );
  }

  return result.data;
}

export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    try {
      if (schemas.body !== undefined) {
        request.body = parseRequestPart(schemas.body, request.body);
      }

      if (schemas.params !== undefined) {
        request.params = parseRequestPart(schemas.params, request.params) as Request['params'];
      }

      if (schemas.query !== undefined) {
        Object.defineProperty(request, 'query', {
          configurable: true,
          enumerable: true,
          value: parseRequestPart(schemas.query, request.query),
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});
