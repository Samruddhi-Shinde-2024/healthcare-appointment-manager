import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronRight,
  Stethoscope,
  ClipboardList,
  CalendarDays,
  Menu,
  X,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRoute, type Route } from '../../hooks/useRoute';
import { initials } from '../../lib/format';
import type { UserRole } from '../../types';

type NavItem = Readonly<{
  label: string;
  route: Route;
  icon: React.JSX.Element;
  roles: UserRole[];
  badge?: string;
}>;

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    route: '/app/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['PATIENT', 'DOCTOR'],
  },
  {
    label: 'Admin Dashboard',
    route: '/app/admin',
    icon: <Shield className="h-4 w-4" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Appointments',
    route: '/app/appointments',
    icon: <Calendar className="h-4 w-4" />,
    roles: ['PATIENT', 'DOCTOR', 'ADMIN'],
  },
  {
    label: 'Book Appointment',
    route: '/app/appointments/book',
    icon: <CalendarDays className="h-4 w-4" />,
    roles: ['PATIENT'],
  },
  {
    label: 'Find Doctors',
    route: '/app/doctors',
    icon: <Stethoscope className="h-4 w-4" />,
    roles: ['PATIENT'],
  },
  {
    label: 'Reminders',
    route: '/app/reminders',
    icon: <Bell className="h-4 w-4" />,
    roles: ['PATIENT', 'DOCTOR', 'ADMIN'],
  },
  // Admin-only
  {
    label: 'Manage Doctors',
    route: '/app/admin/doctors',
    icon: <UserCheck className="h-4 w-4" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Manage Patients',
    route: '/app/admin/patients',
    icon: <Users className="h-4 w-4" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Availability',
    route: '/app/admin/availability',
    icon: <ClipboardList className="h-4 w-4" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Leave Management',
    route: '/app/admin/leave',
    icon: <CalendarDays className="h-4 w-4" />,
    roles: ['ADMIN', 'DOCTOR'],
  },
];

const BOTTOM_NAV: NavItem[] = [
  {
    label: 'Profile',
    route: '/app/profile',
    icon: <User className="h-4 w-4" />,
    roles: ['PATIENT', 'DOCTOR', 'ADMIN'],
  },
  {
    label: 'Settings',
    route: '/app/settings',
    icon: <Settings className="h-4 w-4" />,
    roles: ['PATIENT', 'DOCTOR', 'ADMIN'],
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  DOCTOR: 'Physician',
  PATIENT: 'Patient',
};

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-violet-100 text-violet-700',
  DOCTOR: 'bg-brand-100 text-brand-700',
  PATIENT: 'bg-amber-100 text-amber-700',
};

type AppShellProps = Readonly<{ children: ReactNode }>;

export function AppShell({ children }: AppShellProps): React.JSX.Element {
  const { user, logout } = useAuth();
  const { route, navigate } = useRoute();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (user === null) return <>{children}</>;

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const visibleBottom = BOTTOM_NAV.filter((item) => item.roles.includes(user.role));

  function NavLink({ item }: { item: NavItem }): React.JSX.Element {
    const isActive = route === item.route;
    return (
      <button
        aria-current={isActive ? 'page' : undefined}
        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
        type="button"
        onClick={() => {
          navigate(item.route);
          setSidebarOpen(false);
        }}
      >
        <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}>
          {item.icon}
        </span>
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge !== undefined && (
          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-xs font-bold text-white">
            {item.badge}
          </span>
        )}
        {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
      </button>
    );
  }

  const Sidebar = (): React.JSX.Element => (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-100 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900">MedSchedule</p>
          <p className="text-xs text-slate-400">v1.0</p>
        </div>
      </div>

      {/* Main Nav */}
      <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {visibleNav.map((item) => (
            <NavLink key={item.route} item={item} />
          ))}
        </div>
      </nav>

      {/* Bottom Nav */}
      <div className="border-t border-slate-100 px-3 py-3">
        <div className="space-y-1">
          {visibleBottom.map((item) => (
            <NavLink key={item.route} item={item} />
          ))}
        </div>
      </div>

      {/* User Info */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {initials(user.email)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-900">{user.email}</p>
            <span
              className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role]}`}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          <button
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
            title="Sign out"
            type="button"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-60 animate-slide-in">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (mobile only) */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            aria-label="Open menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-slate-900">MedSchedule</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {initials(user.email)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
