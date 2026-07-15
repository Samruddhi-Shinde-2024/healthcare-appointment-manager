import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, Calendar, XCircle, RotateCcw, Brain } from 'lucide-react';
import {
  PageHeader,
  Card,
  StatusBadge,
  Skeleton,
  EmptyState,
  Button,
  Select,
  Modal,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Pagination,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { addMinutes, formatDateTime } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useRoute } from '../../hooks/useRoute';
import type { Appointment, Availability } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'HELD', label: 'Held' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'EXPIRED', label: 'Expired' },
];

type CancelModalState = Readonly<{ isOpen: boolean; appointmentId: string }>;
type RescheduleModalState = Readonly<{ isOpen: boolean; appointment: Appointment | null }>;
type SummaryModalState = Readonly<{ isOpen: boolean; appointment: Appointment | null }>;
type AppointmentSlot = Readonly<{ startTime: Date; endTime: Date }>;

function generateSlots(availability: Availability[], selectedDate: string): AppointmentSlot[] {
  if (selectedDate === '') return [];

  const date = new Date(selectedDate);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const slots: AppointmentSlot[] = [];

  for (const avail of availability) {
    if (!avail.isActive || avail.dayOfWeek !== dayName) continue;

    const [startHour = 0, startMin = 0] = avail.startTime.split(':').map(Number);
    const [endHour = 0, endMin = 0] = avail.endTime.split(':').map(Number);

    let current = new Date(date);
    current.setHours(startHour, startMin, 0, 0);

    const endBound = new Date(date);
    endBound.setHours(endHour, endMin, 0, 0);

    while (current.getTime() < endBound.getTime()) {
      const slotEnd = addMinutes(current, avail.slotDuration);
      if (slotEnd.getTime() > endBound.getTime()) break;

      if (current.getTime() > Date.now()) {
        slots.push({ startTime: new Date(current), endTime: slotEnd });
      }

      current = slotEnd;
    }
  }

  return slots;
}

export function AppointmentsPage(): React.JSX.Element {
  const { accessToken, user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const { navigate } = useRoute();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelModal, setCancelModal] = useState<CancelModalState>({ isOpen: false, appointmentId: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleModal, setRescheduleModal] = useState<RescheduleModalState>({
    isOpen: false,
    appointment: null,
  });
  const [summaryModal, setSummaryModal] = useState<SummaryModalState>({
    isOpen: false,
    appointment: null,
  });
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<AppointmentSlot | null>(null);

  const queryKey = ['appointments', 'list', accessToken, page, statusFilter];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.appointments(accessToken!, {
        page,
        pageSize: 10,
        ...(statusFilter !== '' ? { status: statusFilter } : {}),
      }),
    enabled: accessToken !== null,
  });

  const appointments = data?.data ?? [];
  const meta = data?.meta;
  const rescheduleAppointment = rescheduleModal.appointment;

  const { data: rescheduleAvailabilityData, isLoading: rescheduleAvailabilityLoading } = useQuery({
    queryKey: ['availability', 'reschedule', rescheduleAppointment?.doctorId, accessToken],
    queryFn: () =>
      api.doctorAvailability(accessToken!, rescheduleAppointment!.doctorId, { isActive: true }),
    enabled: accessToken !== null && rescheduleAppointment !== null,
  });

  const rescheduleAvailability = rescheduleAvailabilityData?.data ?? [];
  const rescheduleSlots = generateSlots(rescheduleAvailability, rescheduleDate);
  const minRescheduleDate = new Date();
  minRescheduleDate.setDate(minRescheduleDate.getDate() + 1);
  const minRescheduleDateString = minRescheduleDate.toISOString().slice(0, 10);

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.cancelAppointment(accessToken!, id, { cancellationReason: reason }),
    onSuccess: () => {
      notify('Appointment cancelled successfully.', 'success');
      setCancelModal({ isOpen: false, appointmentId: '' });
      setCancelReason('');
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to cancel.', 'error'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, startTime, endTime }: { id: string; startTime: string; endTime: string }) =>
      api.rescheduleAppointment(accessToken!, id, { startTime, endTime }),
    onSuccess: () => {
      notify('Appointment rescheduled successfully.', 'success');
      setRescheduleModal({ isOpen: false, appointment: null });
      setRescheduleDate('');
      setSelectedRescheduleSlot(null);
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to reschedule.', 'error'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'COMPLETED' | 'NO_SHOW' }) =>
      api.updateAppointment(accessToken!, id, { status }),
    onSuccess: (_, vars) => {
      notify(`Appointment marked as ${vars.status.toLowerCase().replace('_', ' ')}.`, 'success');
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to update status.', 'error'),
  });

  const canCancel = (appt: Appointment): boolean =>
    appt.status === 'CONFIRMED' || appt.status === 'HELD';

  const canReschedule = (appt: Appointment): boolean => appt.status === 'CONFIRMED';

  const canUpdateStatus = (appt: Appointment): boolean =>
    (user?.role === 'DOCTOR' || user?.role === 'ADMIN') && appt.status === 'CONFIRMED';

  const canViewSummary = (appt: Appointment): boolean =>
    appt.preVisitSummary !== null || appt.postVisitSummary !== null || appt.symptoms !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Manage your scheduled appointments"
        action={
          user?.role === 'PATIENT' ? (
            <Button onClick={() => navigate('/app/appointments/book')}>Book Appointment</Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select
            className="max-w-48"
            options={STATUS_OPTIONS}
            placeholder="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
          {statusFilter !== '' && (
            <Button
              leftIcon={<RotateCcw className="h-3 w-3" />}
              size="sm"
              variant="ghost"
              onClick={() => { setStatusFilter(''); setPage(1); }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Calendar className="h-6 w-6" />}
              title="No appointments found"
              description={statusFilter !== '' ? 'Try a different status filter.' : 'No appointments have been booked yet.'}
              action={
                user?.role === 'PATIENT' ? (
                  <Button size="sm" onClick={() => navigate('/app/appointments/book')}>
                    Book an Appointment
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor / Specialization</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell>
                      <span className="font-medium text-slate-900">{appt.patientEmail}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-slate-900">{appt.doctorEmail}</p>
                        <p className="text-xs text-slate-400">{appt.doctorSpecialization}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{formatDateTime(appt.startTime)}</p>
                        <p className="text-xs text-slate-400">→ {formatDateTime(appt.endTime)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={appt.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canReschedule(appt) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setRescheduleModal({ isOpen: true, appointment: appt });
                              setRescheduleDate('');
                              setSelectedRescheduleSlot(null);
                            }}
                          >
                            Reschedule
                          </Button>
                        )}
                        {canViewSummary(appt) && (
                          <Button
                            leftIcon={<Brain className="h-3 w-3" />}
                            size="sm"
                            variant="ghost"
                            onClick={() => setSummaryModal({ isOpen: true, appointment: appt })}
                          >
                            Summary
                          </Button>
                        )}
                        {canUpdateStatus(appt) && (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                void updateStatusMutation.mutate({ id: appt.id, status: 'COMPLETED' })
                              }
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void updateStatusMutation.mutate({ id: appt.id, status: 'NO_SHOW' })
                              }
                            >
                              No Show
                            </Button>
                          </>
                        )}
                        {canCancel(appt) && (
                          <Button
                            leftIcon={<XCircle className="h-3 w-3" />}
                            size="sm"
                            variant="danger"
                            onClick={() =>
                              setCancelModal({ isOpen: true, appointmentId: appt.id })
                            }
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {meta !== undefined && (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                onPage={setPage}
              />
            )}
          </>
        )}
      </Card>

      {/* Cancel Modal */}
      <Modal
        description="This action cannot be undone. Please provide a reason."
        footer={
          <>
            <Button
              disabled={cancelMutation.isPending}
              variant="secondary"
              onClick={() => { setCancelModal({ isOpen: false, appointmentId: '' }); setCancelReason(''); }}
            >
              Keep Appointment
            </Button>
            <Button
              disabled={cancelReason.trim().length < 3}
              loading={cancelMutation.isPending}
              variant="danger"
              onClick={() =>
                void cancelMutation.mutate({ id: cancelModal.appointmentId, reason: cancelReason })
              }
            >
              Cancel Appointment
            </Button>
          </>
        }
        isOpen={cancelModal.isOpen}
        size="sm"
        title="Cancel Appointment"
        onClose={() => { setCancelModal({ isOpen: false, appointmentId: '' }); setCancelReason(''); }}
      >
        <Textarea
          label="Cancellation reason"
          placeholder="e.g. Patient requested cancellation due to conflict"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
        />
      </Modal>

      <Modal
        isOpen={summaryModal.isOpen}
        size="lg"
        title="Appointment Summary"
        onClose={() => setSummaryModal({ isOpen: false, appointment: null })}
      >
        {summaryModal.appointment !== null && (
          <div className="space-y-5">
            {summaryModal.appointment.symptoms !== null && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Patient symptoms</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {summaryModal.appointment.symptoms.symptoms}
                </p>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <span>Duration: {summaryModal.appointment.symptoms.duration ?? 'Not provided'}</span>
                  <span>Severity: {summaryModal.appointment.symptoms.severity ?? 'Not provided'}</span>
                </div>
                {summaryModal.appointment.symptoms.additionalNotes !== null && (
                  <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500">
                    {summaryModal.appointment.symptoms.additionalNotes}
                  </p>
                )}
              </div>
            )}

            {summaryModal.appointment.preVisitSummary !== null && (
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Doctor-facing pre-visit summary</h3>
                  <StatusBadge status={summaryModal.appointment.status} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {summaryModal.appointment.preVisitSummary.content}
                </p>
                {summaryModal.appointment.preVisitSummary.chiefComplaint !== null && (
                  <p className="mt-3 text-xs text-slate-500">
                    Chief complaint: {summaryModal.appointment.preVisitSummary.chiefComplaint}
                  </p>
                )}
              </div>
            )}

            {summaryModal.appointment.postVisitSummary !== null && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Patient-friendly visit summary</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {summaryModal.appointment.postVisitSummary.content}
                </p>
                {summaryModal.appointment.postVisitSummary.followUpGuidance !== null && (
                  <p className="mt-3 whitespace-pre-wrap text-xs text-slate-500">
                    {summaryModal.appointment.postVisitSummary.followUpGuidance}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        description="Select a new date and time for this appointment."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRescheduleModal({ isOpen: false, appointment: null });
                setRescheduleDate('');
                setSelectedRescheduleSlot(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={selectedRescheduleSlot === null}
              loading={rescheduleMutation.isPending}
              onClick={() => {
                if (rescheduleAppointment !== null && selectedRescheduleSlot !== null) {
                  void rescheduleMutation.mutate({
                    id: rescheduleAppointment.id,
                    startTime: selectedRescheduleSlot.startTime.toISOString(),
                    endTime: selectedRescheduleSlot.endTime.toISOString(),
                  });
                }
              }}
            >
              Reschedule
            </Button>
          </>
        }
        isOpen={rescheduleModal.isOpen}
        title="Reschedule Appointment"
        onClose={() => {
          setRescheduleModal({ isOpen: false, appointment: null });
          setRescheduleDate('');
          setSelectedRescheduleSlot(null);
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="reschedule-date">
              New appointment date
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="reschedule-date"
              min={minRescheduleDateString}
              type="date"
              value={rescheduleDate}
              onChange={(event) => {
                setRescheduleDate(event.target.value);
                setSelectedRescheduleSlot(null);
              }}
            />
          </div>

          {rescheduleAvailabilityLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-10" />
              ))}
            </div>
          ) : rescheduleDate !== '' && rescheduleSlots.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              No valid slots are available on this date. Choose a date that matches the doctor&apos;s availability.
            </div>
          ) : rescheduleDate !== '' ? (
            <div>
              <p className="mb-3 text-sm font-medium text-slate-600">
                Select one of the doctor&apos;s configured slots
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {rescheduleSlots.map((slot) => (
                  <button
                    key={slot.startTime.toISOString()}
                    className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                      selectedRescheduleSlot?.startTime.getTime() === slot.startTime.getTime()
                        ? 'border-brand-500 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                    }`}
                    type="button"
                    onClick={() => setSelectedRescheduleSlot(slot)}
                  >
                    {slot.startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a date to see valid reschedule slots.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
