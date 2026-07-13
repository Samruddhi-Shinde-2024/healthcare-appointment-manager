import { User, Mail, Shield, Calendar, Hash, Activity } from 'lucide-react';
import { PageHeader, Card, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../lib/format';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  DOCTOR: 'Physician',
  PATIENT: 'Patient',
};

const ROLE_TONE: Record<string, 'violet' | 'teal' | 'amber'> = {
  ADMIN: 'violet',
  DOCTOR: 'teal',
  PATIENT: 'amber',
};

function ProfileField({
  label,
  value,
  icon,
}: Readonly<{
  label: string;
  value: React.ReactNode;
  icon: React.JSX.Element;
}>): React.JSX.Element {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/60 text-slate-400">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className="mt-0.5 text-sm font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

export function ProfilePage(): React.JSX.Element {
  const { user } = useAuth();

  if (user === null) return <></>;

  const initials = user.email.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" subtitle="Your account information and role details" />

      {/* Avatar + name card */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-600 via-brand-500 to-teal-400" />
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand-600 text-2xl font-bold text-white shadow-md">
              {initials}
            </div>
            <Badge tone={ROLE_TONE[user.role] ?? 'slate'}>
              {ROLE_LABELS[user.role] ?? user.role}
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-slate-900">{user.email.split('@')[0]}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
      </Card>

      {/* Account details */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <User className="h-4 w-4 text-slate-400" />
          Account Details
        </h3>

        <div className="space-y-3">
          <ProfileField
            icon={<Mail className="h-4 w-4" />}
            label="Email Address"
            value={user.email}
          />

          <ProfileField
            icon={<Shield className="h-4 w-4" />}
            label="Role"
            value={
              <span className="flex items-center gap-2">
                {ROLE_LABELS[user.role] ?? user.role}
                <Badge tone={user.isActive ? 'emerald' : 'rose'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </span>
            }
          />

          <ProfileField
            icon={<Calendar className="h-4 w-4" />}
            label="Member Since"
            value={formatDateTime(user.createdAt)}
          />

          <ProfileField
            icon={<Activity className="h-4 w-4" />}
            label="Last Updated"
            value={formatDateTime(user.updatedAt)}
          />

          <ProfileField
            icon={<Hash className="h-4 w-4" />}
            label="User ID"
            value={
              <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                {user.id}
              </code>
            }
          />

          {user.patientProfileId !== null && (
            <ProfileField
              icon={<Hash className="h-4 w-4" />}
              label="Patient Profile ID"
              value={
                <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                  {user.patientProfileId}
                </code>
              }
            />
          )}

          {user.doctorProfileId !== null && (
            <ProfileField
              icon={<Hash className="h-4 w-4" />}
              label="Doctor Profile ID"
              value={
                <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                  {user.doctorProfileId}
                </code>
              }
            />
          )}
        </div>
      </Card>

      {/* Role-specific info */}
      <Card className="p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Shield className="h-4 w-4 text-slate-400" />
          Role Permissions
        </h3>
        <div className="space-y-2">
          {user.role === 'PATIENT' && (
            <>
              {[
                'View and book appointments',
                'Cancel or reschedule your own appointments',
                'View doctor profiles and availability',
                'Receive medication and appointment reminders',
                'Connect Google Calendar',
              ].map((perm) => (
                <div key={perm} className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {perm}
                </div>
              ))}
            </>
          )}
          {user.role === 'DOCTOR' && (
            <>
              {[
                'View assigned appointments',
                'Mark appointments as completed or no-show',
                'Request and manage leave',
                'View patient appointment history',
                'Access pre-visit AI summaries',
              ].map((perm) => (
                <div key={perm} className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {perm}
                </div>
              ))}
            </>
          )}
          {user.role === 'ADMIN' && (
            <>
              {[
                'Full platform administration',
                'Create and manage doctor accounts',
                'Configure doctor availability schedules',
                'View and manage all appointments',
                'Manage patient records',
                'Approve and cancel doctor leaves',
                'Trigger background job processing',
              ].map((perm) => (
                <div key={perm} className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                  {perm}
                </div>
              ))}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
