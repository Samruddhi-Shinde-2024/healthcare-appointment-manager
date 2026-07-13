import { ReminderStatus, type Prisma, type PrismaClient } from '@prisma/client';

export type MedicationReminderRecord = Prisma.MedicationReminderGetPayload<{
  include: {
    patient: {
      include: {
        user: true;
      };
    };
    prescription: {
      include: {
        appointment: {
          include: {
            doctor: {
              include: {
                user: true;
              };
            };
            patient: {
              include: {
                user: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export type PrescriptionAccessRecord = Prisma.PrescriptionGetPayload<{
  include: {
    appointment: {
      include: {
        doctor: {
          include: {
            user: true;
          };
        };
        patient: {
          include: {
            user: true;
          };
        };
      };
    };
  };
}>;

const medicationReminderInclude = {
  patient: {
    include: {
      user: true,
    },
  },
  prescription: {
    include: {
      appointment: {
        include: {
          doctor: {
            include: {
              user: true,
            },
          },
          patient: {
            include: {
              user: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MedicationReminderInclude;

export class MedicationRemindersRepository {
  public constructor(private readonly database: PrismaClient) {}

  public findPrescription(prescriptionId: string): Promise<PrescriptionAccessRecord | null> {
    return this.database.prescription.findUnique({
      where: {
        id: prescriptionId,
      },
      include: {
        appointment: {
          include: {
            doctor: {
              include: {
                user: true,
              },
            },
            patient: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  public createMany(input: Readonly<{
    prescriptionId: string;
    patientId: string;
    scheduledAt: readonly Date[];
    actorId: string;
  }>): Promise<MedicationReminderRecord[]> {
    return this.database.$transaction(
      input.scheduledAt.map((scheduledAt) =>
        this.database.medicationReminder.create({
          data: {
            prescriptionId: input.prescriptionId,
            patientId: input.patientId,
            scheduledAt,
            status: ReminderStatus.PENDING,
            createdBy: input.actorId,
            updatedBy: input.actorId,
          },
          include: medicationReminderInclude,
        }),
      ),
    );
  }

  public list(filters: Readonly<{
    prescriptionId?: string;
    patientId?: string;
    status?: ReminderStatus;
  }>): Promise<MedicationReminderRecord[]> {
    return this.database.medicationReminder.findMany({
      where: {
        ...(filters.prescriptionId === undefined ? {} : { prescriptionId: filters.prescriptionId }),
        ...(filters.patientId === undefined ? {} : { patientId: filters.patientId }),
        ...(filters.status === undefined ? {} : { status: filters.status }),
      },
      include: medicationReminderInclude,
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }

  public findById(id: string): Promise<MedicationReminderRecord | null> {
    return this.database.medicationReminder.findUnique({
      where: {
        id,
      },
      include: medicationReminderInclude,
    });
  }

  public updateStatus(
    id: string,
    input: Readonly<{
      status: ReminderStatus;
      actorId: string;
    }>,
  ): Promise<MedicationReminderRecord> {
    return this.database.medicationReminder.update({
      where: {
        id,
      },
      data: {
        status: input.status,
        sentAt: input.status === ReminderStatus.SENT ? new Date() : null,
        updatedBy: input.actorId,
      },
      include: medicationReminderInclude,
    });
  }
}
