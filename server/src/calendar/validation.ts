import { z } from 'zod';

export const googleCalendarCallbackSchema = z.object({
  code: z.string().trim().min(1),
});

export const googleCalendarCallbackQuerySchema = googleCalendarCallbackSchema.extend({
  state: z.string().trim().min(1),
});

export type GoogleCalendarCallbackInput = z.infer<typeof googleCalendarCallbackSchema>;
export type GoogleCalendarCallbackQuery = z.infer<typeof googleCalendarCallbackQuerySchema>;
