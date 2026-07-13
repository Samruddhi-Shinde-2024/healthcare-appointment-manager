import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  PageHeader,
  Card,
  Skeleton,
  EmptyState,
  Button,
  Modal,
  Select,
  ConfirmDialog,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import type { Availability, DayOfWeek } from '../../types';

const DAY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'MONDAY', label: 'Monday' },
  { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' },
  { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' },
  { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

type AvailForm = {
  doctorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotDuration: string;
};

const EMPTY_FORM: AvailForm = {
  doctorId: '',
  dayOfWeek: 'MONDAY',
  startTime: '09:00',
  endTime: '17:00',
  slotDuration: '30',
};

export function AvailabilityAdminPage(): React.JSX.Element {
  const { accessToken } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [editAvail, setEditAvail] = useState<Availability | null>(null);
  const [deleteAvail, setDeleteAvail] = useState<Availability | null>(null);
  const [form, setForm] = useState<AvailForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<Partial<AvailForm>>({});
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors', 'availability-admin', accessToken],
    queryFn: () => api.doctorsList(accessToken!, { isActive: true, pageSize: 100 }),
    enabled: accessToken !== null,
  });

  const doctors = doctorsData?.data ?? [];
  const doctorOptions = doctors.map((d) => ({ value: d.id, label: d.email }));

  const { data: availData, isLoading } = useQuery({
    queryKey: ['availability', 'admin', selectedDoctorId, accessToken],
    queryFn: () => api.doctorAvailability(accessToken!, selectedDoctorId),
    enabled: selectedDoctorId !== '' && accessToken !== null,
  });

  const availability = availData?.data ?? [];
  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['availability'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.createAvailability(accessToken!, {
        doctorId: form.doctorId,
        dayOfWeek: form.dayOfWeek,
        startTime: `1970-01-01T${form.startTime}:00.000Z`,
        endTime: `1970-01-01T${form.endTime}:00.000Z`,
        slotDuration: Number(form.slotDuration),
        isActive: true,
      }),
    onSuccess: () => {
      notify('Availability created.', 'success');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to create.', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateAvailability(accessToken!, editAvail!.id, {
        ...(editForm.dayOfWeek !== undefined ? { dayOfWeek: editForm.dayOfWeek } : {}),
        ...(editForm.startTime !== undefined ? { startTime: `1970-01-01T${editForm.startTime}:00.000Z` } : {}),
        ...(editForm.endTime !== undefined ? { endTime: `1970-01-01T${editForm.endTime}:00.000Z` } : {}),
        ...(editForm.slotDuration !== undefined ? { slotDuration: Number(editForm.slotDuration) } : {}),
      }),
    onSuccess: () => {
      notify('Availability updated.', 'success');
      setEditAvail(null);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to update.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAvailability(accessToken!, deleteAvail!.id),
    onSuccess: () => {
      notify('Availability deleted.', 'success');
      setDeleteAvail(null);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to delete.', 'error'),
  });

  function TimeField({
    label, id, value, onChange,
  }: Readonly<{ label: string; id: string; value: string; onChange: (v: string) => void }>): React.JSX.Element {
    return (
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor={id}>{label}</label>
        <input
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          id={id}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  const formatStoredTime = (isoTime: string): string => {
    const d = new Date(isoTime);
    return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor Availability"
        subtitle="Configure weekly schedules and slot durations"
        action={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Add Availability
          </Button>
        }
      />

      {/* Doctor filter */}
      <Card className="p-4">
        <Select
          className="max-w-sm"
          label="Select doctor to view availability"
          options={[{ value: '', label: 'Choose a doctor…' }, ...doctorOptions]}
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
        />
      </Card>

      {/* Table */}
      {selectedDoctorId !== '' && (
        <Card>
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : availability.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No availability configured"
                description="Add a weekly schedule for this doctor."
                action={<Button size="sm" onClick={() => { setForm((f) => ({ ...f, doctorId: selectedDoctorId })); setCreateOpen(true); }}>Add Slot</Button>}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableHead>Day</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Slot Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableHeader>
              <TableBody>
                {availability.map((avail) => (
                  <TableRow key={avail.id}>
                    <TableCell className="font-medium text-slate-900">{DAY_LABELS[avail.dayOfWeek]}</TableCell>
                    <TableCell>{formatStoredTime(avail.startTime)}</TableCell>
                    <TableCell>{formatStoredTime(avail.endTime)}</TableCell>
                    <TableCell>{avail.slotDuration} min</TableCell>
                    <TableCell>
                      <Badge tone={avail.isActive ? 'emerald' : 'slate'}>
                        {avail.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          leftIcon={<Pencil className="h-3 w-3" />}
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditAvail(avail);
                            setEditForm({
                              dayOfWeek: avail.dayOfWeek,
                              startTime: formatStoredTime(avail.startTime),
                              endTime: formatStoredTime(avail.endTime),
                              slotDuration: String(avail.slotDuration),
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          leftIcon={<Trash2 className="h-3 w-3" />}
                          size="sm"
                          variant="danger"
                          onClick={() => setDeleteAvail(avail)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {selectedDoctorId === '' && (
        <EmptyState
          title="Select a doctor"
          description="Choose a doctor above to view and manage their weekly availability."
        />
      )}

      {/* Create Modal */}
      <Modal
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button
              disabled={form.doctorId === ''}
              loading={createMutation.isPending}
              onClick={() => void createMutation.mutate()}
            >
              Create
            </Button>
          </>
        }
        isOpen={createOpen}
        title="Add Availability Slot"
        description="Configure a weekly recurring schedule for a doctor."
        onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}
      >
        <div className="space-y-4">
          <Select
            label="Doctor"
            options={doctorOptions}
            placeholder="Select doctor…"
            value={form.doctorId}
            onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
          />
          <Select
            label="Day of Week"
            options={DAY_OPTIONS}
            value={form.dayOfWeek}
            onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeField label="Start Time" id="ca-start" value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
            <TimeField label="End Time" id="ca-end" value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ca-slot">Slot Duration (minutes)</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="ca-slot"
              min="10"
              type="number"
              value={form.slotDuration}
              onChange={(e) => setForm((f) => ({ ...f, slotDuration: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditAvail(null)}>Cancel</Button>
            <Button loading={updateMutation.isPending} onClick={() => void updateMutation.mutate()}>
              Save
            </Button>
          </>
        }
        isOpen={editAvail !== null}
        title="Edit Availability"
        onClose={() => setEditAvail(null)}
      >
        <div className="space-y-4">
          <Select
            label="Day of Week"
            options={DAY_OPTIONS}
            value={editForm.dayOfWeek ?? ''}
            onChange={(e) => setEditForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TimeField label="Start Time" id="ea-start" value={editForm.startTime ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, startTime: v }))} />
            <TimeField label="End Time" id="ea-end" value={editForm.endTime ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, endTime: v }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ea-slot">Slot Duration (minutes)</label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="ea-slot"
              min="10"
              type="number"
              value={editForm.slotDuration ?? ''}
              onChange={(e) => setEditForm((f) => ({ ...f, slotDuration: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        confirmLabel="Delete Availability"
        description="This will remove this availability slot. Future appointments on this slot will not be affected."
        isLoading={deleteMutation.isPending}
        isOpen={deleteAvail !== null}
        title="Delete Availability Slot"
        onClose={() => setDeleteAvail(null)}
        onConfirm={() => void deleteMutation.mutate()}
      />
    </div>
  );
}
