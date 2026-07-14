import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, UserX } from 'lucide-react';
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
import { formatCurrency } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import type { Doctor } from '../../types';

type CreateForm = {
  email: string;
  password: string;
  specializationName: string;
  experienceYears: string;
  consultationFee: string;
  slotDuration: string;
  bio: string;
};

const EMPTY_FORM: CreateForm = {
  email: '',
  password: '',
  specializationName: '',
  experienceYears: '',
  consultationFee: '',
  slotDuration: '30',
  bio: '',
};

export function DoctorsAdminPage(): React.JSX.Element {
  const { accessToken } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [deactivateDoctor, setDeactivateDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<Partial<CreateForm>>({});

  const queryKey = ['doctors', 'admin', accessToken, page, search];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      api.doctorsList(accessToken!, {
        ...(search !== '' ? { search } : {}),
        page,
        pageSize: 10,
      }),
    enabled: accessToken !== null,
  });

  const doctors = data?.data ?? [];
  const meta = data?.meta;

  const invalidate = (): void => { void queryClient.invalidateQueries({ queryKey: ['doctors'] }); };

  const createMutation = useMutation({
    mutationFn: () =>
      api.createDoctor(accessToken!, {
        email: form.email,
        password: form.password,
        specializationName: form.specializationName,
        experienceYears: Number(form.experienceYears),
        consultationFee: Number(form.consultationFee),
        slotDuration: Number(form.slotDuration),
        ...(form.bio !== '' ? { bio: form.bio } : {}),
      }),
    onSuccess: () => {
      notify('Doctor created successfully.', 'success');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to create doctor.', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      api.updateDoctor(accessToken!, editDoctor!.id, {
        ...(editForm.email !== undefined && editForm.email !== '' ? { email: editForm.email } : {}),
        ...(editForm.specializationName !== undefined && editForm.specializationName !== '' ? { specializationName: editForm.specializationName } : {}),
        ...(editForm.experienceYears !== undefined && editForm.experienceYears !== '' ? { experienceYears: Number(editForm.experienceYears) } : {}),
        ...(editForm.consultationFee !== undefined && editForm.consultationFee !== '' ? { consultationFee: Number(editForm.consultationFee) } : {}),
        ...(editForm.slotDuration !== undefined && editForm.slotDuration !== '' ? { slotDuration: Number(editForm.slotDuration) } : {}),
        ...(editForm.bio !== undefined ? { bio: editForm.bio || null } : {}),
      }),
    onSuccess: () => {
      notify('Doctor updated.', 'success');
      setEditDoctor(null);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to update.', 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.deactivateDoctor(accessToken!, deactivateDoctor!.id),
    onSuccess: () => {
      notify('Doctor deactivated.', 'success');
      setDeactivateDoctor(null);
      invalidate();
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Failed to deactivate.', 'error'),
  });

  function Field({
    label, id, value, onChange, type = 'text', placeholder,
  }: Readonly<{
    label: string; id: string; value: string;
    onChange: (v: string) => void; type?: string; placeholder?: string;
  }>): React.JSX.Element {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700" htmlFor={id}>{label}</label>
        <input
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
          id={id}
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Doctors"
        subtitle="Create, update, and deactivate doctor accounts"
        action={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Add Doctor
          </Button>
        }
      />

      <div className="max-w-sm">
        <SearchInput
          placeholder="Search by name or specialization…"
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
        />
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No doctors found"
              description="Add a doctor to get started."
              action={<Button size="sm" onClick={() => setCreateOpen(true)}>Add Doctor</Button>}
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableHead>Doctor</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableHeader>
              <TableBody>
                {doctors.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                          {doc.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{doc.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{doc.specialization.name}</TableCell>
                    <TableCell>{doc.experienceYears} yrs</TableCell>
                    <TableCell>{formatCurrency(doc.consultationFee)}</TableCell>
                    <TableCell>{doc.slotDuration} min</TableCell>
                    <TableCell>
                      <Badge tone={doc.isActive ? 'emerald' : 'rose'}>
                        {doc.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          leftIcon={<Pencil className="h-3 w-3" />}
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditDoctor(doc);
                            setEditForm({
                              email: doc.email,
                              specializationName: doc.specialization.name,
                              experienceYears: String(doc.experienceYears),
                              consultationFee: doc.consultationFee,
                              slotDuration: String(doc.slotDuration),
                              bio: doc.bio ?? '',
                            });
                          }}
                        >
                          Edit
                        </Button>
                        {doc.isActive && (
                          <Button
                            leftIcon={<UserX className="h-3 w-3" />}
                            size="sm"
                            variant="danger"
                            onClick={() => setDeactivateDoctor(doc)}
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

      {/* Create Modal */}
      <Modal
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>Cancel</Button>
            <Button
              disabled={form.email === '' || form.password === '' || form.specializationName === ''}
              loading={createMutation.isPending}
              onClick={() => void createMutation.mutate()}
            >
              Create Doctor
            </Button>
          </>
        }
        isOpen={createOpen}
        size="lg"
        title="Add New Doctor"
        description="Create a doctor account with specialization and availability."
        onClose={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" id="cd-email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" placeholder="doctor@clinic.com" />
          <Field label="Password" id="cd-password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} type="password" placeholder="Min. 8 chars" />
          <Field label="Specialization" id="cd-spec" value={form.specializationName} onChange={(v) => setForm((f) => ({ ...f, specializationName: v }))} placeholder="e.g. Cardiologist" />
          <Field label="Experience (years)" id="cd-exp" value={form.experienceYears} onChange={(v) => setForm((f) => ({ ...f, experienceYears: v }))} type="number" placeholder="0" />
          <Field label="Consultation Fee ($)" id="cd-fee" value={form.consultationFee} onChange={(v) => setForm((f) => ({ ...f, consultationFee: v }))} type="number" placeholder="150" />
          <Field label="Slot Duration (min)" id="cd-slot" value={form.slotDuration} onChange={(v) => setForm((f) => ({ ...f, slotDuration: v }))} type="number" placeholder="30" />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="cd-bio">Bio (optional)</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="cd-bio"
              placeholder="Doctor's background and specialization…"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditDoctor(null)}>Cancel</Button>
            <Button loading={updateMutation.isPending} onClick={() => void updateMutation.mutate()}>
              Save Changes
            </Button>
          </>
        }
        isOpen={editDoctor !== null}
        size="lg"
        title="Edit Doctor"
        onClose={() => setEditDoctor(null)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" id="ed-email" value={editForm.email ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, email: v }))} type="email" />
          <Field label="Specialization" id="ed-spec" value={editForm.specializationName ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, specializationName: v }))} />
          <Field label="Experience (years)" id="ed-exp" value={editForm.experienceYears ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, experienceYears: v }))} type="number" />
          <Field label="Fee ($)" id="ed-fee" value={editForm.consultationFee ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, consultationFee: v }))} type="number" />
          <Field label="Slot (min)" id="ed-slot" value={editForm.slotDuration ?? ''} onChange={(v) => setEditForm((f) => ({ ...f, slotDuration: v }))} type="number" />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="ed-bio">Bio</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="ed-bio"
              rows={3}
              value={editForm.bio ?? ''}
              onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        confirmLabel="Deactivate Doctor"
        description={`Deactivating Dr. ${deactivateDoctor?.email ?? ''} will prevent new bookings but preserve existing appointment history.`}
        isLoading={deactivateMutation.isPending}
        isOpen={deactivateDoctor !== null}
        title="Deactivate Doctor"
        onClose={() => setDeactivateDoctor(null)}
        onConfirm={() => void deactivateMutation.mutate()}
      />
    </div>
  );
}
