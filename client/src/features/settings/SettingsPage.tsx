import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Link2Off, Calendar, Shield, Info } from 'lucide-react';
import { PageHeader, Card, Button, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../lib/format';

export function SettingsPage(): React.JSX.Element {
  const { user, accessToken } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [calendarConnecting, setCalendarConnecting] = useState(false);

  const calendarDisconnectMutation = useMutation({
    mutationFn: () => api.calendarDisconnect(accessToken!),
    onSuccess: () => {
      notify('Google Calendar disconnected.', 'success');
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) =>
      notify(e instanceof Error ? e.message : 'Failed to disconnect.', 'error'),
  });

  async function handleCalendarConnect(): Promise<void> {
    if (accessToken === null) return;
    setCalendarConnecting(true);
    try {
      const res = await api.calendarConnect(accessToken);
      // Redirect to Google OAuth
      window.location.href = res.data.authUrl;
    } catch (err) {
      if (err instanceof ApiError) {
        notify(err.message, 'error');
      } else {
        notify('Failed to initiate Google Calendar connection.', 'error');
      }
      setCalendarConnecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage your account preferences and integrations"
      />

      {/* Account information */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
            <Shield className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Account Security</h2>
            <p className="text-xs text-slate-500">Your authentication settings</p>
          </div>
        </div>

        <div className="space-y-4 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Email</span>
            <span className="font-medium text-slate-900">{user?.email ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Role</span>
            <Badge
              tone={
                user?.role === 'ADMIN'
                  ? 'violet'
                  : user?.role === 'DOCTOR'
                    ? 'teal'
                    : 'amber'
              }
            >
              {user?.role ?? '—'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Account Status</span>
            <Badge tone={user?.isActive ? 'emerald' : 'rose'}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Member since</span>
            <span className="font-medium text-slate-900">
              {user?.createdAt !== undefined ? formatDateTime(user.createdAt) : '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* Google Calendar Integration */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Google Calendar</h2>
            <p className="text-xs text-slate-500">Sync appointments with your Google Calendar</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Google Calendar</p>
                <p className="text-xs text-slate-500">
                  Automatically adds your confirmed appointments to Google Calendar
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                leftIcon={<ExternalLink className="h-4 w-4" />}
                loading={calendarConnecting}
                size="sm"
                variant="secondary"
                onClick={() => void handleCalendarConnect()}
              >
                Connect
              </Button>
              <Button
                leftIcon={<Link2Off className="h-4 w-4" />}
                loading={calendarDisconnectMutation.isPending}
                size="sm"
                variant="ghost"
                onClick={() => void calendarDisconnectMutation.mutate()}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700">
            Connecting Google Calendar will redirect you to Google to authorize access. Your
            appointment data is only used to create calendar events.
          </p>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            <p className="text-xs text-slate-500">Manage your notification preferences</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Appointment confirmations', desc: 'Receive emails when appointments are booked' },
            { label: 'Appointment reminders', desc: 'Get reminded 24 hours before your appointments' },
            { label: 'Cancellation alerts', desc: 'Notify when an appointment is cancelled' },
            { label: 'Medication reminders', desc: 'Receive medication schedule notifications' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
              </div>
              <Badge tone="teal">Email</Badge>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Notification preferences are managed by the system administrator. Contact admin to update.
        </p>
      </Card>
    </div>
  );
}
