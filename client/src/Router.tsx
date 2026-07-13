import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import { useRoute } from './hooks/useRoute';
import { AppShell } from './components/layouts/AppShell';
import { AuthLayout } from './components/layouts/AuthLayout';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { PatientDashboard } from './features/patient/PatientDashboard';
import { DoctorDashboard } from './features/doctor/DoctorDashboard';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AppointmentsPage } from './features/appointments/AppointmentsPage';
import { BookAppointmentPage } from './features/appointments/BookAppointmentPage';
import { DoctorsListPage } from './features/doctors/DoctorsListPage';
import { RemindersPage } from './features/reminders/RemindersPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { DoctorsAdminPage } from './features/admin/DoctorsAdminPage';
import { PatientsAdminPage } from './features/admin/PatientsAdminPage';
import { AvailabilityAdminPage } from './features/admin/AvailabilityAdminPage';
import { LeaveAdminPage } from './features/admin/LeaveAdminPage';
import type { UserRole } from './types';

const AUTH_ROUTES = new Set(['/login', '/register', '/']);

function roleDashboard(role: UserRole): React.JSX.Element {
  if (role === 'ADMIN') return <AdminDashboard />;
  if (role === 'DOCTOR') return <DoctorDashboard />;
  return <PatientDashboard />;
}

export function Router(): React.JSX.Element {
  const { user, isInitializing } = useAuth();
  const { route, navigate } = useRoute();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <Spinner size="md" />
          <p className="text-sm text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  // Unauthenticated — show auth pages
  if (user === null) {
    if (route === '/register') {
      return (
        <AuthLayout>
          <RegisterPage />
        </AuthLayout>
      );
    }
    return (
      <AuthLayout>
        <LoginPage />
      </AuthLayout>
    );
  }

  // Authenticated — redirect auth routes to app
  if (AUTH_ROUTES.has(route) || route === '/app') {
    const dashboardRoute =
      user.role === 'ADMIN'
        ? '/app/admin'
        : user.role === 'DOCTOR'
          ? '/app/dashboard'
          : '/app/dashboard';
    // Immediately redirect
    window.history.replaceState({}, '', dashboardRoute);
  }

  // Render app shell with role-gated pages
  return (
    <AppShell>
      <div className="animate-fade-in">
        {renderPage(route, user.role, navigate)}
      </div>
    </AppShell>
  );
}

function renderPage(
  route: string,
  role: UserRole,
  _navigate: (route: import('./hooks/useRoute').Route) => void,
): React.JSX.Element {
  switch (route) {
    case '/app/dashboard':
      return roleDashboard(role);

    case '/app/admin':
      return <AdminDashboard />;

    case '/app/appointments':
      return <AppointmentsPage />;

    case '/app/appointments/book':
      return <BookAppointmentPage />;

    case '/app/doctors':
      return <DoctorsListPage />;

    case '/app/reminders':
      return <RemindersPage />;

    case '/app/settings':
      return <SettingsPage />;

    case '/app/profile':
      return <ProfilePage />;

    case '/app/admin/doctors':
      if (role !== 'ADMIN') return <UnauthorizedPage />;
      return <DoctorsAdminPage />;

    case '/app/admin/patients':
      if (role !== 'ADMIN') return <UnauthorizedPage />;
      return <PatientsAdminPage />;

    case '/app/admin/availability':
      if (role !== 'ADMIN') return <UnauthorizedPage />;
      return <AvailabilityAdminPage />;

    case '/app/admin/leave':
      if (role !== 'ADMIN' && role !== 'DOCTOR') return <UnauthorizedPage />;
      return <LeaveAdminPage />;

    default:
      return roleDashboard(role);
  }
}

function UnauthorizedPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
        <svg className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
      <p className="mt-2 text-sm text-slate-500">You don't have permission to access this page.</p>
    </div>
  );
}
