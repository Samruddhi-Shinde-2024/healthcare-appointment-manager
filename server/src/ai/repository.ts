import {
  type LLMSummaryStatus,
  type LLMSummaryType,
  type Prisma,
  type PrismaClient,
  type UrgencyLevel,
} from '@prisma/client';

const aiAppointmentInclude = {
  doctor: {
    include: {
      specialization: true,
      user: true,
    },
  },
  patient: {
    include: {
      user: true,
    },
  },
  prescription: true,
  symptoms: true,
} satisfies Prisma.AppointmentInclude;

export type AiAppointmentContext = Prisma.AppointmentGetPayload<{
  include: typeof aiAppointmentInclude;
}>;

export type LLMSummaryRecord = Prisma.LLMSummaryGetPayload<object>;

export type SaveSummaryInput = Readonly<{
  appointmentId: string;
  type: LLMSummaryType;
  status: LLMSummaryStatus;
  content: string;
  urgencyLevel?: UrgencyLevel | null;
  chiefComplaint?: string | null;
  suggestedQuestions?: Prisma.InputJsonValue;
  medicationSchedule?: Prisma.InputJsonValue;
  followUpGuidance?: string | null;
  model?: string | null;
  promptVersion: string;
  promptInputHash: string;
  failureReason?: string | null;
  actorId: string;
}>;

export class AiRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findAppointmentContext(appointmentId: string): Promise<AiAppointmentContext | null> {
    return this.database.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: aiAppointmentInclude,
    });
  }

  public upsertSummary(input: SaveSummaryInput): Promise<LLMSummaryRecord> {
    const data = {
      status: input.status,
      content: input.content,
      ...(input.urgencyLevel === undefined ? {} : { urgencyLevel: input.urgencyLevel }),
      ...(input.chiefComplaint === undefined ? {} : { chiefComplaint: input.chiefComplaint }),
      ...(input.suggestedQuestions === undefined
        ? {}
        : { suggestedQuestions: input.suggestedQuestions }),
      ...(input.medicationSchedule === undefined
        ? {}
        : { medicationSchedule: input.medicationSchedule }),
      ...(input.followUpGuidance === undefined
        ? {}
        : { followUpGuidance: input.followUpGuidance }),
      ...(input.model === undefined ? {} : { model: input.model }),
      promptVersion: input.promptVersion,
      promptInputHash: input.promptInputHash,
      ...(input.failureReason === undefined ? {} : { failureReason: input.failureReason }),
      updatedBy: input.actorId,
    } satisfies Prisma.LLMSummaryUpdateInput;

    return this.database.lLMSummary.upsert({
      where: {
        appointmentId_type: {
          appointmentId: input.appointmentId,
          type: input.type,
        },
      },
      create: {
        appointmentId: input.appointmentId,
        type: input.type,
        ...data,
        createdBy: input.actorId,
      },
      update: data,
    });
  }
}
