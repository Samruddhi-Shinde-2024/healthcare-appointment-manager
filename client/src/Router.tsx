import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { AppShell } from './components/layouts/AppShell';
import { AuthLayout } from './components/layouts/AuthLayout';
import { Spinner } from './components/ui';
import { useAuth } from './context/AuthContext';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AvailabilityAdminPage } from './features/admin/AvailabilityAdminPage';
import { DoctorsAdminPage } from './features/admin/DoctorsAdminPage';
import { LeaveAdminPage } from './features/admin/LeaveAdminPage';
import { PatientsAdminPage } from './features/admin/PatientsAdminPage';
import { AppointmentsPage } from './features/appointments/AppointmentsPage';
import { BookAppointmentPage } from './features/appointments/BookAppointmentPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { DoctorDashboard } from './features/doctor/DoctorDashboard';
import { DoctorsListPage } from './features/doctors/DoctorsListPage';
import { PatientDashboard } from './features/patient/PatientDashboard';
import { ProfilePage } from './features/profile/ProfilePage';
import { RemindersPage } from './features/reminders/RemindersPage';
import { SettingsPage } from './features/settings/SettingsPage';
import type { UserRole } from './types';

function dashboardPath(role: UserRole): string {
  return role === 'ADMIN' ? '/app/admin' : '/app/dashboard';
}

function LoadingScreen(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
          <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </div>
        <Spinner size="md" />
        <p className="text-sm text-slate-500">Loading your workspace...</p>
      </div>
    </div>
  );
}

function DashboardForRole({ role }: Readonly<{ role: UserRole }>): React.JSX.Element {
  if (role === 'ADMIN') return <AdminDashboard />;
  if (role === 'DOCTOR') return <DoctorDashboard />;
  return <PatientDashboard />;
}

function PublicRoute(): React.JSX.Element {
  const { user, isInitializing } = useAuth();

  if (isInitializing) return <LoadingScreen />;
  if (user !== null) return <Navigate replace to={dashboardPath(user.role)} />;

  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  );
}

function ProtectedRoute(): React.JSX.Element {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return <LoadingScreen />;
  if (user === null) return <Navigate replace state={{ from: location.pathname }} to="/login" />;

  return (
    <AppShell>
      <div className="animate-fade-in">
        <Outlet />
      </div>
    </AppShell>
  );
}

function RoleRoute({
  allowedRoles,
  children,
}: Readonly<{
  allowedRoles: readonly UserRole[];
  children: React.JSX.Element;
}>): React.JSX.Element {
  const { user } = useAuth();

  if (user === null) return <Navigate replace to="/login" />;
  if (!allowedRoles.includes(user.role)) return <UnauthorizedPage />;

  return children;
}

function DashboardRoute(): React.JSX.Element {
  const { user } = useAuth();

  if (user === null) return <Navigate replace to="/login" />;
  return <DashboardForRole role={user.role} />;
}

export function Router(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate replace to={user === null ? '/login' : dashboardPath(user.role)} />} />
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<Navigate replace to={user === null ? '/login' : dashboardPath(user.role)} />} />
        <Route path="/app/dashboard" element={<DashboardRoute />} />
        <Route
          path="/app/admin"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route path="/app/appointments" element={<AppointmentsPage />} />
        <Route
          path="/app/appointments/book"
          element={
            <RoleRoute allowedRoles={['PATIENT']}>
              <BookAppointmentPage />
            </RoleRoute>
          }
        />
        <Route
          path="/app/doctors"
          element={
            <RoleRoute allowedRoles={['PATIENT']}>
              <DoctorsListPage />
            </RoleRoute>
          }
        />
        <Route path="/app/reminders" element={<RemindersPage />} />
        <Route path="/app/profile" element={<ProfilePage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route
          path="/app/admin/doctors"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <DoctorsAdminPage />
            </RoleRoute>
          }
        />
        <Route
          path="/app/admin/patients"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <PatientsAdminPage />
            </RoleRoute>
          }
        />
        <Route
          path="/app/admin/availability"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <AvailabilityAdminPage />
            </RoleRoute>
          }
        />
        <Route
          path="/app/admin/leave"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'DOCTOR']}>
              <LeaveAdminPage />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate replace to={user === null ? '/login' : dashboardPath(user.role)} />} />
    </Routes>
  );
}

function UnauthorizedPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
        <svg className="h-8 w-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900">Access denied</h2>
      <p className="mt-2 text-sm text-slate-500">You do not have permission to access this page.</p>
    </div>
  );
}
