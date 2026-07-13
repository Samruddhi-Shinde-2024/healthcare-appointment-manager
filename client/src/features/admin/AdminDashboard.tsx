import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserCheck,
  Calendar,
  Zap,
  ArrowRight,
  Play,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { MetricCard, Card, StatusBadge, Skeleton, Button, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useRoute } from '../../hooks/useRoute';
import { useToast } from '../../context/ToastContext';

export function AdminDashboard(): React.JSX.Element {
  const { accessToken } = useAuth();
  const { navigate } = useRoute();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [jobResult, setJobResult] = useState<{ processed: number; completed: number; failed: number } | null>(null);

  const { data: appointmentsData, isLoading: apptLoading } = useQuery({
    queryKey: ['appointments', 'admin-dashboard', accessToken],
    queryFn: () => api.appointments(accessToken!, { pageSize: 20 }),
    enabled: accessToken !== null,
  });

  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors', 'admin-dashboard', accessToken],
    queryFn: () => api.doctorsList(accessToken!, { pageSize: 100 }),
    enabled: accessToken !== null,
  });

  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients', 'admin-dashboard', accessToken],
    queryFn: () => api.patients(accessToken!, { pageSize: 100 }),
    enabled: accessToken !== null,
  });

  const processJobsMutation = useMutation({
    mutationFn: () => api.processJobs(accessToken!),
    onSuccess: (res) => {
      setJobResult(res.data);
      notify(`Jobs processed: ${res.data.completed} completed, ${res.data.failed} failed`, 'success');
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: () => notify('Failed to process background jobs.', 'error'),
  });

  const appointments = appointmentsData?.data ?? [];
  const doctors = doctorsData?.data ?? [];
  const patients = patientsData?.data ?? [];

  const activeDoctors = doctors.filter((d) => d.isActive).length;
  const confirmedAppts = appointments.filter((a) => a.status === 'CONFIRMED').length;

  const isLoading = apptLoading || doctorsLoading || patientsLoading;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Platform overview and management</p>
        </div>
        <Button
          leftIcon={<Play className="h-4 w-4" />}
          loading={processJobsMutation.isPending}
          variant="secondary"
          onClick={() => void processJobsMutation.mutate()}
        >
          Process Jobs
        </Button>
      </div>

      {/* Job result */}
      {jobResult !== null && (
        <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <div className="flex gap-6 text-sm">
            <span className="text-slate-700">Processed: <strong>{jobResult.processed}</strong></span>
            <span className="text-emerald-700">Completed: <strong>{jobResult.completed}</strong></span>
            <span className="text-rose-700">Failed: <strong>{jobResult.failed}</strong></span>
          </div>
          <button
            className="ml-auto text-slate-400 hover:text-slate-600"
            type="button"
            onClick={() => setJobResult(null)}
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <MetricCard
              detail={`${activeDoctors} active`}
              icon={<UserCheck className="h-5 w-5" />}
              label="Total Doctors"
              value={doctors.length}
            />
            <MetricCard
              detail={`${patients.filter((p) => p.isActive).length} active`}
              icon={<Users className="h-5 w-5" />}
              label="Total Patients"
              value={patients.length}
            />
            <MetricCard
              detail="Currently confirmed"
              icon={<Calendar className="h-5 w-5" />}
              label="Confirmed Apts"
              value={confirmedAppts}
            />
            <MetricCard
              detail="All time"
              icon={<Zap className="h-5 w-5" />}
              label="Total Appointments"
              value={appointments.length}
            />
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Manage Doctors', desc: 'Create, update, and deactivate doctors', route: '/app/admin/doctors' as const, color: 'brand' },
          { label: 'Manage Patients', desc: 'View and manage patient records', route: '/app/admin/patients' as const, color: 'violet' },
          { label: 'Availability', desc: 'Configure doctor schedules', route: '/app/admin/availability' as const, color: 'amber' },
          { label: 'Leave Management', desc: 'Approve and track doctor leaves', route: '/app/admin/leave' as const, color: 'rose' },
          { label: 'All Appointments', desc: 'Full platform appointment view', route: '/app/appointments' as const, color: 'emerald' },
          { label: 'Medication Reminders', desc: 'Track reminder delivery', route: '/app/reminders' as const, color: 'blue' },
        ].map((link) => (
          <button
            key={link.route}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
            type="button"
            onClick={() => navigate(link.route)}
          >
            <div>
              <p className="font-semibold text-slate-900">{link.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{link.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-600" />
          </button>
        ))}
      </div>

      {/* Recent appointments */}
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Recent Appointments</h2>
          <Button
            rightIcon={<ArrowRight className="h-4 w-4" />}
            size="sm"
            variant="ghost"
            onClick={() => navigate('/app/appointments')}
          >
            View all
          </Button>
        </div>
        {apptLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.slice(0, 8).map((appt) => (
              <div
                key={appt.id}
                className="flex items-center gap-4 rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {appt.patientEmail}
                    </span>
                    <Badge tone="slate">→</Badge>
                    <span className="truncate text-sm text-slate-600">
                      {appt.doctorSpecialization}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(appt.startTime)}</p>
                </div>
                <StatusBadge status={appt.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
