import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, ApiError } from '../lib/api';
import type { AuthResponse, SanitizedUser } from '../types';
import { useToast } from './ToastContext';

const ACCESS_TOKEN_KEY = 'ham.accessToken';
const REFRESH_TOKEN_KEY = 'ham.refreshToken';
const SESSION_REFRESHED_EVENT = 'ham:session-refreshed';
const SESSION_CLEARED_EVENT = 'ham:session-cleared';

type AuthContextValue = Readonly<{
  user: SanitizedUser | null;
  accessToken: string | null;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    extra?: {
      dateOfBirth?: string;
      gender?: string;
      emergencyContact?: string;
      medicalNotes?: string;
    },
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}>;

const AuthContext = createContext<AuthContextValue | null>(null);

function persistSession(result: AuthResponse): void {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, result.tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, result.tokens.refreshToken);
}

function clearSession(): void {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>): React.JSX.Element {
  const [user, setUser] = useState<SanitizedUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() =>
    window.localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const { notify } = useToast();

  const applyAuthResult = useCallback((result: AuthResponse): void => {
    persistSession(result);
    setUser(result.user);
    setAccessToken(result.tokens.accessToken);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    if (storedRefreshToken === null) return false;

    try {
      const response = await api.refresh(storedRefreshToken);
      applyAuthResult(response.data);
      return true;
    } catch {
      clearSession();
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, [applyAuthResult]);

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser(): Promise<void> {
      const storedAccessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);

      if (storedAccessToken === null) {
        // Try refresh token if available
        const storedRefreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
        if (storedRefreshToken !== null) {
          await refreshSession();
        }
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        const response = await api.me(storedAccessToken);
        if (isMounted) {
          setUser(response.data);
          setAccessToken(storedAccessToken);
        }
      } catch (error) {
        // If 401, attempt token refresh
        if (error instanceof ApiError && error.status === 401) {
          const refreshed = await refreshSession();
          if (!refreshed && isMounted) {
            setUser(null);
            setAccessToken(null);
          }
        } else {
          clearSession();
          if (isMounted) {
            setUser(null);
            setAccessToken(null);
          }
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleSessionRefreshed = (event: Event): void => {
      const refreshedEvent = event as CustomEvent<AuthResponse>;
      applyAuthResult(refreshedEvent.detail);
    };

    const handleSessionCleared = (): void => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
    window.addEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);

    return () => {
      window.removeEventListener(SESSION_REFRESHED_EVENT, handleSessionRefreshed);
      window.removeEventListener(SESSION_CLEARED_EVENT, handleSessionCleared);
    };
  }, [applyAuthResult]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await api.login({ email, password });
      applyAuthResult(response.data);
      notify('Welcome back. Your clinical workspace is ready.', 'success');
    },
    [applyAuthResult, notify],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      extra?: {
        dateOfBirth?: string;
        gender?: string;
        emergencyContact?: string;
        medicalNotes?: string;
      },
    ): Promise<void> => {
      const response = await api.register({ email, password, ...extra });
      applyAuthResult(response.data);
      notify('Account created. Welcome to the patient portal.', 'success');
    },
    [applyAuthResult, notify],
  );

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
    clearSession();
    setUser(null);
    setAccessToken(null);

    if (refreshToken !== null) {
      try {
        await api.logout(refreshToken);
      } catch {
        // Session was already expired server-side
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, isInitializing, login, register, logout, refreshSession }),
    [accessToken, isInitializing, login, logout, refreshSession, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}

export function useAuthUser(): SanitizedUser {
  const { user } = useAuth();
  if (user === null) {
    throw new Error('useAuthUser requires an authenticated user.');
  }
  return user;
}

export function useToken(): string | null {
  return useAuth().accessToken;
}
