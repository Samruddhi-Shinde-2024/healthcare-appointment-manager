import { z } from 'zod';

export const appointmentSummaryParamsSchema = z.object({
  id: z.string().uuid(),
});

export type AppointmentSummaryParams = z.infer<typeof appointmentSummaryParamsSchema>;
