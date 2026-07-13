import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { useState } from 'react';
import {
  PageHeader,
  Card,
  Badge,
  Skeleton,
  EmptyState,
  Select,
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
import type { ReminderStatus } from '../../types';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_TONE: Record<ReminderStatus, 'amber' | 'emerald' | 'rose' | 'slate'> = {
  PENDING: 'amber',
  SENT: 'emerald',
  FAILED: 'rose',
  CANCELLED: 'slate',
};

const STATUS_ICON: Record<ReminderStatus, React.JSX.Element> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  SENT: <CheckCircle className="h-3.5 w-3.5" />,
  FAILED: <XCircle className="h-3.5 w-3.5" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5" />,
};

export function RemindersPage(): React.JSX.Element {
  const { accessToken } = useAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['reminders', accessToken, statusFilter],
    queryFn: () =>
      api.medicationReminders(
        accessToken!,
        statusFilter !== '' ? { status: statusFilter } : undefined,
      ),
    enabled: accessToken !== null,
  });

  const allReminders = data?.data ?? [];
  const totalPages = Math.ceil(allReminders.length / PAGE_SIZE);
  const reminders = allReminders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pending = allReminders.filter((r) => r.status === 'PENDING').length;
  const sent = allReminders.filter((r) => r.status === 'SENT').length;
  const failed = allReminders.filter((r) => r.status === 'FAILED').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medication Reminders"
        subtitle="Track scheduled medication reminder deliveries"
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">{pending}</p>
            <p className="text-sm text-amber-600">Pending</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">{sent}</p>
            <p className="text-sm text-emerald-600">Delivered</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
            <XCircle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-700">{failed}</p>
            <p className="text-sm text-rose-600">Failed</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select
            className="max-w-48"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title="No reminders found"
              description={
                statusFilter !== ''
                  ? 'No reminders match this filter.'
                  : 'Medication reminders will appear here once created.'
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableHead>Patient</TableHead>
                <TableHead>Prescription ID</TableHead>
                <TableHead>Scheduled At</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Retry Count</TableHead>
                <TableHead>Status</TableHead>
              </TableHeader>
              <TableBody>
                {reminders.map((reminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>
                      <span className="font-medium text-slate-900">{reminder.patientEmail}</span>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                        {reminder.prescriptionId.slice(0, 8)}…
                      </code>
                    </TableCell>
                    <TableCell>{formatDateTime(reminder.scheduledAt)}</TableCell>
                    <TableCell>
                      {reminder.sentAt !== null ? (
                        formatDateTime(reminder.sentAt)
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {reminder.retryCount > 0 ? (
                        <Badge tone="amber">{reminder.retryCount}×</Badge>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
                          STATUS_TONE[reminder.status] === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
                            : STATUS_TONE[reminder.status] === 'amber'
                              ? 'bg-amber-50 text-amber-700 ring-amber-200/60'
                              : STATUS_TONE[reminder.status] === 'rose'
                                ? 'bg-rose-50 text-rose-700 ring-rose-200/60'
                                : 'bg-slate-100 text-slate-700 ring-slate-200/60'
                        }`}
                      >
                        {STATUS_ICON[reminder.status]}
                        {reminder.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={page} totalPages={totalPages} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
