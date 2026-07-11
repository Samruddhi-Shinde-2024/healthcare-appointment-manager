import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PaginationOptions = Readonly<{
  page: number;
  pageSize: number;
}>;

export type PaginationMeta = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export function toPaginationOptions(query: PaginationQuery): PaginationOptions {
  return {
    page: query.page,
    pageSize: query.pageSize,
  };
}

export function toPaginationMeta(options: PaginationOptions, total: number): PaginationMeta {
  return {
    page: options.page,
    pageSize: options.pageSize,
    total,
    totalPages: Math.ceil(total / options.pageSize),
  };
}

export function toSkip(options: PaginationOptions): number {
  return (options.page - 1) * options.pageSize;
}
