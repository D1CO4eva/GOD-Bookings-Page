import { BookingRecord, ReservationDetails } from './types';
import {
  isNamaBhikshaType,
  isSatsangType,
  normalizeConfirmationForMatch,
  normalizeEmailForMatch,
  normalizeProgramType
} from './programUtils';

export const getSatsangDates = (bookings: BookingRecord[]): string[] => {
  const dates = new Set<string>();
  for (const booking of bookings) {
    if (booking.date && isSatsangType(booking.type)) {
      dates.add(booking.date);
    }
  }
  return Array.from(dates);
};

export const getBlockedDates = (bookings: BookingRecord[], localBookedDates: string[] = []): string[] => {
  const dates = new Set<string>();

  for (const booking of bookings) {
    if (!booking.date) continue;
    if (isNamaBhikshaType(booking.type)) continue;
    if (isSatsangType(booking.type)) continue;
    dates.add(booking.date);
  }

  for (const date of localBookedDates) {
    dates.add(date);
  }

  return Array.from(dates);
};

export const getNamaBhikshaSlotsByDate = (
  bookings: BookingRecord[],
  localBookedSlots: Record<string, string[]> = {}
): Record<string, string[]> => {
  const slotsByDate: Record<string, string[]> = {};

  for (const booking of bookings) {
    if (!isNamaBhikshaType(booking.type) || !booking.date) continue;
    const timeLabel = booking.time ? booking.time.trim() : '';
    if (!timeLabel) continue;

    slotsByDate[booking.date] = slotsByDate[booking.date] || [];
    if (!slotsByDate[booking.date].includes(timeLabel)) {
      slotsByDate[booking.date].push(timeLabel);
    }
  }

  for (const [date, localTimes] of Object.entries(localBookedSlots) as Array<[string, string[]]>) {
    slotsByDate[date] = slotsByDate[date] || [];
    for (const timeLabel of localTimes) {
      if (!slotsByDate[date].includes(timeLabel)) {
        slotsByDate[date].push(timeLabel);
      }
    }
  }

  return slotsByDate;
};

export const getNamaBhikshaFullyBookedDates = (namaBhikshaSlotsByDate: Record<string, string[]>): string[] => {
  return (Object.entries(namaBhikshaSlotsByDate) as Array<[string, string[]]>)
    .filter(([, slots]) => slots.length >= 2)
    .map(([date]) => date);
};

export const getCalendarBlockedDates = (
  selectedProgramId: string | undefined,
  blockedDates: string[],
  namaBhikshaFullyBookedDates: string[]
): string[] => {
  if (selectedProgramId === 'nama-bhiksha') {
    return Array.from(new Set([...blockedDates, ...namaBhikshaFullyBookedDates]));
  }
  return blockedDates;
};

export const getBookingsWithoutCurrentReservation = (
  bookings: BookingRecord[],
  verifiedReservation: ReservationDetails | null
): BookingRecord[] => {
  if (!verifiedReservation) return bookings;

  const normalizedProgram = normalizeProgramType(verifiedReservation.programType);
  const normalizedDate = verifiedReservation.date;
  const normalizedEmail = normalizeEmailForMatch(verifiedReservation.email || '');
  const normalizedConfirmation = normalizeConfirmationForMatch(
    verifiedReservation.confirmationNumber || ''
  );

  const indexToRemove = bookings.findIndex((booking) => {
    const bookingProgram = normalizeProgramType(booking.type);
    const bookingDate = booking.date;
    const bookingEmail = normalizeEmailForMatch(booking.email || '');
    const bookingConfirmation = normalizeConfirmationForMatch(booking.confirmationNumber || '');

    if (bookingProgram !== normalizedProgram) return false;
    if (bookingDate !== normalizedDate) return false;
    if (bookingEmail !== normalizedEmail) return false;
    return bookingConfirmation === normalizedConfirmation;
  });

  if (indexToRemove < 0) return bookings;
  return bookings.filter((_, index) => index !== indexToRemove);
};

export const getReservationBlockedDates = (
  bookingsWithoutCurrentReservation: BookingRecord[],
  localBookedDates: string[] = []
): string[] => {
  const dates = new Set<string>();
  for (const booking of bookingsWithoutCurrentReservation) {
    if (!booking.date) continue;
    if (isNamaBhikshaType(booking.type)) continue;
    if (isSatsangType(booking.type)) continue;
    dates.add(booking.date);
  }
  for (const date of localBookedDates) {
    dates.add(date);
  }
  return Array.from(dates);
};
