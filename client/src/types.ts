export type UserRole = 'ADMIN' | 'DOCTOR' | 'PATIENT';

export type Gender = 'FEMALE' | 'MALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type AppointmentStatus = 'HELD' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW';

export type LeaveStatus = 'ACTIVE' | 'CANCELLED';

export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export type ApiMeta = Readonly<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export type ApiSuccess<T> = Readonly<{
  success: true;
  data: T;
  meta?: ApiMeta;
}>;

export type ApiFailure = Readonly<{
  success: false;
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}>;

export type SanitizedUser = Readonly<{
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  patientProfileId: string | null;
  doctorProfileId: string | null;
  adminProfileId: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type TokenPair = Readonly<{
  accessToken: string;
  refreshToken: string;
}>;

export type AuthResponse = Readonly<{
  user: SanitizedUser;
  tokens: TokenPair;
}>;

export type Appointment = Readonly<{
  id: string;
  doctorId: string;
  doctorEmail: string;
  doctorSpecialization: string;
  patientId: string;
  patientEmail: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type Specialization = Readonly<{
  id: string;
  name: string;
}>;

export type Doctor = Readonly<{
  id: string;
  userId: string;
  email: string;
  specialization: Specialization;
  experienceYears: number;
  consultationFee: string;
  slotDuration: number;
  bio: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type Patient = Readonly<{
  id: string;
  userId: string;
  email: string;
  dateOfBirth: string | null;
  gender: Gender | null;
  emergencyContact: string | null;
  medicalNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type Availability = Readonly<{
  id: string;
  doctorId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type Leave = Readonly<{
  id: string;
  doctorId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  affectedAppointmentIds: string[];
  createdAt: string;
  updatedAt: string;
}>;

export type MedicationReminder = Readonly<{
  id: string;
  prescriptionId: string;
  patientId: string;
  patientEmail: string;
  scheduledAt: string;
  status: ReminderStatus;
  retryCount: number;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type LLMSummary = Readonly<{
  id: string;
  appointmentId: string;
  summaryType: 'PRE_VISIT' | 'POST_VISIT';
  content: string;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}>;

export type ProcessJobsResult = Readonly<{
  processed: number;
  completed: number;
  failed: number;
}>;
