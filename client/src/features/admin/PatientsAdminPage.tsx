import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, UserX } from 'lucide-react';
import {
  PageHeader,
  Card,
  Skeleton,
  EmptyState,
  Button,
  Modal,
  ConfirmDialog,
  Badge,
  SearchInput,
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
import type { Patient, Gender } from '../../types';

const GENDER_LABELS: Record<Gender, string> = {
  FEMALE: 'Female',
  MALE: 'Male',
  NON_BINARY: 'Non-binary',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

export function PatientsAdminPage(): React.JSX.Element {
  const { accessToken } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deactivatePatient, setDeactivatePatient] = useState<Patient | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editEmergency, setEditEmergency] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['patients', 'admin', accessToken, page, search],
    queryFn: () =>
      api.patients(accessToken!, {
        ...(search !== '' ? { search } : {}),
        page,
        pageSize: 10,
      }),
    enabled: accessToken !== null,
  });

  const patients = data?.data ?? [];
  const meta = data?.meta;

  const invalidate = (): void => { void queryClient.invalidateQueries({ queryKey: ['patients'] }); };

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updatePatient(accessToken!, editPatient!.id, {
        medicalNotes: editNotes || null,
        emergencyContact: editEmergency || null,
      }),
    onSuccess: () => {
      notify('Patient record updated.', 'success');
      setEditPatient(null);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Update failed.', 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.deactivatePatient(accessToken!, deactivatePatient!.id),
    onSuccess: () => {
      notify('Patient deactivated.', 'success');
      setDeactivatePatient(null);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to deactivate.', 'error'),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Patients"
        subtitle="View and manage patient records"
      />

      <div className="max-w-sm">
        <SearchInput
          placeholder="Search by email…"
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
        />
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : patients.length === 0 ? (
          <div className="p-8">
            <EmptyState title="No patients found" description="Patients appear here after registration." />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableHead>Patient</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Emergency Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableHeader>
              <TableBody>
                {patients.map((pt) => (
                  <TableRow key={pt.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                          {pt.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{pt.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {pt.dateOfBirth !== null ? formatDate(pt.dateOfBirth) : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>
                      {pt.gender !== null ? GENDER_LABELS[pt.gender] : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>
                      {pt.emergencyContact !== null ? pt.emergencyContact : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge tone={pt.isActive ? 'emerald' : 'rose'}>
                        {pt.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          leftIcon={<Pencil className="h-3 w-3" />}
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditPatient(pt);
                            setEditNotes(pt.medicalNotes ?? '');
                            setEditEmergency(pt.emergencyContact ?? '');
                          }}
                        >
                          Edit
                        </Button>
                        {pt.isActive && (
                          <Button
                            leftIcon={<UserX className="h-3 w-3" />}
                            size="sm"
                            variant="danger"
                            onClick={() => setDeactivatePatient(pt)}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {meta !== undefined && <Pagination page={meta.page} totalPages={meta.totalPages} onPage={setPage} />}
          </>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditPatient(null)}>Cancel</Button>
            <Button loading={updateMutation.isPending} onClick={() => void updateMutation.mutate()}>
              Save
            </Button>
          </>
        }
        isOpen={editPatient !== null}
        title="Edit Patient Record"
        {...(editPatient !== null ? { description: editPatient.email } : {})}
        onClose={() => setEditPatient(null)}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="pt-emergency">
              Emergency Contact
            </label>
            <input
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="pt-emergency"
              placeholder="Phone or name"
              value={editEmergency}
              onChange={(e) => setEditEmergency(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="pt-notes">
              Medical Notes
            </label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="pt-notes"
              placeholder="Relevant medical history, allergies…"
              rows={4}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        confirmLabel="Deactivate Patient"
        description={`Deactivating ${deactivatePatient?.email ?? ''} will prevent them from logging in. Their records are preserved.`}
        isLoading={deactivateMutation.isPending}
        isOpen={deactivatePatient !== null}
        title="Deactivate Patient"
        onClose={() => setDeactivatePatient(null)}
        onConfirm={() => void deactivateMutation.mutate()}
      />
    </div>
  );
}
