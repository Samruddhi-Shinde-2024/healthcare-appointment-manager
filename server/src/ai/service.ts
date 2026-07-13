import { createHash } from 'node:crypto';

import {
  AppointmentStatus,
  LLMSummaryStatus,
  LLMSummaryType,
  UrgencyLevel,
  UserRole,
  type Prisma,
} from '@prisma/client';

import type { AuthenticatedUser } from '../auth/types.js';
import { environment } from '../config/environment.js';
import { logger } from '../config/logger.js';
import { ApplicationError } from '../errors/application-error.js';
import { buildPostVisitPrompt, buildPreVisitPrompt, fallbackSummaryContent } from './prompts.js';
import type { AiAppointmentContext, AiRepository, LLMSummaryRecord } from './repository.js';

type OpenAiMessage = Readonly<{
  role: 'system' | 'user';
  content: string;
}>;

type OpenAiChatResponse = Readonly<{
  choices?: ReadonlyArray<{
    message?: {
      content?: string | null;
    };
  }>;
}>;

type GeneratedSummary = Readonly<{
  content: string;
  urgencyLevel?: UrgencyLevel | null;
  chiefComplaint?: string | null;
  suggestedQuestions?: Prisma.InputJsonValue;
  medicationSchedule?: Prisma.InputJsonValue;
  followUpGuidance?: string | null;
}>;

export type SummaryResponse = Readonly<{
  id: string;
  appointmentId: string;
  type: LLMSummaryType;
  status: LLMSummaryStatus;
  content: string;
  urgencyLevel: UrgencyLevel | null;
  chiefComplaint: string | null;
  suggestedQuestions: Prisma.JsonValue | null;
  medicationSchedule: Prisma.JsonValue | null;
  followUpGuidance: string | null;
  model: string | null;
  promptVersion: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}>;

function serializeSummary(summary: LLMSummaryRecord): SummaryResponse {
  return {
    id: summary.id,
    appointmentId: summary.appointmentId,
    type: summary.type,
    status: summary.status,
    content: summary.content,
    urgencyLevel: summary.urgencyLevel,
    chiefComplaint: summary.chiefComplaint,
    suggestedQuestions: summary.suggestedQuestions,
    medicationSchedule: summary.medicationSchedule,
    followUpGuidance: summary.followUpGuidance,
    model: summary.model,
    promptVersion: summary.promptVersion,
    failureReason: summary.failureReason,
    createdAt: summary.createdAt.toISOString(),
    updatedAt: summary.updatedAt.toISOString(),
  };
}

function hashPromptInput(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function toStringArrayJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function toInputJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toUrgencyLevel(value: unknown): UrgencyLevel | null {
  if (value === UrgencyLevel.LOW || value === UrgencyLevel.MEDIUM || value === UrgencyLevel.HIGH) {
    return value;
  }

  return null;
}

export class AiService {
  public constructor(private readonly aiRepository: AiRepository) {}

  public async generatePreVisitSummary(
    appointmentId: string,
    actor: AuthenticatedUser,
  ): Promise<SummaryResponse> {
    const appointment = await this.getAuthorizedAppointment(appointmentId, actor, LLMSummaryType.PRE_VISIT);

    if (appointment.symptoms === null) {
      throw new ApplicationError(
        'Symptom submission is required before generating a pre-visit summary.',
        409,
        'SYMPTOMS_REQUIRED',
      );
    }

    const prompt = buildPreVisitPrompt(appointment);
    const summary = await this.generateAndPersistSummary({
      appointment,
      actorId: actor.id,
      type: LLMSummaryType.PRE_VISIT,
      prompt,
    });

    return serializeSummary(summary);
  }

  public async generatePostVisitSummary(
    appointmentId: string,
    actor: AuthenticatedUser,
  ): Promise<SummaryResponse> {
    const appointment = await this.getAuthorizedAppointment(appointmentId, actor, LLMSummaryType.POST_VISIT);

    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new ApplicationError(
        'Appointment must be completed before generating a post-visit summary.',
        409,
        'APPOINTMENT_NOT_COMPLETED',
      );
    }

    const prompt = buildPostVisitPrompt(appointment);
    const summary = await this.generateAndPersistSummary({
      appointment,
      actorId: actor.id,
      type: LLMSummaryType.POST_VISIT,
      prompt,
    });

    return serializeSummary(summary);
  }

  private async getAuthorizedAppointment(
    appointmentId: string,
    actor: AuthenticatedUser,
    summaryType: LLMSummaryType,
  ): Promise<AiAppointmentContext> {
    const appointment = await this.aiRepository.findAppointmentContext(appointmentId);

    if (appointment === null) {
      throw new ApplicationError('Appointment was not found.', 404, 'APPOINTMENT_NOT_FOUND');
    }

    if (actor.role === UserRole.ADMIN) {
      return appointment;
    }

    if (actor.role === UserRole.DOCTOR && appointment.doctor.userId === actor.id) {
      return appointment;
    }

    if (summaryType === LLMSummaryType.POST_VISIT && actor.role === UserRole.PATIENT && appointment.patient.userId === actor.id) {
      return appointment;
    }

    throw new ApplicationError('You are not allowed to generate this summary.', 403, 'FORBIDDEN');
  }

  private async generateAndPersistSummary(input: Readonly<{
    appointment: AiAppointmentContext;
    actorId: string;
    type: LLMSummaryType;
    prompt: Readonly<{ system: string; user: string; version: string }>;
  }>): Promise<LLMSummaryRecord> {
    const promptInputHash = hashPromptInput(`${input.prompt.system}\n${input.prompt.user}`);

    try {
      const generatedSummary = await this.requestSummary([
        {
          role: 'system',
          content: input.prompt.system,
        },
        {
          role: 'user',
          content: input.prompt.user,
        },
      ]);

      return await this.aiRepository.upsertSummary({
        appointmentId: input.appointment.id,
        type: input.type,
        status: LLMSummaryStatus.COMPLETED,
        content: generatedSummary.content,
        ...(generatedSummary.urgencyLevel === undefined
          ? {}
          : { urgencyLevel: generatedSummary.urgencyLevel }),
        ...(generatedSummary.chiefComplaint === undefined
          ? {}
          : { chiefComplaint: generatedSummary.chiefComplaint }),
        ...(generatedSummary.suggestedQuestions === undefined
          ? {}
          : { suggestedQuestions: generatedSummary.suggestedQuestions }),
        ...(generatedSummary.medicationSchedule === undefined
          ? {}
          : { medicationSchedule: generatedSummary.medicationSchedule }),
        ...(generatedSummary.followUpGuidance === undefined
          ? {}
          : { followUpGuidance: generatedSummary.followUpGuidance }),
        model: environment.OPENAI_MODEL,
        promptVersion: input.prompt.version,
        promptInputHash,
        failureReason: null,
        actorId: input.actorId,
      });
    } catch (error) {
      const failureReason = error instanceof Error ? error.message : 'AI summary generation failed.';
      logger.warn('AI summary generation failed.', {
        appointmentId: input.appointment.id,
        summaryType: input.type,
        error,
      });

      return this.aiRepository.upsertSummary({
        appointmentId: input.appointment.id,
        type: input.type,
        status: LLMSummaryStatus.FAILED,
        content: fallbackSummaryContent(input.type),
        model: environment.OPENAI_MODEL,
        promptVersion: input.prompt.version,
        promptInputHash,
        failureReason,
        actorId: input.actorId,
      });
    }
  }

  private async requestSummary(messages: readonly OpenAiMessage[]): Promise<GeneratedSummary> {
    if (environment.OPENAI_API_KEY === undefined) {
      throw new Error('OpenAI API key is not configured.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${environment.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: environment.OPENAI_MODEL,
        messages,
        temperature: 0.2,
        response_format: {
          type: 'json_object',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}.`);
    }

    const body = (await response.json()) as OpenAiChatResponse;
    const content = body.choices?.[0]?.message?.content;

    if (typeof content !== 'string' || content.trim() === '') {
      throw new Error('OpenAI response did not include summary content.');
    }

    const parsed = parseJsonObject(content);

    if (parsed === null) {
      return {
        content,
      };
    }

    const suggestedQuestions = toStringArrayJson(parsed.suggestedQuestions);
    const medicationSchedule = toInputJson(parsed.medicationSchedule);

    return {
      content: typeof parsed.content === 'string' && parsed.content.trim() !== '' ? parsed.content : content,
      urgencyLevel: toUrgencyLevel(parsed.urgencyLevel),
      chiefComplaint: typeof parsed.chiefComplaint === 'string' ? parsed.chiefComplaint : null,
      ...(suggestedQuestions === undefined ? {} : { suggestedQuestions }),
      ...(medicationSchedule === undefined ? {} : { medicationSchedule }),
      followUpGuidance: typeof parsed.followUpGuidance === 'string' ? parsed.followUpGuidance : null,
    };
  }
}
