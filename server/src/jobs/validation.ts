import { z } from 'zod';

export const processJobsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type ProcessJobsInput = z.infer<typeof processJobsSchema>;
