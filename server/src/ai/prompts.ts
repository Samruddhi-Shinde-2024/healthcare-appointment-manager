import type { LLMSummaryType } from '@prisma/client';

import type { AiAppointmentContext } from './repository.js';

export type SummaryPrompt = Readonly<{
  system: string;
  user: string;
  version: string;
}>;

function formatAppointmentContext(appointment: AiAppointmentContext): string {
  return [
    `Appointment ID: ${appointment.id}`,
    `Appointment status: ${appointment.status}`,
    `Start time: ${appointment.startTime.toISOString()}`,
    `End time: ${appointment.endTime.toISOString()}`,
    `Doctor email: ${appointment.doctor.user.email}`,
    `Doctor specialization: ${appointment.doctor.specialization.name}`,
    `Patient email: ${appointment.patient.user.email}`,
  ].join('\n');
}

export function buildPreVisitPrompt(appointment: AiAppointmentContext): SummaryPrompt {
  const symptoms = appointment.symptoms;

  return {
    version: 'pre-visit-v1',
    system:
      'You summarize patient-reported symptoms for clinicians. Be concise, clinically cautious, and avoid diagnosis.',
    user: [
      formatAppointmentContext(appointment),
      '',
      'Patient symptom submission:',
      `Symptoms: ${symptoms?.symptoms ?? 'Not provided'}`,
      `Duration: ${symptoms?.duration ?? 'Not provided'}`,
      `Severity: ${symptoms?.severity ?? 'Not provided'}`,
      `Additional notes: ${symptoms?.additionalNotes ?? 'Not provided'}`,
      '',
      'Return JSON with keys: content, urgencyLevel, chiefComplaint, suggestedQuestions.',
      'urgencyLevel must be LOW, MEDIUM, or HIGH. suggestedQuestions must be an array of strings.',
    ].join('\n'),
  };
}

export function buildPostVisitPrompt(appointment: AiAppointmentContext): SummaryPrompt {
  const prescription = appointment.prescription;

  return {
    version: 'post-visit-v1',
    system:
      'You convert clinical visit notes into patient-friendly follow-up guidance. Use plain language and do not add facts not present in the source.',
    user: [
      formatAppointmentContext(appointment),
      '',
      'Clinical visit information:',
      `Clinical notes: ${prescription?.clinicalNotes ?? 'Not provided'}`,
      `Doctor notes: ${prescription?.doctorNotes ?? 'Not provided'}`,
      `Medicines JSON: ${JSON.stringify(prescription?.medicines ?? [])}`,
      '',
      'Return JSON with keys: content, medicationSchedule, followUpGuidance.',
      'medicationSchedule must be valid JSON suitable for patient display.',
    ].join('\n'),
  };
}

// export function fallbackSummaryContent(type: LLMSummaryType): string {
//   return type === 'PRE_VISIT'
//     ? 'AI pre-visit summary is currently unavailable.'
//     : 'AI post-visit summary is currently unavailable.';
// }

export function fallbackSummaryContent(type: LLMSummaryType): string {
  return type === 'PRE_VISIT'
    ? 'AI pre-visit summary is unavailable. Configure the AI provider API key to enable this feature.'
    : 'AI post-visit summary is unavailable. Configure the AI provider API key to enable this feature.';
}
