import type { Response } from 'express';

type ApiSuccessBody<T> = Readonly<{
  success: true;
  data: T;
  meta?: Readonly<Record<string, unknown>>;
}>;

export function sendSuccess<T>(
  response: Response,
  statusCode: number,
  data: T,
  meta?: Readonly<Record<string, unknown>>,
): void {
  const body: ApiSuccessBody<T> =
    meta === undefined
      ? {
          success: true,
          data,
        }
      : {
          success: true,
          data,
          meta,
        };

  response.status(statusCode).json(body);
}
