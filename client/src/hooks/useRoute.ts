import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

export type Route =
  | '/'
  | '/login'
  | '/register'
  | '/app'
  | '/app/dashboard'
  | '/app/appointments'
  | '/app/appointments/book'
  | '/app/doctors'
  | '/app/reminders'
  | '/app/settings'
  | '/app/profile'
  | '/app/admin'
  | '/app/admin/doctors'
  | '/app/admin/patients'
  | '/app/admin/availability'
  | '/app/admin/leave'
  | '/app/admin/jobs';

const VALID_ROUTES = new Set<string>([
  '/',
  '/login',
  '/register',
  '/app',
  '/app/dashboard',
  '/app/appointments',
  '/app/appointments/book',
  '/app/doctors',
  '/app/reminders',
  '/app/settings',
  '/app/profile',
  '/app/admin',
  '/app/admin/doctors',
  '/app/admin/patients',
  '/app/admin/availability',
  '/app/admin/leave',
  '/app/admin/jobs',
]);

function normalizePath(path: string): Route {
  if (VALID_ROUTES.has(path)) {
    return path as Route;
  }

  if (path.startsWith('/app/appointments/')) return '/app/appointments';
  if (path.startsWith('/app/admin/')) return '/app/admin';
  if (path.startsWith('/app/')) return '/app/dashboard';
  return '/';
}

export function useRoute(): Readonly<{
  route: Route;
  navigate: (route: Route) => void;
  params: Record<string, string>;
}> {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const routerParams = useParams();

  const params = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(routerParams).filter((entry): entry is [string, string] => entry[1] !== undefined),
      ),
    [routerParams],
  );

  return {
    route: normalizePath(location.pathname),
    navigate: (route: Route) => routerNavigate(route),
    params,
  };
}
