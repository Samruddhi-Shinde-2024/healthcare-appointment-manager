import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Stethoscope, Clock, DollarSign, ChevronRight } from 'lucide-react';
import {
  PageHeader,
  Card,
  Skeleton,
  EmptyState,
  Button,
  SearchInput,
  Badge,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatCurrency, addMinutes } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import { useRoute } from '../../hooks/useRoute';
import type { Doctor, Availability } from '../../types';

type BookingStep = 1 | 2 | 3;

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

function generateSlots(
  availability: Availability[],
  selectedDate: string,
): Array<{ startTime: Date; endTime: Date }> {
  if (selectedDate === '') return [];
  const date = new Date(selectedDate);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  const slots: Array<{ startTime: Date; endTime: Date }> = [];

  for (const avail of availability) {
    if (!avail.isActive) continue;
    if (avail.dayOfWeek !== dayName) continue;

    const [startHour = 0, startMin = 0] = avail.startTime.split(':').map(Number);
    const [endHour = 0, endMin = 0] = avail.endTime.split(':').map(Number);

    let current = new Date(date);
    current.setHours(startHour, startMin, 0, 0);
    const endBound = new Date(date);
    endBound.setHours(endHour, endMin, 0, 0);

    while (current.getTime() < endBound.getTime()) {
      const slotEnd = addMinutes(current, avail.slotDuration);
      if (slotEnd.getTime() > endBound.getTime()) break;
      if (current.getTime() > Date.now()) {
        slots.push({ startTime: new Date(current), endTime: slotEnd });
      }
      current = slotEnd;
    }
  }

  return slots;
}

function DoctorCard({
  doctor,
  onSelect,
}: Readonly<{ doctor: Doctor; onSelect: (doctor: Doctor) => void }>): React.JSX.Element {
  return (
    <button
      className="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
      type="button"
      onClick={() => onSelect(doctor)}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xl font-bold text-brand-700">
          {doctor.email.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900">{doctor.email}</p>
            {!doctor.isActive && <Badge tone="rose">Inactive</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-brand-600">{doctor.specialization.name}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {doctor.slotDuration} min slots
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <DollarSign className="h-3 w-3" />
              {formatCurrency(doctor.consultationFee)}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Stethoscope className="h-3 w-3" />
              {doctor.experienceYears} yrs exp
            </span>
          </div>
          {doctor.bio !== null && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-500">{doctor.bio}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
      </div>
    </button>
  );
}

export function BookAppointmentPage(): React.JSX.Element {
  const { accessToken, user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const { navigate } = useRoute();

  const [step, setStep] = useState<BookingStep>(1);
  const [search, setSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: Date; endTime: Date } | null>(null);

  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors', 'book', accessToken, search],
    queryFn: () => api.doctorsDirectory(accessToken!, { ...(search !== '' ? { search } : {}), isActive: true, pageSize: 50 }),
    enabled: accessToken !== null,
  });

  const { data: availabilityData, isLoading: availLoading } = useQuery({
    queryKey: ['availability', selectedDoctor?.id, accessToken],
    queryFn: () => api.doctorAvailability(accessToken!, selectedDoctor!.id, { isActive: true }),
    enabled: selectedDoctor !== null && accessToken !== null,
  });

  const bookMutation = useMutation({
    mutationFn: () =>
      api.bookAppointment(accessToken!, {
        doctorId: selectedDoctor!.id,
        startTime: selectedSlot!.startTime.toISOString(),
        endTime: selectedSlot!.endTime.toISOString(),
      }),
    onSuccess: () => {
      notify('Appointment booked successfully!', 'success');
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      navigate('/app/appointments');
    },
    onError: (e) => notify(e instanceof Error ? e.message : 'Booking failed.', 'error'),
  });

  const doctors = (doctorsData?.data ?? []).filter((d) => d.isActive);
  const availability = availabilityData?.data ?? [];
  const availableDays = new Set(availability.filter((a) => a.isActive).map((a) => a.dayOfWeek));
  const slots = generateSlots(availability, selectedDate);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book Appointment"
        subtitle="Find a doctor and schedule your visit"
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                step >= s
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {s}
            </div>
            <span className={`text-sm font-medium ${step >= s ? 'text-slate-900' : 'text-slate-400'}`}>
              {s === 1 ? 'Select Doctor' : s === 2 ? 'Choose Slot' : 'Confirm'}
            </span>
            {s < 3 && <ChevronRight className="h-4 w-4 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* Step 1 — Doctor Selection */}
      {step === 1 && (
        <Card className="p-6">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Find a Doctor</h2>
          <SearchInput
            className="mb-4"
            placeholder="Search by name or specialization…"
            value={search}
            onChange={setSearch}
          />
          {doctorsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : doctors.length === 0 ? (
            <EmptyState
              icon={<Stethoscope className="h-6 w-6" />}
              title="No doctors found"
              description={search !== '' ? 'Try a different search term.' : 'No active doctors available.'}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  onSelect={(d) => {
                    setSelectedDoctor(d);
                    setStep(2);
                    setSelectedDate('');
                    setSelectedSlot(null);
                  }}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Step 2 — Slot Selection */}
      {step === 2 && selectedDoctor !== null && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Choose a Slot</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Dr. {selectedDoctor.email} · {selectedDoctor.specialization.name}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setStep(1)}>
              ← Change Doctor
            </Button>
          </div>

          {/* Available days badges */}
          {availableDays.size > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="text-xs font-medium text-slate-500">Available on:</span>
              {Array.from(availableDays).map((day) => (
                <Badge key={day} tone="teal">{DAY_LABELS[day] ?? day}</Badge>
              ))}
            </div>
          )}

          {/* Date picker */}
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="appt-date">
              Select date
            </label>
            <input
              className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              id="appt-date"
              min={minDateStr}
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
            />
          </div>

          {/* Slots */}
          {availLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : selectedDate !== '' && slots.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              No available slots on this date. The doctor may be unavailable or on leave.
            </div>
          ) : selectedDate !== '' ? (
            <>
              <p className="mb-3 text-sm font-medium text-slate-600">
                {slots.length} slot{slots.length !== 1 ? 's' : ''} available
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    className={`rounded-xl border py-2.5 text-sm font-medium transition ${
                      selectedSlot?.startTime.getTime() === slot.startTime.getTime()
                        ? 'border-brand-500 bg-brand-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                    }`}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot.startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400">Select a date to see available slots.</p>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              disabled={selectedSlot === null}
              onClick={() => setStep(3)}
            >
              Continue →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3 — Confirm */}
      {step === 3 && selectedDoctor !== null && selectedSlot !== null && (
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Confirm Booking</h2>
            <Button size="sm" variant="ghost" onClick={() => setStep(2)}>
              ← Change Slot
            </Button>
          </div>

          <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Doctor</span>
              <span className="font-medium text-slate-900">{selectedDoctor.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Specialization</span>
              <span className="font-medium text-slate-900">{selectedDoctor.specialization.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-900">
                {selectedSlot.startTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Time</span>
              <span className="font-medium text-slate-900">
                {selectedSlot.startTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {selectedSlot.endTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Consultation Fee</span>
              <span className="font-semibold text-brand-700">{formatCurrency(selectedDoctor.consultationFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Patient</span>
              <span className="font-medium text-slate-900">{user?.email}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate('/app/appointments')}>
              Cancel
            </Button>
            <Button
              loading={bookMutation.isPending}
              onClick={() => void bookMutation.mutate()}
            >
              Confirm Booking
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
