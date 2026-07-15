import type {
  ApiFailure,
  ApiSuccess,
  Appointment,
  AuthResponse,
  Availability,
  Doctor,
  Leave,
  MedicationReminder,
  Patient,
  ProcessJobsResult,
  SanitizedUser,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const ACCESS_TOKEN_KEY = 'ham.accessToken';
const REFRESH_TOKEN_KEY = 'ham.refreshToken';
const SESSION_REFRESHED_EVENT = 'ham:session-refreshed';
const SESSION_CLEARED_EVENT = 'ham:session-cleared';

export class ApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Readonly<{
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  params?: Record<string, string | number | boolean>;
}>;

function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  if (params === undefined) return `${API_BASE_URL}${path}`;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value));
  }
  const qs = query.toString();
  return qs.length > 0 ? `${API_BASE_URL}${path}?${qs}` : `${API_BASE_URL}${path}`;
}

function persistRefreshedSession(result: AuthResponse): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, result.tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, result.tokens.refreshToken);
  window.dispatchEvent(new CustomEvent<AuthResponse>(SESSION_REFRESHED_EVENT, { detail: result }));
}

function clearExpiredSession(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  if (refreshToken === null) {
    return null;
  }

  try {
    const response = await request<AuthResponse>(
      '/auth/refresh',
      {
        method: 'POST',
        body: { refreshToken },
      },
      false,
    );
    persistRefreshedSession(response.data);
    return response.data.tokens.accessToken;
  } catch {
    clearExpiredSession();
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retryOnUnauthorized = true,
): Promise<ApiSuccess<T>> {
  const url = buildUrl(path, options.params);
  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token === undefined || options.token === null
        ? {}
        : { Authorization: `Bearer ${options.token}` }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });

  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || !payload.success) {
    if (response.status === 401 && retryOnUnauthorized && options.token !== undefined && options.token !== null) {
      const nextAccessToken = await refreshAccessToken();

      if (nextAccessToken !== null) {
        return request<T>(path, { ...options, token: nextAccessToken }, false);
      }
    }

    const failure = payload as ApiFailure;
    throw new ApiError(
      failure.error?.message ?? 'The API request failed.',
      response.status,
      failure.error?.code ?? 'API_ERROR',
    );
  }

  return payload;
}

// ─── Param builder helpers ────────────────────────────────────────────────────
// Build a params object without undefined values (exactOptionalPropertyTypes safe)
function buildParams(
  raw: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const PAGE_SIZE = 10;

export type AppointmentListParams = Readonly<{
  status?: string;
  doctorId?: string;
  patientId?: string;
  page?: number;
  pageSize?: number;
}>;

export type DoctorListParams = Readonly<{
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}>;

export type PatientListParams = Readonly<{
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}>;

export const api = {
  // ── Auth ──────────────────────────────────────────────────────
  login: (body: Readonly<{ email: string; password: string }>) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body }),

  register: (
    body: Readonly<{
      email: string;
      password: string;
      dateOfBirth?: string;
      gender?: string;
      emergencyContact?: string;
      medicalNotes?: string;
    }>,
  ) => request<AuthResponse>('/auth/register', { method: 'POST', body }),

  me: (token: string) => request<SanitizedUser>('/auth/me', { token }),

  logout: (refreshToken: string) =>
    request<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken } }),

  // ── Appointments ───────────────────────────────────────────────
  appointments: (token: string, params?: AppointmentListParams) =>
    request<Appointment[]>('/appointments', {
      token,
      params: buildParams({ pageSize: PAGE_SIZE, ...params }),
    }),

  appointmentById: (token: string, id: string) =>
    request<Appointment>(`/appointments/${id}`, { token }),

  bookAppointment: (
    token: string,
    body: Readonly<{
      doctorId: string;
      patientId?: string;
      startTime: string;
      endTime: string;
      symptomSubmission?: {
        symptoms: string;
        duration?: string;
        severity?: string;
        additionalNotes?: string;
      };
    }>,
  ) => request<Appointment>('/appointments', { method: 'POST', token, body }),

  rescheduleAppointment: (
    token: string,
    id: string,
    body: Readonly<{ startTime: string; endTime: string }>,
  ) => request<Appointment>(`/appointments/${id}/reschedule`, { method: 'POST', token, body }),

  cancelAppointment: (
    token: string,
    id: string,
    body: Readonly<{ cancellationReason: string }>,
  ) => request<Appointment>(`/appointments/${id}/cancel`, { method: 'POST', token, body }),

  updateAppointment: (
    token: string,
    id: string,
    body: Readonly<{ status: 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' }>,
  ) => request<Appointment>(`/appointments/${id}`, { method: 'PATCH', token, body }),

  // ── AI Summaries ───────────────────────────────────────────────
  generatePreSummary: (token: string, appointmentId: string) =>
    request<unknown>(`/appointments/${appointmentId}/pre-summary`, { method: 'POST', token }),

  generatePostSummary: (token: string, appointmentId: string) =>
    request<unknown>(`/appointments/${appointmentId}/post-summary`, { method: 'POST', token }),

  // ── Doctors ────────────────────────────────────────────────────
  doctorsDirectory: (token: string, params?: DoctorListParams) =>
    request<Doctor[]>('/doctors', {
      token,
      params: buildParams({ pageSize: PAGE_SIZE, ...params }),
    }),

  doctorsList: (token: string, params?: DoctorListParams) =>
    request<Doctor[]>('/admin/doctors', {
      token,
      params: buildParams({ pageSize: PAGE_SIZE, ...params }),
    }),

  doctorById: (token: string, id: string) =>
    request<Doctor>(`/admin/doctors/${id}`, { token }),

  doctorAvailability: (token: string, doctorId: string, params?: { isActive?: boolean }) =>
    request<Availability[]>(`/doctors/${doctorId}/availability`, {
      token,
      ...(params !== undefined ? { params: buildParams(params) } : {}),
    }),

  createDoctor: (
    token: string,
    body: Readonly<{
      email: string;
      password: string;
      specializationName: string;
      experienceYears: number;
      consultationFee: number;
      slotDuration: number;
      bio?: string;
    }>,
  ) => request<Doctor>('/admin/doctors', { method: 'POST', token, body }),

  updateDoctor: (
    token: string,
    id: string,
    body: Readonly<{
      email?: string;
      specializationName?: string;
      experienceYears?: number;
      consultationFee?: number;
      slotDuration?: number;
      bio?: string | null;
      isActive?: boolean;
    }>,
  ) => request<Doctor>(`/admin/doctors/${id}`, { method: 'PATCH', token, body }),

  deactivateDoctor: (token: string, id: string) =>
    request<Doctor>(`/admin/doctors/${id}`, { method: 'DELETE', token }),

  // ── Availability ───────────────────────────────────────────────
  createAvailability: (
    token: string,
    body: Readonly<{
      doctorId: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      slotDuration: number;
      isActive?: boolean;
    }>,
  ) => request<Availability>('/admin/availability', { method: 'POST', token, body }),

  updateAvailability: (
    token: string,
    id: string,
    body: Readonly<{
      dayOfWeek?: string;
      startTime?: string;
      endTime?: string;
      slotDuration?: number;
      isActive?: boolean;
    }>,
  ) => request<Availability>(`/admin/availability/${id}`, { method: 'PATCH', token, body }),

  deleteAvailability: (token: string, id: string) =>
    request<void>(`/admin/availability/${id}`, { method: 'DELETE', token }),

  // ── Leave ──────────────────────────────────────────────────────
  leaves: (token: string, params?: { doctorId?: string; status?: string }) =>
    request<Leave[]>('/doctors/leave', {
      token,
      ...(params !== undefined ? { params: buildParams(params) } : {}),
    }),

  createLeave: (
    token: string,
    body: Readonly<{ doctorId?: string; startDate: string; endDate: string; reason?: string }>,
  ) => request<Leave>('/doctors/leave', { method: 'POST', token, body }),

  updateLeave: (
    token: string,
    id: string,
    body: Readonly<{
      startDate?: string;
      endDate?: string;
      reason?: string | null;
      status?: string;
    }>,
  ) => request<Leave>(`/doctors/leave/${id}`, { method: 'PATCH', token, body }),

  cancelLeave: (token: string, id: string) =>
    request<void>(`/doctors/leave/${id}`, { method: 'DELETE', token }),

  // ── Patients ───────────────────────────────────────────────────
  patients: (token: string, params?: PatientListParams) =>
    request<Patient[]>('/admin/patients', {
      token,
      params: buildParams({ pageSize: PAGE_SIZE, ...params }),
    }),

  patientById: (token: string, id: string) =>
    request<Patient>(`/admin/patients/${id}`, { token }),

  updatePatient: (
    token: string,
    id: string,
    body: Readonly<{
      email?: string;
      dateOfBirth?: string | null;
      gender?: string | null;
      emergencyContact?: string | null;
      medicalNotes?: string | null;
      isActive?: boolean;
    }>,
  ) => request<Patient>(`/admin/patients/${id}`, { method: 'PATCH', token, body }),

  deactivatePatient: (token: string, id: string) =>
    request<Patient>(`/admin/patients/${id}`, { method: 'DELETE', token }),

  // ── Medication Reminders ───────────────────────────────────────
  medicationReminders: (
    token: string,
    params?: { prescriptionId?: string; patientId?: string; status?: string },
  ) =>
    request<MedicationReminder[]>('/medication-reminders', {
      token,
      ...(params !== undefined ? { params: buildParams(params) } : {}),
    }),

  createMedicationReminders: (
    token: string,
    body: Readonly<{ prescriptionId: string; scheduledAt: string[] }>,
  ) => request<MedicationReminder[]>('/medication-reminders', { method: 'POST', token, body }),

  updateReminderStatus: (
    token: string,
    id: string,
    body: Readonly<{ status: 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED' }>,
  ) =>
    request<MedicationReminder>(`/medication-reminders/${id}/status`, {
      method: 'PATCH',
      token,
      body,
    }),

  // ── Calendar ───────────────────────────────────────────────────
  calendarConnect: (token: string) =>
    request<{ authorizationUrl: string }>('/calendar/google/connect', { token }),

  calendarDisconnect: (token: string) =>
    request<void>('/calendar/google', { method: 'DELETE', token }),

  // ── Background Jobs ────────────────────────────────────────────
  processJobs: (token: string) =>
    request<ProcessJobsResult>('/admin/jobs/process', { method: 'POST', token, body: { limit: 5 } }),
};
