import { useQuery } from '@tanstack/react-query';
import { Calendar, CheckCircle, Users, Clock, ArrowRight } from 'lucide-react';
import { MetricCard, Card, StatusBadge, Skeleton, EmptyState, Button, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useRoute } from '../../hooks/useRoute';
import type { Appointment } from '../../types';

function TodayAppointmentRow({
  appointment,
}: Readonly<{ appointment: Appointment }>): React.JSX.Element {
  const startTime = new Date(appointment.startTime);
  const isNow =
    startTime.getTime() <= Date.now() &&
    new Date(appointment.endTime).getTime() >= Date.now();

  return (
    <div className={`flex items-center gap-4 rounded-xl p-4 transition ${isNow ? 'border border-brand-200 bg-brand-50' : 'border border-slate-100 bg-white'}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${isNow ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
        {startTime.getHours().toString().padStart(2, '0')}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {appointment.patientEmail.split('@')[0]}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(appointment.startTime)}</p>
      </div>
      <div className="flex items-center gap-2">
        {isNow && <Badge tone="teal">In progress</Badge>}
        <StatusBadge status={appointment.status} />
      </div>
    </div>
  );
}

export function DoctorDashboard(): React.JSX.Element {
  const { user, accessToken } = useAuth();
  const { navigate } = useRoute();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', 'doctor-dashboard', accessToken],
    queryFn: () => api.appointments(accessToken!, { pageSize: 100 }),
    enabled: accessToken !== null,
  });

  const appointments = data?.data ?? [];
  const today = new Date().toDateString();
  const todayAppts = appointments.filter(
    (a) => new Date(a.startTime).toDateString() === today,
  );
  const upcoming = appointments.filter(
    (a) => a.status === 'CONFIRMED' && new Date(a.startTime) > new Date(),
  );
  const completed = appointments.filter((a) => a.status === 'COMPLETED');
  const uniquePatients = new Set(appointments.map((a) => a.patientId)).size;

  const firstName = user?.email.split('@')[0] ?? 'Doctor';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {new Date().getHours() < 12 ? 'Good morning' : 'Good afternoon'}, Dr. {firstName} 👨‍⚕️
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {todayAppts.length > 0
            ? `You have ${todayAppts.length} appointment${todayAppts.length !== 1 ? 's' : ''} today.`
            : 'No appointments scheduled for today.'}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <MetricCard
              detail="Scheduled visits"
              icon={<Calendar className="h-5 w-5" />}
              label="Today's Patients"
              value={todayAppts.length}
            />
            <MetricCard
              detail="Future sessions"
              icon={<Clock className="h-5 w-5" />}
              label="Upcoming"
              value={upcoming.length}
            />
            <MetricCard
              detail="Consultations done"
              icon={<CheckCircle className="h-5 w-5" />}
              label="Completed"
              value={completed.length}
            />
            <MetricCard
              detail="Under your care"
              icon={<Users className="h-5 w-5" />}
              label="Total Patients"
              value={uniquePatients}
            />
          </>
        )}
      </div>

      {/* Today's schedule */}
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Today&apos;s Schedule</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button
            rightIcon={<ArrowRight className="h-4 w-4" />}
            size="sm"
            variant="ghost"
            onClick={() => navigate('/app/appointments')}
          >
            All appointments
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : todayAppts.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            description="Enjoy your free day or check upcoming appointments."
            title="No appointments today"
          />
        ) : (
          <div className="space-y-2">
            {todayAppts.map((appt) => (
              <TodayAppointmentRow key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
