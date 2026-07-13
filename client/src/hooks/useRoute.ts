import { useCallback, useEffect, useState } from 'react';

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

const VALID_ROUTES: Set<string> = new Set<Route>([
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

function currentPath(): Route {
  const path = window.location.pathname;
  if (VALID_ROUTES.has(path)) {
    return path as Route;
  }
  // Handle dynamic segments — e.g. /app/appointments/:id
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
  const [route, setRoute] = useState<Route>(currentPath);

  // Extract dynamic params from URL
  const extractParams = (): Record<string, string> => {
    const path = window.location.pathname;
    const appointmentMatch = path.match(/^\/app\/appointments\/([^/]+)$/);
    if (appointmentMatch?.[1] !== undefined) {
      return { id: appointmentMatch[1] };
    }
    const doctorMatch = path.match(/^\/app\/doctors\/([^/]+)$/);
    if (doctorMatch?.[1] !== undefined) {
      return { id: doctorMatch[1] };
    }
    return {};
  };

  const [params, setParams] = useState<Record<string, string>>(extractParams);

  useEffect(() => {
    const handlePopState = (): void => {
      setRoute(currentPath());
      setParams(extractParams());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((nextRoute: Route): void => {
    window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
    setParams(extractParams());
  }, []);

  return { route, navigate, params };
}
