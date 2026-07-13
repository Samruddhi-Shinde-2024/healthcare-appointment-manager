import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, Calendar, XCircle, RotateCcw } from 'lucide-react';
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
  ConfirmDialog,
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
import { formatDateTime } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useRoute } from '../../hooks/useRoute';
import type { Appointment, AppointmentStatus } from '../../types';

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
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');

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
      setRescheduleStart('');
      setRescheduleEnd('');
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
                              setRescheduleStart('');
                              setRescheduleEnd('');
                            }}
                          >
                            Reschedule
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

      {/* Reschedule Modal */}
      <Modal
        description="Select a new date and time for this appointment."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRescheduleModal({ isOpen: false, appointment: null })}
            >
              Cancel
            </Button>
            <Button
              disabled={rescheduleStart === '' || rescheduleEnd === ''}
              loading={rescheduleMutation.isPending}
              onClick={() => {
                if (rescheduleModal.appointment !== null) {
                  void rescheduleMutation.mutate({
                    id: rescheduleModal.appointment.id,
                    startTime: new Date(rescheduleStart).toISOString(),
                    endTime: new Date(rescheduleEnd).toISOString(),
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
        onClose={() => setRescheduleModal({ isOpen: false, appointment: null })}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="reschedule-start">
              New start time
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="reschedule-start"
              min={new Date().toISOString().slice(0, 16)}
              type="datetime-local"
              value={rescheduleStart}
              onChange={(e) => setRescheduleStart(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="reschedule-end">
              New end time
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="reschedule-end"
              min={rescheduleStart !== '' ? rescheduleStart : new Date().toISOString().slice(0, 16)}
              type="datetime-local"
              value={rescheduleEnd}
              onChange={(e) => setRescheduleEnd(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
