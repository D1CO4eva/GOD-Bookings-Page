import { useMemo } from 'react';
import {
  BookingRecord,
  ReservationDetails,
  getBlockedDates,
  getBookingsWithoutCurrentReservation,
  getCalendarBlockedDates,
  getNamaBhikshaFullyBookedDates,
  getNamaBhikshaSlotsByDate,
  getReservationBlockedDates,
  getSatsangDates
} from '../../../../packages/shared/src';

interface UseBookingDerivedStateArgs {
  bookings: BookingRecord[];
  localBookedDates: string[];
  localBookedSlots: Record<string, string[]>;
  selectedProgramId?: string;
  verifiedReservation: ReservationDetails | null;
}

export const useBookingDerivedState = ({
  bookings,
  localBookedDates,
  localBookedSlots,
  selectedProgramId,
  verifiedReservation
}: UseBookingDerivedStateArgs) => {
  const satsangDates = useMemo(() => getSatsangDates(bookings), [bookings]);

  const blockedDates = useMemo(
    () => getBlockedDates(bookings, localBookedDates),
    [bookings, localBookedDates]
  );

  const namaBhikshaSlotsByDate = useMemo(
    () => getNamaBhikshaSlotsByDate(bookings, localBookedSlots),
    [bookings, localBookedSlots]
  );

  const namaBhikshaFullyBookedDates = useMemo(
    () => getNamaBhikshaFullyBookedDates(namaBhikshaSlotsByDate),
    [namaBhikshaSlotsByDate]
  );

  const calendarBlockedDates = useMemo(
    () => getCalendarBlockedDates(selectedProgramId, blockedDates, namaBhikshaFullyBookedDates),
    [selectedProgramId, blockedDates, namaBhikshaFullyBookedDates]
  );

  const bookingsWithoutCurrentReservation = useMemo(
    () => getBookingsWithoutCurrentReservation(bookings, verifiedReservation),
    [bookings, verifiedReservation]
  );

  const reservationBlockedDates = useMemo(
    () => getReservationBlockedDates(bookingsWithoutCurrentReservation, localBookedDates),
    [bookingsWithoutCurrentReservation, localBookedDates]
  );

  const reservationNamaBhikshaSlotsByDate = useMemo(
    () => getNamaBhikshaSlotsByDate(bookingsWithoutCurrentReservation, localBookedSlots),
    [bookingsWithoutCurrentReservation, localBookedSlots]
  );

  return {
    satsangDates,
    blockedDates,
    namaBhikshaSlotsByDate,
    namaBhikshaFullyBookedDates,
    calendarBlockedDates,
    reservationBlockedDates,
    reservationNamaBhikshaSlotsByDate
  };
};
