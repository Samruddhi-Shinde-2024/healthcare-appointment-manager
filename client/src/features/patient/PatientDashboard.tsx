import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle, Clock, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { MetricCard, Card, StatusBadge, Skeleton, EmptyState, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useRoute } from '../../hooks/useRoute';
import type { Appointment } from '../../types';

function UpcomingAppointmentCard({
  appointment,
}: Readonly<{ appointment: Appointment }>): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50">
        <span className="text-xs font-semibold text-brand-600">
          {new Date(appointment.startTime).toLocaleDateString(undefined, { month: 'short' })}
        </span>
        <span className="text-lg font-bold leading-none text-brand-700">
          {new Date(appointment.startTime).getDate()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          Dr. {appointment.doctorEmail.split('@')[0]}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{appointment.doctorSpecialization}</p>
        <p className="mt-1 text-xs text-slate-400">{formatDateTime(appointment.startTime)}</p>
      </div>
      <StatusBadge status={appointment.status} />
    </div>
  );
}

export function PatientDashboard(): React.JSX.Element {
  const { user, accessToken } = useAuth();
  const { navigate } = useRoute();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'patient-dashboard', accessToken],
    queryFn: () => api.appointments(accessToken!, { pageSize: 50 }),
    enabled: accessToken !== null,
  });

  const appointments = data?.data ?? [];
  const upcoming = appointments.filter(
    (a) => a.status === 'CONFIRMED' && new Date(a.startTime) > new Date(),
  );
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED');

  const firstName = user?.email.split('@')[0] ?? 'there';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good{' '}
          {new Date().getHours() < 12
            ? 'morning'
            : new Date().getHours() < 17
              ? 'afternoon'
              : 'evening'}
          , {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s a summary of your healthcare activity.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <MetricCard
              detail={`${upcoming.length > 0 ? 'Next: ' + new Date(upcoming[0]?.startTime ?? '').toLocaleDateString() : 'No upcoming'}`}
              icon={<Calendar className="h-5 w-5" />}
              label="Upcoming"
              value={upcoming.length}
            />
            <MetricCard
              detail="All time"
              icon={<CheckCircle className="h-5 w-5" />}
              label="Completed"
              value={completed.length}
            />
            <MetricCard
              detail="All time"
              icon={<TrendingUp className="h-5 w-5" />}
              label="Total Booked"
              value={appointments.length}
            />
            <MetricCard
              detail="All time"
              icon={<Clock className="h-5 w-5" />}
              label="Cancelled"
              value={cancelled.length}
            />
          </>
        )}
      </div>

      {/* Upcoming appointments */}
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Upcoming Appointments</h2>
            <p className="mt-0.5 text-xs text-slate-500">Your next scheduled visits</p>
          </div>
          <div className="flex gap-2">
            <Button
              leftIcon={<Plus className="h-4 w-4" />}
              size="sm"
              onClick={() => navigate('/app/appointments/book')}
            >
              Book New
            </Button>
            <Button
              rightIcon={<ArrowRight className="h-4 w-4" />}
              size="sm"
              variant="ghost"
              onClick={() => navigate('/app/appointments')}
            >
              View all
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            description="Book an appointment with one of our qualified doctors."
            title="No upcoming appointments"
            action={
              <Button
                leftIcon={<Plus className="h-4 w-4" />}
                size="sm"
                onClick={() => navigate('/app/appointments/book')}
              >
                Book Appointment
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 5).map((appt) => (
              <UpcomingAppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
