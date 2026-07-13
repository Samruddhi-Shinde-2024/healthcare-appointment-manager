import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stethoscope, Clock, DollarSign, Star } from 'lucide-react';
import {
  PageHeader,
  Card,
  Skeleton,
  EmptyState,
  Badge,
  SearchInput,
  Button,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { useRoute } from '../../hooks/useRoute';
import type { Doctor } from '../../types';

function DoctorDetailCard({ doctor }: Readonly<{ doctor: Doctor }>): React.JSX.Element {
  const { navigate } = useRoute();

  return (
    <Card className="p-6 transition hover:shadow-md">
      <div className="flex items-start gap-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white shadow-sm">
          {doctor.email.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-900">Dr. {doctor.email.split('@')[0]}</h3>
            <Badge tone={doctor.isActive ? 'emerald' : 'rose'}>
              {doctor.isActive ? 'Available' : 'Inactive'}
            </Badge>
          </div>

          <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-brand-600">
            <Stethoscope className="h-3.5 w-3.5" />
            {doctor.specialization.name}
          </p>

          <div className="mt-3 flex flex-wrap gap-4">
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span>{doctor.experienceYears} years experience</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{doctor.slotDuration} min per session</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-slate-700">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span>{formatCurrency(doctor.consultationFee)}</span>
            </div>
          </div>

          {doctor.bio !== null && (
            <p className="mt-3 line-clamp-2 text-sm text-slate-500">{doctor.bio}</p>
          )}
        </div>

        {doctor.isActive && (
          <Button
            className="shrink-0"
            size="sm"
            onClick={() => navigate('/app/appointments/book')}
          >
            Book Now
          </Button>
        )}
      </div>
    </Card>
  );
}

export function DoctorsListPage(): React.JSX.Element {
  const { accessToken } = useAuth();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['doctors', 'list', accessToken, search],
    queryFn: () =>
      api.doctorsList(accessToken!, {
        ...(search !== '' ? { search } : {}),
        isActive: true,
        pageSize: 50,
      }),
    enabled: accessToken !== null,
  });

  const doctors = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a Doctor"
        subtitle="Browse our qualified medical professionals"
      />

      <div className="max-w-md">
        <SearchInput
          placeholder="Search by name or specialization…"
          value={search}
          onChange={setSearch}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : doctors.length === 0 ? (
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="No doctors found"
          description={search !== '' ? 'Try a different search term.' : 'No doctors are currently available.'}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {doctors.map((doctor) => (
            <DoctorDetailCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </div>
  );
}
