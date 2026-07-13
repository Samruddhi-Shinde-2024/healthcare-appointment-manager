import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, XCircle } from 'lucide-react';
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
  Pagination,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import type { Leave } from '../../types';

type LeaveForm = {
  doctorId: string;
  startDate: string;
  endDate: string;
  reason: string;
};

const EMPTY_FORM: LeaveForm = { doctorId: '', startDate: '', endDate: '', reason: '' };

export function LeaveAdminPage(): React.JSX.Element {
  const { accessToken, user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [cancelLeave, setCancelLeave] = useState<Leave | null>(null);
  const [form, setForm] = useState<LeaveForm>(EMPTY_FORM);

  const isAdmin = user?.role === 'ADMIN';

  const { data: doctorsData } = useQuery({
    queryKey: ['doctors', 'leave-admin', accessToken],
    queryFn: () => api.doctorsList(accessToken!, { isActive: true, pageSize: 100 }),
    enabled: isAdmin && accessToken !== null,
  });

  const doctors = doctorsData?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', accessToken, page],
    queryFn: () => api.leaves(accessToken!),
    enabled: accessToken !== null,
  });

  const leaves = data?.data ?? [];
  const paginatedLeaves = leaves.slice((page - 1) * 10, page * 10);
  const totalPages = Math.ceil(leaves.length / 10);

  const invalidate = (): void => { void queryClient.invalidateQueries({ queryKey: ['leaves'] }); };

  const createMutation = useMutation({
    mutationFn: () =>
      api.createLeave(accessToken!, {
        ...(isAdmin && form.doctorId !== '' ? { doctorId: form.doctorId } : {}),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        reason: form.reason !== '' ? form.reason : undefined,
      }),
    onSuccess: () => {
      notify('Leave created.', 'success');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to create leave.', 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelLeave(accessToken!, cancelLeave!.id),
    onSuccess: () => {
      notify('Leave cancelled.', 'success');
      setCancelLeave(null);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to cancel leave.', 'error'),
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        subtitle={isAdmin ? 'View and manage doctor leaves' : 'Manage your leave requests'}
        action={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Request Leave
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No leaves recorded"
              description="Leave requests will appear here once created."
              action={<Button size="sm" onClick={() => setCreateOpen(true)}>Request Leave</Button>}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                {isAdmin && <TableHead>Doctor</TableHead>}
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Affected Apts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableHeader>
              <TableBody>
                {paginatedLeaves.map((leave) => (
                  <TableRow key={leave.id}>
                    {isAdmin && (
                      <TableCell>
                        <span className="font-medium text-slate-900">
                          {doctors.find((d) => d.id === leave.doctorId)?.email ?? leave.doctorId.slice(0, 8)}
                        </span>
                      </TableCell>
                    )}
                    <TableCell>{formatDate(leave.startDate)}</TableCell>
                    <TableCell>{formatDate(leave.endDate)}</TableCell>
                    <TableCell>
                      {leave.reason !== null ? (
                        <span className="max-w-xs truncate">{leave.reason}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {leave.affectedAppointmentIds.length > 0 ? (
                        <Badge tone="amber">{leave.affectedAppointmentIds.length} affected</Badge>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge tone={leave.status === 'ACTIVE' ? 'teal' : 'slate'}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {leave.status === 'ACTIVE' && (
                        <Button
                          leftIcon={<XCircle className="h-3 w-3" />}
                          size="sm"
                          variant="danger"
                          onClick={() => setCancelLeave(leave)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </>
        )}
      </Card>

      {/* Create Leave Modal */}
      <Modal
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button
              disabled={form.startDate === '' || form.endDate === ''}
              loading={createMutation.isPending}
              onClick={() => void createMutation.mutate()}
            >
              Submit Leave
            </Button>
          </>
        }
        isOpen={createOpen}
        title="Request Leave"
        description="Leave periods will automatically cancel affected confirmed appointments."
        onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}
      >
        <div className="space-y-4">
          {isAdmin && (
            <Select
              label="Doctor"
              options={doctors.map((d) => ({ value: d.id, label: d.email }))}
              placeholder="Select doctor…"
              value={form.doctorId}
              onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="lv-start">Start Date</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                id="lv-start"
                min={today}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="lv-end">End Date</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                id="lv-end"
                min={form.startDate !== '' ? form.startDate : today}
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="lv-reason">Reason (optional)</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="lv-reason"
              placeholder="Conference, personal leave, medical…"
              rows={3}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Cancel Confirm */}
      <ConfirmDialog
        confirmLabel="Cancel Leave"
        description="Cancelling this leave will restore availability for the period. Previously cancelled appointments will not be automatically restored."
        isLoading={cancelMutation.isPending}
        isOpen={cancelLeave !== null}
        title="Cancel Leave Request"
        onClose={() => setCancelLeave(null)}
        onConfirm={() => void cancelMutation.mutate()}
      />
    </div>
  );
}
