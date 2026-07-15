import { DayOfWeek } from '@prisma/client';

import { ApplicationError } from '../errors/application-error.js';

const CLINIC_TIME_ZONE = 'Asia/Kolkata';

type ClinicClockParts = Readonly<{
  dateKey: string;
  dayOfWeek: DayOfWeek;
  minutesSinceMidnight: number;
}>;

export type AppointmentTimeRange = Readonly<{
  startTime: Date;
  endTime: Date;
}>;

export type AvailabilityTimeWindow = Readonly<{
  dayOfWeek: DayOfWeek;
  startTime: Date;
  endTime: Date;
  slotDuration: number;
}>;

const clinicDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
  hourCycle: 'h23',
  minute: '2-digit',
  month: '2-digit',
  timeZone: CLINIC_TIME_ZONE,
  weekday: 'long',
  year: 'numeric',
});

export function appointmentFitsAvailability(
  appointment: AppointmentTimeRange,
  availability: AvailabilityTimeWindow,
): boolean {
  const appointmentDuration = differenceInMinutes(appointment.startTime, appointment.endTime);
  const appointmentStart = getClinicClockParts(appointment.startTime);
  const appointmentEnd = getClinicClockParts(appointment.endTime);
  const availabilityStart = toAvailabilityMinutesSinceMidnight(availability.startTime);
  const availabilityEnd = toAvailabilityMinutesSinceMidnight(availability.endTime);
  const minutesFromAvailabilityStart = appointmentStart.minutesSinceMidnight - availabilityStart;

  return (
    appointmentStart.dateKey === appointmentEnd.dateKey &&
    appointmentStart.dayOfWeek === availability.dayOfWeek &&
    appointmentDuration === availability.slotDuration &&
    appointmentStart.minutesSinceMidnight >= availabilityStart &&
    appointmentEnd.minutesSinceMidnight <= availabilityEnd &&
    minutesFromAvailabilityStart % availability.slotDuration === 0
  );
}

export function toClinicDateKey(value: Date): string {
  return getClinicClockParts(value).dateKey;
}

function getClinicClockParts(value: Date): ClinicClockParts {
  const parts = Object.fromEntries(
    clinicDateTimeFormatter.formatToParts(value).map((part) => [part.type, part.value]),
  );

  if (
    parts.year === undefined ||
    parts.month === undefined ||
    parts.day === undefined ||
    parts.weekday === undefined ||
    parts.hour === undefined ||
    parts.minute === undefined
  ) {
    throw new ApplicationError('Invalid appointment time.', 400, 'INVALID_APPOINTMENT_TIME');
  }

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    dayOfWeek: toDayOfWeek(parts.weekday),
    minutesSinceMidnight: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function toAvailabilityMinutesSinceMidnight(value: Date): number {
  return value.getUTCHours() * 60 + value.getUTCMinutes();
}

function differenceInMinutes(startTime: Date, endTime: Date): number {
  return Math.round((endTime.getTime() - startTime.getTime()) / 60_000);
}

function toDayOfWeek(value: string): DayOfWeek {
  switch (value.toUpperCase()) {
    case 'SUNDAY':
      return DayOfWeek.SUNDAY;
    case 'MONDAY':
      return DayOfWeek.MONDAY;
    case 'TUESDAY':
      return DayOfWeek.TUESDAY;
    case 'WEDNESDAY':
      return DayOfWeek.WEDNESDAY;
    case 'THURSDAY':
      return DayOfWeek.THURSDAY;
    case 'FRIDAY':
      return DayOfWeek.FRIDAY;
    case 'SATURDAY':
      return DayOfWeek.SATURDAY;
    default:
      throw new ApplicationError('Invalid appointment day.', 400, 'INVALID_APPOINTMENT_DAY');
  }
}
