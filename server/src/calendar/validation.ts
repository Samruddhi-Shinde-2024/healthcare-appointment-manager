import { z } from 'zod';

export const googleCalendarCallbackSchema = z.object({
  code: z.string().trim().min(1),
});

export type GoogleCalendarCallbackInput = z.infer<typeof googleCalendarCallbackSchema>;
