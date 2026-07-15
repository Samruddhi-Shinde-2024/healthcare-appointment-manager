import {
  DayOfWeek,
  Gender,
  LeaveStatus,
  PrismaClient,
  UserRole,
  type Prisma,
} from '@prisma/client';

const prisma = new PrismaClient();
// Original
// const DEVELOPMENT_PASSWORD_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// Temp
const DEVELOPMENT_PASSWORD_HASH = '$2b$12$U1h8mPcis/2IGqAtdrBePuF5Vgie..tHpynWUMTBG7xGmdxI7v0E2';

type AvailabilitySeed = Readonly<{
  id: string;
  dayOfWeek: DayOfWeek;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  slotDuration: number;
}>;

type LeaveSeed = Readonly<{
  id: string;
  startDate: Date;
  endDate: Date;
  reason: string;
  status: LeaveStatus;
}>;

type DoctorSeed = Readonly<{
  userId: string;
  profileId: string;
  email: string;
  specialization: string;
  experienceYears: number;
  consultationFee: string;
  slotDuration: number;
  bio: string;
  availabilities: readonly AvailabilitySeed[];
  leaves: readonly LeaveSeed[];
}>;

type PatientSeed = Readonly<{
  userId: string;
  profileId: string;
  email: string;
  dateOfBirth: Date;
  gender: Gender;
  emergencyContact: string;
  medicalNotes: string;
}>;

function timeOnly(hour: number, minute: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}

function dateOnly(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

const admin = {
  profileId: '8c96d81d-594d-4f2c-b3fe-b920ecdb8e41',
  userId: '25b58ed1-b369-48f7-aa45-611c38641556',
} as const;

const doctors: readonly DoctorSeed[] = [
  {
    userId: 'e221ef08-d98c-44d3-884f-b4caad6a875e',
    profileId: 'ef23c458-8dd0-4099-97d7-c5f78b9f8b62',
    email: 'arjun.mehta@healthcare.local',
    specialization: 'Cardiology',
    experienceYears: 14,
    consultationFee: '1800.00',
    slotDuration: 30,
    bio: 'Cardiologist focused on preventive heart care, hypertension, and post-procedure follow-up.',
    availabilities: [
      {
        id: '1ac57557-5bf9-4bf4-bcb6-fdb2a9ae8c7b',
        dayOfWeek: DayOfWeek.MONDAY,
        startHour: 9,
        startMinute: 0,
        endHour: 13,
        endMinute: 0,
        slotDuration: 30,
      },
      {
        id: '4ba454c2-a36f-4e82-ab68-c108e3e64af9',
        dayOfWeek: DayOfWeek.WEDNESDAY,
        startHour: 14,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
        slotDuration: 30,
      },
    ],
    leaves: [
      {
        id: 'f2b79ed0-b8e3-488c-a93d-03147555e908',
        startDate: dateOnly(2026, 8, 17),
        endDate: dateOnly(2026, 8, 18),
        reason: 'Cardiology conference',
        status: LeaveStatus.ACTIVE,
      },
    ],
  },
  {
    userId: 'da4f9227-5fc2-4e49-948a-9d7237d19b83',
    profileId: '7ec6c50e-78e4-4419-b8ed-c8fd112e72d5',
    email: 'nisha.rao@healthcare.local',
    specialization: 'Dermatology',
    experienceYears: 9,
    consultationFee: '1200.00',
    slotDuration: 20,
    bio: 'Dermatologist treating acne, eczema, allergy-related rashes, and routine skin screenings.',
    availabilities: [
      {
        id: '886cfc17-6f3f-4588-a161-afd4fbbcf7a0',
        dayOfWeek: DayOfWeek.TUESDAY,
        startHour: 10,
        startMinute: 0,
        endHour: 14,
        endMinute: 0,
        slotDuration: 20,
      },
      {
        id: 'aa1d3143-ee87-4060-adb9-6bfa7d017846',
        dayOfWeek: DayOfWeek.THURSDAY,
        startHour: 15,
        startMinute: 0,
        endHour: 19,
        endMinute: 0,
        slotDuration: 20,
      },
    ],
    leaves: [
      {
        id: '5e0caac2-a2df-4a99-a7f5-933d7942e252',
        startDate: dateOnly(2026, 9, 4),
        endDate: dateOnly(2026, 9, 4),
        reason: 'Medical workshop',
        status: LeaveStatus.ACTIVE,
      },
    ],
  },
  {
    userId: '699d2080-b097-49fc-8d00-9f53f1279c19',
    profileId: '6339de52-eb89-4a6d-8e6d-9746f38de9c8',
    email: 'kabir.sen@healthcare.local',
    specialization: 'Neurology',
    experienceYears: 12,
    consultationFee: '2000.00',
    slotDuration: 30,
    bio: 'Neurologist with experience in migraines, seizure follow-up, neuropathy, and sleep concerns.',
    availabilities: [
      {
        id: 'e8706467-c12b-4b96-a041-1bb43c1e1985',
        dayOfWeek: DayOfWeek.MONDAY,
        startHour: 15,
        startMinute: 0,
        endHour: 19,
        endMinute: 0,
        slotDuration: 30,
      },
      {
        id: '5bec9cd7-bc76-4c44-b407-620d7c714cf8',
        dayOfWeek: DayOfWeek.FRIDAY,
        startHour: 9,
        startMinute: 0,
        endHour: 13,
        endMinute: 0,
        slotDuration: 30,
      },
    ],
    leaves: [],
  },
  {
    userId: 'e67cf85e-6ee9-4728-b577-0a629530ae6c',
    profileId: 'ab4447b9-56f5-4a5e-b2aa-7d19ea94e6b4',
    email: 'mira.kapoor@healthcare.local',
    specialization: 'Pediatrics',
    experienceYears: 8,
    consultationFee: '1000.00',
    slotDuration: 20,
    bio: 'Pediatrician supporting newborn care, vaccination planning, nutrition, and acute childhood illnesses.',
    availabilities: [
      {
        id: '5a74bf61-12c2-460d-a3e5-2801c2c08a62',
        dayOfWeek: DayOfWeek.WEDNESDAY,
        startHour: 9,
        startMinute: 0,
        endHour: 13,
        endMinute: 0,
        slotDuration: 20,
      },
      {
        id: 'b88b90d4-1f07-4bb2-abfc-b972fb4e6c1d',
        dayOfWeek: DayOfWeek.SATURDAY,
        startHour: 10,
        startMinute: 0,
        endHour: 14,
        endMinute: 0,
        slotDuration: 20,
      },
    ],
    leaves: [
      {
        id: 'eb243b33-79bd-4566-98ad-7851a627fa3a',
        startDate: dateOnly(2026, 8, 29),
        endDate: dateOnly(2026, 8, 29),
        reason: 'Family commitment',
        status: LeaveStatus.ACTIVE,
      },
    ],
  },
  {
    userId: '97f81b46-9f9d-4a25-a072-436707222d36',
    profileId: '3629bfca-c67e-45f2-8bd1-c456a7ffae17',
    email: 'samir.malhotra@healthcare.local',
    specialization: 'Orthopedics',
    experienceYears: 16,
    consultationFee: '1600.00',
    slotDuration: 30,
    bio: 'Orthopedic specialist for sports injuries, joint pain, fracture follow-up, and rehabilitation planning.',
    availabilities: [
      {
        id: 'dc7a7783-9e4c-477d-9b61-b6624cf15f52',
        dayOfWeek: DayOfWeek.TUESDAY,
        startHour: 9,
        startMinute: 0,
        endHour: 13,
        endMinute: 0,
        slotDuration: 30,
      },
      {
        id: '9ba818b0-86e9-438b-9ed6-7ecea3f01ffd',
        dayOfWeek: DayOfWeek.FRIDAY,
        startHour: 14,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
        slotDuration: 30,
      },
    ],
    leaves: [],
  },
];

const patients: readonly PatientSeed[] = [
  {
    userId: 'b17fc9da-7d9d-4583-92dc-4d521f0e1e1d',
    profileId: 'c395037a-6e7a-490b-8ce5-9bf3995f7ef7',
    email: 'ananya.sharma@example.local',
    dateOfBirth: dateOnly(1991, 3, 12),
    gender: Gender.FEMALE,
    emergencyContact: '+91-90000-10001',
    medicalNotes: 'Mild seasonal allergies.',
  },
  {
    userId: 'd8bd6b27-6ee0-45f2-8f54-5af7af2286f4',
    profileId: '4e834cc5-ecef-4510-91b5-ff8da03d5c75',
    email: 'rohan.iyer@example.local',
    dateOfBirth: dateOnly(1984, 7, 24),
    gender: Gender.MALE,
    emergencyContact: '+91-90000-10002',
    medicalNotes: 'History of hypertension in family.',
  },
  {
    userId: 'cb770e94-716d-4d8d-b482-c264a502b8da',
    profileId: '8cfb04e9-c1c6-4130-bd9d-08ccdebd2892',
    email: 'priya.menon@example.local',
    dateOfBirth: dateOnly(1997, 11, 5),
    gender: Gender.FEMALE,
    emergencyContact: '+91-90000-10003',
    medicalNotes: 'No known chronic conditions.',
  },
  {
    userId: 'c4f7b876-c990-4faa-a297-06877fb5e305',
    profileId: '734fd3aa-cd0d-4a50-a8d6-b9ff1306c317',
    email: 'dev.patel@example.local',
    dateOfBirth: dateOnly(1979, 1, 18),
    gender: Gender.MALE,
    emergencyContact: '+91-90000-10004',
    medicalNotes: 'Recovering from a prior knee injury.',
  },
  {
    userId: 'cbe40ac4-723a-4f4d-9fdc-3a7296165d35',
    profileId: 'c3012c24-8172-4b59-9f65-9331148efeb4',
    email: 'farah.khan@example.local',
    dateOfBirth: dateOnly(2000, 5, 30),
    gender: Gender.FEMALE,
    emergencyContact: '+91-90000-10005',
    medicalNotes: 'Sensitive to penicillin.',
  },
  {
    userId: '93849606-f61f-4213-840b-99897e0b7723',
    profileId: 'c41707ad-7211-489f-a355-c59dfe6a188f',
    email: 'neel.verma@example.local',
    dateOfBirth: dateOnly(1988, 9, 9),
    gender: Gender.MALE,
    emergencyContact: '+91-90000-10006',
    medicalNotes: 'Occasional migraines.',
  },
  {
    userId: 'eb5b1d0e-47f2-4a2c-b628-765c250b1a28',
    profileId: '3b5b3eb1-a01e-4511-876e-24a94d613938',
    email: 'isha.nair@example.local',
    dateOfBirth: dateOnly(1994, 12, 2),
    gender: Gender.FEMALE,
    emergencyContact: '+91-90000-10007',
    medicalNotes: 'Uses corrective lenses.',
  },
  {
    userId: '0e3db5de-8cf4-4a1a-84a0-63c6b657acbc',
    profileId: '5936ff5f-f3b7-45d4-aacd-6d09fe7ebf9f',
    email: 'aarav.das@example.local',
    dateOfBirth: dateOnly(2017, 6, 14),
    gender: Gender.MALE,
    emergencyContact: '+91-90000-10008',
    medicalNotes: 'Pediatric patient with routine vaccination follow-up.',
  },
];

async function upsertUser(
  transaction: Prisma.TransactionClient,
  data: Readonly<{ id: string; email: string; role: UserRole }>,
): Promise<void> {
  await transaction.user.upsert({
    where: {
      email: data.email,
    },
    create: {
      id: data.id,
      email: data.email,
      passwordHash: DEVELOPMENT_PASSWORD_HASH,
      role: data.role,
      isActive: true,
      createdBy: admin.userId,
      updatedBy: admin.userId,
    },
    update: {
      passwordHash: DEVELOPMENT_PASSWORD_HASH,
      role: data.role,
      isActive: true,
      updatedBy: admin.userId,
    },
  });
}

async function seedAdmin(transaction: Prisma.TransactionClient): Promise<void> {
  await upsertUser(transaction, {
    id: admin.userId,
    email: 'admin@healthcare.local',
    role: UserRole.ADMIN,
  });

  await transaction.adminProfile.upsert({
    where: {
      userId: admin.userId,
    },
    create: {
      id: admin.profileId,
      userId: admin.userId,
      title: 'Platform Administrator',
      createdBy: admin.userId,
      updatedBy: admin.userId,
    },
    update: {
      title: 'Platform Administrator',
      updatedBy: admin.userId,
    },
  });
}

async function seedDoctor(
  transaction: Prisma.TransactionClient,
  doctor: DoctorSeed,
): Promise<void> {
  const specialization = await transaction.doctorSpecialization.upsert({
    where: {
      name: doctor.specialization,
    },
    create: {
      name: doctor.specialization,
      isActive: true,
      createdBy: admin.userId,
      updatedBy: admin.userId,
    },
    update: {
      isActive: true,
      updatedBy: admin.userId,
    },
  });

  await upsertUser(transaction, {
    id: doctor.userId,
    email: doctor.email,
    role: UserRole.DOCTOR,
  });

  await transaction.doctorProfile.upsert({
    where: {
      userId: doctor.userId,
    },
    create: {
      id: doctor.profileId,
      userId: doctor.userId,
      specializationId: specialization.id,
      experienceYears: doctor.experienceYears,
      consultationFee: doctor.consultationFee,
      slotDuration: doctor.slotDuration,
      bio: doctor.bio,
      isActive: true,
      createdBy: admin.userId,
      updatedBy: admin.userId,
    },
    update: {
      specializationId: specialization.id,
      experienceYears: doctor.experienceYears,
      consultationFee: doctor.consultationFee,
      slotDuration: doctor.slotDuration,
      bio: doctor.bio,
      isActive: true,
      updatedBy: admin.userId,
    },
  });

  for (const availability of doctor.availabilities) {
    const startTime = timeOnly(availability.startHour, availability.startMinute);
    const endTime = timeOnly(availability.endHour, availability.endMinute);

    await transaction.doctorAvailability.upsert({
      where: {
        doctorId_dayOfWeek_startTime_endTime: {
          doctorId: doctor.profileId,
          dayOfWeek: availability.dayOfWeek,
          startTime,
          endTime,
        },
      },
      create: {
        id: availability.id,
        doctorId: doctor.profileId,
        dayOfWeek: availability.dayOfWeek,
        startTime,
        endTime,
        slotDuration: availability.slotDuration,
        isActive: true,
        createdBy: admin.userId,
        updatedBy: admin.userId,
      },
      update: {
        slotDuration: availability.slotDuration,
        isActive: true,
        updatedBy: admin.userId,
      },
    });
  }

  for (const leave of doctor.leaves) {
    await transaction.doctorLeave.upsert({
      where: {
        id: leave.id,
      },
      create: {
        id: leave.id,
        doctorId: doctor.profileId,
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
        status: leave.status,
        createdBy: admin.userId,
        updatedBy: admin.userId,
      },
      update: {
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
        status: leave.status,
        updatedBy: admin.userId,
      },
    });
  }
}

async function seedPatient(
  transaction: Prisma.TransactionClient,
  patient: PatientSeed,
): Promise<void> {
  await upsertUser(transaction, {
    id: patient.userId,
    email: patient.email,
    role: UserRole.PATIENT,
  });

  await transaction.patientProfile.upsert({
    where: {
      userId: patient.userId,
    },
    create: {
      id: patient.profileId,
      userId: patient.userId,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      emergencyContact: patient.emergencyContact,
      medicalNotes: patient.medicalNotes,
      createdBy: admin.userId,
      updatedBy: admin.userId,
    },
    update: {
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      emergencyContact: patient.emergencyContact,
      medicalNotes: patient.medicalNotes,
      updatedBy: admin.userId,
    },
  });
}

async function main(): Promise<void> {
  await prisma.$transaction(async (transaction) => {
    await seedAdmin(transaction);

    for (const doctor of doctors) {
      await seedDoctor(transaction, doctor);
    }

    for (const patient of patients) {
      await seedPatient(transaction, patient);
    }
  });
}

try {
  await main();
} catch (error) {
  console.error('Database seeding failed.', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
