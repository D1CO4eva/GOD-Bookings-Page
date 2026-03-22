
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import ProgramCard from './components/ProgramCard';
import CalendarView from './components/CalendarView';
import BookingForm from './components/BookingForm';
import Footer from './components/Footer';
import DonateModal from './components/DonateModal';
import EventPopupModal from './components/EventPopupModal';
import { Page, DevotionalProgram, BookingData, BookingRecord, TimeSlot, ReservationLookupData, ReservationDetails } from './types';
import { PROGRAMS } from './constants';
import { fetchBookings, submitToGoogleSheets, verifyReservation, updateReservation, cancelReservation } from './services/googleSheetsService';
import { generateSlots } from './utils/slotUtils';
import { toDateKey, parseDateKey } from './utils/dateUtils';
import {
  getProgramAvailabilityFlags,
  isNamaBhikshaType,
  isSatsangType,
  isSpecialProgramType,
  normalizeConfirmationForMatch,
  normalizeEmailForMatch,
  normalizeProgramType,
  normalizeTimeForMatch,
  resolveProgramByType
} from './utils/programUtils';
import { getPathForPage, parsePathToPage } from './utils/routeUtils';
const CONTACT_EMAIL = 'atlantanamadwaar@gmail.com';
const CONTACT_PHONE = '404-788-7391';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [selectedProgram, setSelectedProgram] = useState<DevotionalProgram | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSubmitError, setBookingSubmitError] = useState('');
  const [isDonateOpen, setIsDonateOpen] = useState(false);
  const [isEventPopupOpen, setIsEventPopupOpen] = useState(false);
  const [eventPopupStartInFullView, setEventPopupStartInFullView] = useState(false);
  const [donateTitle, setDonateTitle] = useState<string | undefined>();
  const [donateMessage, setDonateMessage] = useState<string | undefined>();
  
  // Track booked dates to prevent double-booking on same day
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [localBookedDates, setLocalBookedDates] = useState<string[]>([]);
  const [localBookedSlots, setLocalBookedSlots] = useState<Record<string, string[]>>({});
  const [isLoadingBookedDates, setIsLoadingBookedDates] = useState(true);
  const [reservationMode, setReservationMode] = useState<'edit' | 'cancel' | null>(null);
  const [reservationLookupDate, setReservationLookupDate] = useState('');
  const [reservationLookupTime, setReservationLookupTime] = useState('');
  const [reservationLookupEmail, setReservationLookupEmail] = useState('');
  const [reservationLookupConfirmationNumber, setReservationLookupConfirmationNumber] = useState('');
  const [reservationLookupError, setReservationLookupError] = useState('');
  const [isReservationLookupLoading, setIsReservationLookupLoading] = useState(false);
  const [verifiedReservation, setVerifiedReservation] = useState<ReservationDetails | null>(null);
  const [reservationEditDate, setReservationEditDate] = useState<Date | null>(null);
  const [reservationEditTime, setReservationEditTime] = useState('');
  const [isReservationSubmitting, setIsReservationSubmitting] = useState(false);
  const [reservationResultMessage, setReservationResultMessage] = useState('');
  const hasAppliedInitialRoute = useRef(false);

  const resolveProgramTypeForReservationLookup = ({
    programType,
    date,
    time,
    email,
    confirmationNumber
  }: {
    programType: string;
    date: string;
    time?: string;
    email: string;
    confirmationNumber: string;
  }) => {
    if (normalizeProgramType(programType) !== 'radha kalyanam') {
      return programType;
    }

    const normalizedEmail = normalizeEmailForMatch(email);
    const normalizedConfirmation = normalizeConfirmationForMatch(confirmationNumber);
    const normalizedTime = time ? normalizeTimeForMatch(time) : '';

    const candidates = bookings.filter((booking) => {
      if (normalizeProgramType(booking.type) !== 'radha kalyanam') return false;
      if (booking.date !== date) return false;
      if (normalizeEmailForMatch(booking.email || '') !== normalizedEmail) return false;
      if (
        normalizeConfirmationForMatch(booking.confirmationNumber || '') !== normalizedConfirmation
      ) {
        return false;
      }
      return true;
    });

    if (!candidates.length) return programType;

    if (normalizedTime) {
      const exactTimeMatch = candidates.find(
        (booking) => normalizeTimeForMatch(booking.time || '') === normalizedTime
      );
      if (exactTimeMatch?.type) return exactTimeMatch.type;
    }

    const suffixedMatch = candidates.find((booking) =>
      /^radha kalyanam\s*-/i.test((booking.type || '').trim())
    );
    return suffixedMatch?.type || candidates[0].type || programType;
  };

  const satsangDates = useMemo(() => {
    const dates = new Set<string>();
    for (const booking of bookings) {
      if (!booking.date) continue;
      if (isSatsangType(booking.type)) {
        dates.add(booking.date);
      }
    }
    return Array.from(dates);
  }, [bookings]);

  const blockedDates = useMemo(() => {
    const dates = new Set<string>();

    for (const booking of bookings) {
      if (!booking.date) continue;
      if (isNamaBhikshaType(booking.type)) {
        continue;
      }
      if (isSatsangType(booking.type)) {
        // Only blocks evening slots, handled separately.
        continue;
      }

      // All non-Satsang / non-Nama Bhiksha programs block the full day.
      // This includes standard programs and any "special" program types.
      dates.add(booking.date);
    }

    for (const date of localBookedDates) {
      dates.add(date);
    }

    return Array.from(dates);
  }, [bookings, localBookedDates]);

  const namaBhikshaSlotsByDate = useMemo(() => {
    const slots: Record<string, string[]> = {};

    for (const booking of bookings) {
      if (!isNamaBhikshaType(booking.type)) continue;
      if (!booking.date) continue;
      const timeLabel = booking.time ? booking.time.trim() : '';
      if (!timeLabel) continue;
      slots[booking.date] = slots[booking.date] || [];
      if (!slots[booking.date].includes(timeLabel)) {
        slots[booking.date].push(timeLabel);
      }
    }

    for (const [date, localTimes] of Object.entries(localBookedSlots) as Array<[string, string[]]>) {
      slots[date] = slots[date] || [];
      for (const timeLabel of localTimes) {
        if (!slots[date].includes(timeLabel)) {
          slots[date].push(timeLabel);
        }
      }
    }

    return slots;
  }, [bookings, localBookedSlots]);

  const namaBhikshaFullyBookedDates = useMemo(() => {
    return (Object.entries(namaBhikshaSlotsByDate) as Array<[string, string[]]>)
      .filter(([, slots]) => slots.length >= 2)
      .map(([date]) => date);
  }, [namaBhikshaSlotsByDate]);

  const calendarBlockedDates = useMemo(() => {
    if (selectedProgram?.id === 'nama-bhiksha') {
      return Array.from(new Set([...blockedDates, ...namaBhikshaFullyBookedDates]));
    }
    return blockedDates;
  }, [blockedDates, namaBhikshaFullyBookedDates, selectedProgram?.id]);

  const bookingsWithoutCurrentReservation = useMemo(() => {
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
  }, [bookings, verifiedReservation]);

  const reservationBlockedDates = useMemo(() => {
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
  }, [bookingsWithoutCurrentReservation, localBookedDates]);

  const reservationNamaBhikshaSlotsByDate = useMemo(() => {
    const slots: Record<string, string[]> = {};

    for (const booking of bookingsWithoutCurrentReservation) {
      if (!isNamaBhikshaType(booking.type)) continue;
      if (!booking.date) continue;
      const timeLabel = booking.time ? booking.time.trim() : '';
      if (!timeLabel) continue;
      slots[booking.date] = slots[booking.date] || [];
      if (!slots[booking.date].includes(timeLabel)) {
        slots[booking.date].push(timeLabel);
      }
    }

    for (const [date, localTimes] of Object.entries(localBookedSlots) as Array<[string, string[]]>) {
      slots[date] = slots[date] || [];
      for (const timeLabel of localTimes) {
        if (!slots[date].includes(timeLabel)) {
          slots[date].push(timeLabel);
        }
      }
    }

    return slots;
  }, [bookingsWithoutCurrentReservation, localBookedSlots]);

  const reservationNamaBhikshaFullyBookedDates = useMemo(() => {
    return (Object.entries(reservationNamaBhikshaSlotsByDate) as Array<[string, string[]]>)
      .filter(([, slots]) => slots.length >= 2)
      .map(([date]) => date);
  }, [reservationNamaBhikshaSlotsByDate]);

  const reservationSatsangDates = useMemo(() => {
    const dates = new Set<string>();
    for (const booking of bookingsWithoutCurrentReservation) {
      if (!booking.date) continue;
      if (isSatsangType(booking.type)) {
        dates.add(booking.date);
      }
    }
    return Array.from(dates);
  }, [bookingsWithoutCurrentReservation]);

  const reservationLookupTimeOptions = useMemo(() => {
    if (reservationMode !== 'edit' || !selectedProgram || !reservationLookupDate) {
      return [];
    }

    const normalizedSelectedProgram = normalizeProgramType(selectedProgram.name);
    const bookedOptions = new Set<string>();

    for (const booking of bookings) {
      if (booking.date !== reservationLookupDate) continue;
      if (normalizeProgramType(booking.type) !== normalizedSelectedProgram) continue;
      const timeLabel = booking.time ? booking.time.trim() : '';
      if (!timeLabel) continue;
      bookedOptions.add(timeLabel);
    }

    const dateObj = parseDateKey(reservationLookupDate);
    const generatedOptions = dateObj
      ? generateSlots(selectedProgram.id, dateObj).map((slot) => `${slot.start} - ${slot.end}`)
      : [];

    const merged: string[] = [];
    for (const slot of bookedOptions) {
      if (!merged.includes(slot)) merged.push(slot);
    }
    for (const slot of generatedOptions) {
      if (!merged.includes(slot)) merged.push(slot);
    }

    return merged;
  }, [bookings, reservationLookupDate, reservationMode, selectedProgram]);

  const reservationEditTimeOptions = useMemo(() => {
    if (!selectedProgram || !reservationEditDate) {
      return [] as string[];
    }

    const dateStr = toDateKey(reservationEditDate);
    const rawSlots = generateSlots(selectedProgram.id, reservationEditDate);
    const hasSatsang = reservationSatsangDates.includes(dateStr);
    const slotsAfterSatsang = hasSatsang
      ? rawSlots.filter((slot) => slot.period !== 'Evening')
      : rawSlots;

    if (selectedProgram.id !== 'nama-bhiksha') {
      return slotsAfterSatsang.map((slot) => `${slot.start} - ${slot.end}`);
    }

    if (reservationNamaBhikshaFullyBookedDates.includes(dateStr)) {
      return [];
    }

    const bookedTimes = new Set(reservationNamaBhikshaSlotsByDate[dateStr] || []);
    return slotsAfterSatsang
      .filter((slot) => {
        const label = `${slot.start} - ${slot.end}`;
        return !(bookedTimes.has(label) || bookedTimes.has(slot.start));
      })
      .map((slot) => `${slot.start} - ${slot.end}`);
  }, [
    reservationEditDate,
    reservationNamaBhikshaFullyBookedDates,
    reservationNamaBhikshaSlotsByDate,
    reservationSatsangDates,
    selectedProgram
  ]);

  useEffect(() => {
    let isMounted = true;

    const loadBookedDates = async () => {
      try {
        const records = await fetchBookings();
        if (isMounted) {
          setBookings(records);
        }
      } finally {
        if (isMounted) {
          setIsLoadingBookedDates(false);
        }
      }
    };

    loadBookedDates();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setEventPopupStartInFullView(false);
      setIsEventPopupOpen(true);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!hasAppliedInitialRoute.current) {
      return;
    }

    const nextPath = getPathForPage(currentPage, reservationMode);
    const normalize = (value: string) => value.replace(/\/+$/, '');
    if (normalize(window.location.pathname) === normalize(nextPath)) {
      return;
    }

    window.history.pushState({}, '', nextPath);
  }, [currentPage, reservationMode]);

  useEffect(() => {
    const resolveRouteTarget = (target: { page: Page; reservationMode: 'edit' | 'cancel' | null }) => {
      const requiresVerifiedReservation =
        target.page === Page.RESERVATION_OPTIONS ||
        target.page === Page.RESERVATION_EDIT ||
        target.page === Page.RESERVATION_LOOKUP ||
        target.page === Page.RESERVATION_RESULT;

      if (requiresVerifiedReservation && !verifiedReservation) {
        return { page: Page.RESERVATION_CONFIRMATION, reservationMode: null };
      }

      if (target.page === Page.BOOKING_CALENDAR && !selectedProgram) {
        return { page: Page.HOME, reservationMode: null };
      }
      if (target.page === Page.BOOKING_FORM && (!selectedProgram || !selectedDate || !selectedSlot)) {
        return selectedProgram
          ? { page: Page.BOOKING_CALENDAR, reservationMode: null }
          : { page: Page.HOME, reservationMode: null };
      }
      if (target.page === Page.RESERVATION_EDIT && !selectedProgram) {
        return { page: Page.HOME, reservationMode: null };
      }
      return target;
    };

    const handlePathChange = () => {
      const target = resolveRouteTarget(parsePathToPage(window.location.pathname));
      hasAppliedInitialRoute.current = true;
      setReservationMode(target.reservationMode);
      setCurrentPage(target.page);
    };

    window.addEventListener('popstate', handlePathChange);
    handlePathChange();
    return () => {
      window.removeEventListener('popstate', handlePathChange);
    };
  }, [selectedDate, selectedProgram, selectedSlot, verifiedReservation]);

  const handleProgramSelect = (program: DevotionalProgram) => {
    setSelectedProgram(program);
    setSelectedDate(null);
    setSelectedSlot(null);
    setBookingSubmitError('');
    setCurrentPage(Page.BOOKING_CALENDAR);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDonateOpen = (title?: string, message?: string) => {
    setDonateTitle(title);
    setDonateMessage(message);
    setIsDonateOpen(true);
  };

  const handleProgramDonate = (program: DevotionalProgram) => {
    if (program.id === 'nama-bhiksha') {
      handleDonateOpen();
      return;
    }

    handleDonateOpen(
      `Donation for ${program.name}`,
      `Your contribution helps us offer ${program.name} with love and devotion.`
    );
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setCurrentPage(Page.BOOKING_FORM);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetBookedDates = () => {
    if (window.confirm("This will clear all blocked dates in your current browser session. Do you want to continue?")) {
      setLocalBookedDates([]);
      setLocalBookedSlots({});
      alert("Calendar reset successful.");
    }
  };

  const resetReservationFlow = () => {
    setReservationMode(null);
    setReservationLookupDate('');
    setReservationLookupTime('');
    setReservationLookupEmail('');
    setReservationLookupConfirmationNumber('');
    setReservationLookupError('');
    setIsReservationLookupLoading(false);
    setVerifiedReservation(null);
    setReservationEditDate(null);
    setReservationEditTime('');
    setIsReservationSubmitting(false);
    setReservationResultMessage('');
  };

  const handleManageReservation = (program: DevotionalProgram) => {
    setSelectedProgram(program);
    resetReservationFlow();
    setCurrentPage(Page.RESERVATION_CONFIRMATION);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVerifyReservationByConfirmation = async () => {
    const rawConfirmation = reservationLookupConfirmationNumber.trim();
    const normalizedConfirmation = normalizeConfirmationForMatch(rawConfirmation);
    if (!normalizedConfirmation) {
      setReservationLookupError('Please enter your confirmation number.');
      return;
    }

    setIsReservationLookupLoading(true);
    setReservationLookupError('');

    const result = await verifyReservation({
      confirmationNumber: rawConfirmation,
      ...(selectedProgram ? { programType: selectedProgram.name } : {})
    });

    setIsReservationLookupLoading(false);

    if (!result.found || !result.reservation) {
      setVerifiedReservation(null);
      setReservationLookupError(result.message || 'Sorry! Could not find your Reservation! Please try again.');
      return;
    }

    if (!result.reservation.date || !result.reservation.programType || !result.reservation.email) {
      setVerifiedReservation(null);
      setReservationLookupError(
        'Found reservation, but required details are incomplete. Please contact support.'
      );
      return;
    }

    const resolvedProgram = resolveProgramByType(result.reservation.programType, PROGRAMS);
    if (resolvedProgram) {
      setSelectedProgram(resolvedProgram);
    }

    setVerifiedReservation({
      programType: result.reservation.programType,
      date: result.reservation.date,
      time: result.reservation.time || '',
      email: result.reservation.email,
      confirmationNumber: result.reservation.confirmationNumber || rawConfirmation,
      occasion: result.reservation.occasion || ''
    });
    setReservationMode(null);
    setCurrentPage(Page.RESERVATION_OPTIONS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectReservationMode = (mode: 'edit' | 'cancel') => {
    if (!verifiedReservation) {
      setReservationLookupError('Please validate your confirmation number first.');
      setCurrentPage(Page.RESERVATION_CONFIRMATION);
      return;
    }

    setReservationMode(mode);
    setReservationLookupDate('');
    setReservationLookupTime('');
    setReservationLookupError('');
    setReservationEditDate(null);
    setReservationEditTime('');

    if (mode === 'edit') {
      const currentDate = new Date(`${verifiedReservation.date}T00:00:00`);
      setReservationEditDate(Number.isNaN(currentDate.getTime()) ? null : currentDate);
      setCurrentPage(Page.RESERVATION_EDIT);
    } else {
      setCurrentPage(Page.RESERVATION_LOOKUP);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVerifyReservation = async () => {
    if (!selectedProgram) return;
    const isEditMode = reservationMode === 'edit';
    if (
      !reservationLookupDate ||
      (isEditMode && !reservationLookupTime.trim()) ||
      !reservationLookupEmail.trim() ||
      !reservationLookupConfirmationNumber.trim()
    ) {
      setReservationLookupError(
        isEditMode
          ? 'Please enter date, time-slot, email, and confirmation number.'
          : 'Please enter date, email, and confirmation number.'
      );
      return;
    }

    setIsReservationLookupLoading(true);
    setReservationLookupError('');

    const lookupProgramType = resolveProgramTypeForReservationLookup({
      programType: selectedProgram.name,
      date: reservationLookupDate,
      ...(isEditMode ? { time: reservationLookupTime.trim() } : {}),
      email: reservationLookupEmail.trim(),
      confirmationNumber: reservationLookupConfirmationNumber.trim()
    });

    const lookup: ReservationLookupData = {
      programType: lookupProgramType,
      date: reservationLookupDate,
      ...(isEditMode ? { time: reservationLookupTime.trim() } : {}),
      email: reservationLookupEmail.trim(),
      confirmationNumber: reservationLookupConfirmationNumber.trim()
    };

    const result = await verifyReservation(lookup);
    setIsReservationLookupLoading(false);

    if (!result.found || !result.reservation) {
      setVerifiedReservation(null);
      setReservationLookupError(result.message || 'Sorry! Could not find your Reservation! Please try again.');
      return;
    }

    setVerifiedReservation({
      ...result.reservation,
      time: result.reservation.time || reservationLookupTime.trim(),
      email: result.reservation.email || reservationLookupEmail.trim(),
      confirmationNumber:
        result.reservation.confirmationNumber || reservationLookupConfirmationNumber.trim()
    });

    if (reservationMode === 'edit') {
      const currentDate = new Date(`${result.reservation.date}T00:00:00`);
      setReservationEditDate(Number.isNaN(currentDate.getTime()) ? null : currentDate);
      setReservationEditTime('');
      setCurrentPage(Page.RESERVATION_EDIT);
    }
  };

  const handleReservationEditDateSelect = (date: Date) => {
    setReservationEditDate(date);
    setReservationEditTime('');
    setReservationLookupError('');
  };

  const handleReservationUpdateSubmit = async () => {
    if (!selectedProgram || !verifiedReservation || !reservationEditDate || !reservationEditTime) {
      setReservationLookupError('Please choose a new date and time-slot before submitting.');
      return;
    }

    setIsReservationSubmitting(true);
    setReservationLookupError('');

    const payload = {
      lookup: {
        programType: verifiedReservation.programType || selectedProgram.name,
        date: verifiedReservation.date,
        time: verifiedReservation.time,
        email: verifiedReservation.email,
        confirmationNumber: verifiedReservation.confirmationNumber
      },
      updates: {
        newDate: toDateKey(reservationEditDate),
        newTime: reservationEditTime
      }
    };

    const result = await updateReservation(payload);
    setIsReservationSubmitting(false);

    if (!result.success) {
      setReservationLookupError(result.message || 'Failed to update reservation.');
      return;
    }

    const refreshed = await fetchBookings();
    setBookings(refreshed);

    setReservationResultMessage('Your reservation has been updated successfully.');
    setCurrentPage(Page.RESERVATION_RESULT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReservationCancelSubmit = async () => {
    if (!selectedProgram || !verifiedReservation) return;

    setIsReservationSubmitting(true);
    setReservationLookupError('');

    const result = await cancelReservation({
      programType: verifiedReservation.programType || selectedProgram.name,
      date: verifiedReservation.date,
      email: verifiedReservation.email,
      confirmationNumber: verifiedReservation.confirmationNumber
    });

    setIsReservationSubmitting(false);

    if (!result.success) {
      setReservationLookupError(result.message || 'Failed to cancel reservation.');
      return;
    }

    const refreshed = await fetchBookings();
    setBookings(refreshed);

    setReservationResultMessage('Your reservation has been cancelled successfully.');
    setCurrentPage(Page.RESERVATION_RESULT);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (data: BookingData) => {
    setIsSubmitting(true);
    setBookingSubmitError('');
    try {
      const latestBookings = bookings;

      if (selectedDate) {
        const dateStr = toDateKey(selectedDate);
        const programId = selectedProgram?.id;
        if (programId === 'nama-bhiksha') {
          const hasSatsang = latestBookings.some(
            booking => booking.date === dateStr && isSatsangType(booking.type)
          );
          if (hasSatsang) {
            alert("Sorry, evening slots are unavailable on this date due to a Satsang booking.");
            return;
          }
          const bookedTimes = new Set<string>();
          for (const booking of latestBookings || []) {
            if (!isNamaBhikshaType(booking.type)) continue;
            if (booking.date !== dateStr) continue;
            if (booking.time) bookedTimes.add(booking.time);
          }
          for (const timeLabel of localBookedSlots[dateStr] || []) {
            bookedTimes.add(timeLabel);
          }
          if (bookedTimes.size >= 2) {
            alert("Sorry, that date is already fully booked for Nama Bhiksha. Please choose another date.");
            return;
          }
          const selectedTime = selectedSlot ? `${selectedSlot.start} - ${selectedSlot.end}` : '';
          if (selectedTime && (bookedTimes.has(selectedTime) || bookedTimes.has(selectedSlot?.start || ''))) {
            alert("Sorry, that time slot was just booked. Please choose another slot.");
            return;
          }
        } else {
          const dateTaken = latestBookings.some(booking => {
            if (booking.date !== dateStr) return false;
            if (isNamaBhikshaType(booking.type)) return false;
            if (isSatsangType(booking.type)) {
              return selectedSlot?.period === 'Evening';
            }
            if (isSpecialProgramType(booking.type)) {
              return true;
            }
            return true;
          });
          if (dateTaken) {
            alert("Sorry, that date was just booked. Please choose another date.");
            return;
          }
        }
      }

      setCurrentPage(Page.BOOKING_PROCESSING);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const submitResult = await submitToGoogleSheets(data);
      if (!submitResult.success) {
        setBookingSubmitError('Sorry! Your booking request could not be processed at this time!');
        setCurrentPage(Page.BOOKING_FAILED);
        return;
      }

      // Only block the selected date/slot locally after confirmed API success.
      if (selectedDate) {
        const dateStr = toDateKey(selectedDate);
        if (selectedProgram?.id === 'nama-bhiksha') {
          const timeLabel = selectedSlot ? `${selectedSlot.start} - ${selectedSlot.end}` : '';
          if (timeLabel) {
            setLocalBookedSlots(prev => ({
              ...prev,
              [dateStr]: prev[dateStr] ? Array.from(new Set([...prev[dateStr], timeLabel])) : [timeLabel]
            }));
          }
        } else {
          setLocalBookedDates(prev => (prev.includes(dateStr) ? prev : [...prev, dateStr]));
        }
      }

      setCurrentPage(Page.SUCCESS);
      void fetchBookings()
        .then((records) => {
          setBookings(records);
        })
        .catch((error) => {
          console.error('Error refreshing bookings after submit:', error);
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case Page.HOME:
        return (
          <>
            <section className="relative bg-[#2E3192] text-white py-20 px-4 overflow-hidden">
               <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFCC00] rounded-full blur-[120px] opacity-20 -mr-32 -mt-32"></div>
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#6d1ed1] rounded-full blur-[100px] opacity-10 -ml-32 -mb-32"></div>
               <div className="container mx-auto text-center relative z-10">
                  <div className="mb-10 max-w-lg mx-auto transform hover:scale-[1.02] transition-transform duration-500">
                    <img 
                      src="https://godivinity.org/wp-content/uploads/2025/02/a0f13a6f-167f-428b-88af-ba164a8bac0e-1024x768.jpeg" 
                      alt="Sri Madhurisakhi Sametha Premikavardan" 
                      className="rounded-2xl shadow-2xl border-4 border-white/20 w-full h-auto object-cover"
                    />
                  </div>
                  <h1 className="text-5xl md:text-7xl font-bold mb-6 serif tracking-tight">Atlanta Namadwaar</h1>
                  <p className="text-xl md:text-3xl text-indigo-100 max-w-3xl mx-auto mb-12 italic font-light leading-relaxed">
                    Bring the divine atmosphere of Atlanta Namadwaar into your own home.
                  </p>
                  <p className="text-sm md:text-base text-indigo-100/95 mb-8 font-semibold tracking-wide">
                    <i className="fas fa-location-dot mr-2"></i>
                    239 Atlanta Rd, Cumming, GA
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                      onClick={() => document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })}
                      className="w-full sm:w-auto bg-[#FFCC00] text-[#2E3192] px-12 py-5 rounded-full font-bold text-xl hover:shadow-2xl hover:scale-105 transition-all shadow-md active:scale-95"
                    >
                      Browse Programs
                    </button>
                    <button 
                      onClick={() => setIsDonateOpen(true)}
                      className="w-full sm:w-auto bg-[#6d1ed1] text-white border-2 border-white/20 px-12 py-5 rounded-full font-bold text-xl hover:bg-[#5a18b1] hover:shadow-2xl hover:scale-105 transition-all shadow-md active:scale-95 flex items-center justify-center space-x-3"
                    >
                      <i className="fas fa-heart"></i>
                      <span>Donate Here</span>
                    </button>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setEventPopupStartInFullView(true);
                        setIsEventPopupOpen(true);
                      }}
                      className="w-full sm:w-auto bg-white/10 text-white border-2 border-white/30 px-8 py-3 rounded-full font-semibold text-base hover:bg-white hover:text-[#2E3192] transition-all shadow-md active:scale-95"
                    >
                      View Fundraiser Event
                    </button>
                  </div>
               </div>
            </section>

            <section id="programs" className="py-24 bg-gray-50">
              <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-4xl md:text-5xl font-bold text-[#2E3192] serif">Available Home Programs</h2>
                  <div className="w-24 h-1.5 bg-[#FFCC00] mx-auto mt-6 rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {PROGRAMS.slice(0, -1).map(program => (
                    <ProgramCard
                      key={program.id}
                      program={program}
                      onBook={handleProgramSelect}
                      onManageReservation={handleManageReservation}
                      onDonate={handleProgramDonate}
                    />
                  ))}
                </div>
                {PROGRAMS.length > 0 && (
                  <div className="mt-10 flex justify-center">
                    <div className="w-full md:w-2/3 lg:w-1/3">
                      <ProgramCard
                        key={PROGRAMS[PROGRAMS.length - 1].id}
                        program={PROGRAMS[PROGRAMS.length - 1]}
                        onBook={handleProgramSelect}
                        onManageReservation={handleManageReservation}
                        onDonate={handleProgramDonate}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        );

      case Page.BOOKING_CALENDAR:
        const rawSlots = selectedDate ? generateSlots(selectedProgram!.id, selectedDate) : [];
        const satsangDateStr = selectedDate ? toDateKey(selectedDate) : '';
        const hasSatsang = satsangDateStr ? satsangDates.includes(satsangDateStr) : false;
        const availabilityFlags = getProgramAvailabilityFlags(selectedProgram?.id);
        const slotsAfterSatsang = hasSatsang
          ? rawSlots.filter(slot => slot.period !== 'Evening')
          : rawSlots;
        const availableSlots =
          selectedDate && selectedProgram?.id === 'nama-bhiksha'
            ? (() => {
                const dateStr = toDateKey(selectedDate);
                if (namaBhikshaFullyBookedDates.includes(dateStr)) {
                  return [];
                }
                const bookedTimes = new Set(namaBhikshaSlotsByDate[dateStr] || []);
                return slotsAfterSatsang.filter(slot => {
                  const slotLabel = `${slot.start} - ${slot.end}`;
                  return !(bookedTimes.has(slotLabel) || bookedTimes.has(slot.start));
                });
              })()
            : slotsAfterSatsang;
        const periods: Array<'Morning' | 'Evening'> = ['Morning', 'Evening'];
        const durationOrder = ['30 Minutes', '1 Hour', '1.5 Hours', '2 Hours', '3 Hours'];

        return (
          <section className="py-12 px-4 bg-gray-50 min-h-screen">
            <div className="container mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h2 className="text-4xl font-bold text-[#2E3192] serif mb-2">Schedule Your Session</h2>
                <p className="text-gray-500 text-lg">Booking: <span className="font-bold text-[#2E3192]">{selectedProgram?.name}</span> for 2026-2027</p>
                {availabilityFlags.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {availabilityFlags.map((flag) => (
                      <span
                        key={flag}
                        className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-[#2E3192]"
                      >
                        <i className="fas fa-flag mr-1"></i>
                        {flag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-5">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                    <h4 className="font-bold text-[#2E3192] mb-6 flex items-center text-lg">
                      <span className="w-8 h-8 rounded-full bg-[#2E3192] text-white flex items-center justify-center mr-3 text-sm">1</span>
                      Select a Date
                    </h4>
                    <CalendarView 
                      programId={selectedProgram!.id} 
                      onSelectDate={handleDateSelect}
                      selectedDate={selectedDate}
                      bookedDates={calendarBlockedDates}
                    />
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full">
                    <h4 className="font-bold text-[#2E3192] mb-6 flex items-center text-lg">
                      <span className="w-8 h-8 rounded-full bg-[#2E3192] text-white flex items-center justify-center mr-3 text-sm">2</span>
                      Available Time Slots
                    </h4>
                    
                    {!selectedDate ? (
                      <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center text-gray-400">
                        <i className="far fa-calendar-check text-5xl mb-4 opacity-20"></i>
                        <p className="text-lg">Please select a date on the calendar</p>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="bg-red-50 rounded-2xl border-2 border-dashed border-red-100 p-16 text-center text-red-400">
                        <i className="fas fa-exclamation-circle text-5xl mb-4"></i>
                        <p className="text-lg">No slots available for this program on this date.</p>
                      </div>
                    ) : (
                      <div className="space-y-10 pr-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {periods.map((period) => {
                          const periodSlots = availableSlots.filter(s => s.period === period);
                          if (periodSlots.length === 0) return null;

                          return (
                            <div key={period} className="animate-fade-in">
                              <h5 className="text-lg font-black uppercase tracking-widest text-[#2E3192] border-b-2 border-[#FFCC00] inline-block mb-6 pr-4">
                                {period} Slots
                              </h5>
                              <div className="space-y-8">
                                {durationOrder.map(duration => {
                                  const group = periodSlots.filter(s => s.durationLabel === duration);
                                  if (group.length === 0) return null;
                                  return (
                                    <div key={duration} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                      <p className="text-xs font-bold text-[#2E3192]/60 uppercase tracking-tighter mb-3 flex items-center">
                                        <i className="fas fa-hourglass-half mr-2"></i>
                                        {duration} Sessions
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {group.map((slot, idx) => (
                                          <button
                                            key={idx}
                                            onClick={() => handleSlotSelect(slot)}
                                            className="bg-white border border-gray-200 p-4 rounded-xl text-left hover:border-[#FFCC00] hover:ring-2 hover:ring-[#FFCC00]/20 transition-all flex justify-between items-center group shadow-sm active:scale-95"
                                          >
                                            <span className="font-bold text-gray-800 text-lg">{slot.start} - {slot.end}</span>
                                            <i className="fas fa-arrow-right text-gray-200 group-hover:text-[#2E3192] group-hover:translate-x-1 transition-all"></i>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => setCurrentPage(Page.HOME)}
                  className="px-10 py-3 rounded-xl border-2 border-[#2E3192] text-[#2E3192] font-bold hover:bg-[#2E3192] hover:text-white transition-all shadow-sm"
                >
                  Back to Homepage
                </button>
              </div>
            </div>
          </section>
        );

      case Page.BOOKING_FORM:
        return (
          <section className="py-12 px-4 bg-gray-50 min-h-screen">
            <div className="container mx-auto max-w-4xl">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#2E3192] serif">Finalize Your Request</h2>
                <p className="text-gray-500">Provide your contact details to host the program.</p>
              </div>
              <BookingForm 
                program={selectedProgram!} 
                selectedDate={selectedDate!}
                selectedSlot={selectedSlot!}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                onCancel={() => setCurrentPage(Page.BOOKING_CALENDAR)}
              />
            </div>
          </section>
        );

      case Page.BOOKING_PROCESSING:
        return (
          <section className="py-32 px-4 text-center animate-fade-in">
            <div className="max-w-xl mx-auto">
              <div className="w-24 h-24 bg-[#2E3192]/10 text-[#2E3192] rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                 <i className="fas fa-spinner fa-spin text-4xl"></i>
              </div>
              <h2 className="text-4xl font-bold text-[#2E3192] mb-4 serif">Your Booking Request is Being Processed</h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Please stand by while we confirm your booking request.
              </p>
            </div>
          </section>
        );

      case Page.BOOKING_FAILED:
        return (
          <section className="py-32 px-4 text-center animate-fade-in">
            <div className="max-w-xl mx-auto">
              <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                 <i className="fas fa-circle-exclamation text-4xl"></i>
              </div>
              <h2 className="text-4xl font-bold text-[#2E3192] mb-4 serif">Booking Request Not Processed</h2>
              <div className="space-y-6 text-xl text-gray-600 mb-10 leading-relaxed">
                <p>
                  {bookingSubmitError || 'Sorry! Your booking request could not be processed at this time.'}
                </p>
                <p>
                  Please contact us via email or phone, and we will help you complete your booking.
                </p>
                <p className="font-bold text-[#2E3192]">
                  Email: {CONTACT_EMAIL}<br />
                  Phone: {CONTACT_PHONE}
                </p>
              </div>
              <button
                onClick={() => setCurrentPage(Page.HOME)}
                className="bg-[#2E3192] text-white px-12 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all shadow-lg active:scale-95"
              >
                Back to Homepage
              </button>
            </div>
          </section>
        );

      case Page.SUCCESS:
        return (
          <section className="py-32 px-4 text-center animate-fade-in">
            <div className="max-w-xl mx-auto">
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
                 <i className="fas fa-check text-4xl"></i>
              </div>
              <h2 className="text-4xl font-bold text-[#2E3192] mb-4 serif">Booking Confirmed!</h2>
              <div className="space-y-6 text-xl text-gray-600 mb-10 leading-relaxed">
                <p>
                  Thank you! We've received your request for <strong>{selectedProgram?.name}</strong> on {selectedDate?.toLocaleDateString()}. Our Satsang Members will reach out to you shortly to finalize the details.
                </p>
                <p>
                  If you have any questions or would like to request any changes, please contact us via email or phone:
                </p>
                <p className="font-bold text-[#2E3192]">
                  Email: {CONTACT_EMAIL}<br />
                  Phone: {CONTACT_PHONE}
                </p>
                <p className="italic">
                  We look forward to bringing Sri Madhurisakhi Sametha Premikavardan's blessings to your Home!
                </p>
                <p className="font-bold text-[#2E3192] serif text-2xl">
                  Radhe Radhe!
                </p>
              </div>
              <button 
                onClick={() => setCurrentPage(Page.HOME)}
                className="bg-[#2E3192] text-white px-12 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all shadow-lg active:scale-95"
              >
                Back to Homepage
              </button>
            </div>
          </section>
        );

      case Page.RESERVATION_CONFIRMATION:
        return (
          <section className="py-12 px-4 bg-gray-50 min-h-screen">
            <div className="container mx-auto max-w-2xl">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-3xl font-bold text-[#2E3192] serif mb-2">Manage Reservation</h2>
                <p className="text-gray-600 mb-8">
                  Enter your confirmation number to find your reservation.
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Confirmation Number *
                    </label>
                    <input
                      type="text"
                      value={reservationLookupConfirmationNumber}
                      onChange={(e) => {
                        setReservationLookupConfirmationNumber(e.target.value);
                        setReservationLookupError('');
                      }}
                      placeholder="Enter confirmation number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
                    />
                  </div>
                </div>

                {reservationLookupError && (
                  <div className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                    {reservationLookupError}
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleVerifyReservationByConfirmation}
                    disabled={isReservationLookupLoading}
                    className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all disabled:opacity-60"
                  >
                    {isReservationLookupLoading ? 'Checking...' : 'Validate Confirmation'}
                  </button>
                  <button
                    onClick={() => setCurrentPage(Page.HOME)}
                    className="w-full sm:w-auto px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Back to Programs
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case Page.RESERVATION_OPTIONS:
        return (
          <section className="py-12 px-4 bg-gray-50 min-h-screen">
            <div className="container mx-auto max-w-2xl">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-3xl font-bold text-[#2E3192] serif mb-2">Manage Reservation</h2>
                <p className="text-gray-600 mb-4">
                  Reservation verified for <span className="font-bold text-[#2E3192]">{selectedProgram?.name || verifiedReservation?.programType}</span>.
                </p>

                {verifiedReservation && (
                  <div className="mb-8 p-4 rounded-xl border border-[#2E3192]/20 bg-[#2E3192]/5 space-y-1 text-sm text-gray-700">
                    <p><strong>Date:</strong> {verifiedReservation.date}</p>
                    <p><strong>Time:</strong> {verifiedReservation.time || 'N/A'}</p>
                    <p><strong>Email:</strong> {verifiedReservation.email}</p>
                    <p><strong>Confirmation:</strong> {verifiedReservation.confirmationNumber}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSelectReservationMode('edit')}
                    className="px-6 py-5 rounded-xl bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all shadow-md"
                  >
                    Edit Reservation
                  </button>
                  <button
                    onClick={() => handleSelectReservationMode('cancel')}
                    className="px-6 py-5 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all"
                  >
                    Cancel Reservation
                  </button>
                </div>
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => {
                      setReservationLookupError('');
                      setVerifiedReservation(null);
                      setReservationMode(null);
                      setReservationLookupConfirmationNumber('');
                      setCurrentPage(Page.RESERVATION_CONFIRMATION);
                    }}
                    className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Use Different Confirmation
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case Page.RESERVATION_LOOKUP:
        if (!verifiedReservation) {
          return (
            <section className="py-12 px-4 bg-gray-50 min-h-screen">
              <div className="container mx-auto max-w-2xl">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <h2 className="text-3xl font-bold text-[#2E3192] serif mb-2">Cancel Reservation</h2>
                  <p className="text-gray-600 mb-8">Please validate your confirmation number first.</p>
                  <button
                    onClick={() => setCurrentPage(Page.RESERVATION_CONFIRMATION)}
                    className="px-6 py-3 rounded-lg bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all"
                  >
                    Go to Confirmation
                  </button>
                </div>
              </div>
            </section>
          );
        }

        return (
          <section className="py-12 px-4 bg-gray-50 min-h-screen">
            <div className="container mx-auto max-w-2xl">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-3xl font-bold text-[#2E3192] serif mb-2">
                  Cancel Reservation
                </h2>
                <p className="text-gray-600 mb-8">
                  Review your reservation and confirm cancellation.
                </p>
                <div className="p-4 rounded-xl border border-[#2E3192]/20 bg-[#2E3192]/5">
                  <h4 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-2">Reservation Found</h4>
                  <p className="text-sm text-gray-700"><strong>Date:</strong> {verifiedReservation.date}</p>
                  <p className="text-sm text-gray-700"><strong>Time:</strong> {verifiedReservation.time || 'N/A'}</p>
                  <p className="text-sm text-gray-700"><strong>Email:</strong> {verifiedReservation.email}</p>
                  <p className="text-sm text-gray-700"><strong>Confirmation:</strong> {verifiedReservation.confirmationNumber}</p>
                  <button
                    onClick={handleReservationCancelSubmit}
                    disabled={isReservationSubmitting}
                    className="mt-4 w-full px-4 py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-all disabled:opacity-60"
                  >
                    {isReservationSubmitting ? 'Cancelling...' : 'Confirm Cancel Reservation'}
                  </button>
                </div>

                {reservationLookupError && (
                  <div className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                    {reservationLookupError}
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setCurrentPage(Page.RESERVATION_OPTIONS)}
                    className="w-full sm:w-auto px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case Page.RESERVATION_EDIT:
        const editCalendarBlockedDates =
          selectedProgram?.id === 'nama-bhiksha'
            ? Array.from(new Set([...reservationBlockedDates, ...reservationNamaBhikshaFullyBookedDates]))
            : reservationBlockedDates;

        return (
          <section className="py-12 px-4 bg-gray-50 min-h-screen">
            <div className="container mx-auto max-w-5xl">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold text-[#2E3192] serif">Choose a new Date and Time for your Reservation!</h2>
                <p className="text-gray-500">
                  Current: {verifiedReservation?.date} {verifiedReservation?.time ? `(${verifiedReservation.time})` : ''}
                </p>
              </div>

              <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="font-bold text-[#2E3192] mb-6 flex items-center text-lg">
                  <span className="w-8 h-8 rounded-full bg-[#2E3192] text-white flex items-center justify-center mr-3 text-sm">1</span>
                  Choose New Date
                </h4>
                <CalendarView
                  programId={selectedProgram!.id}
                  onSelectDate={handleReservationEditDateSelect}
                  selectedDate={reservationEditDate}
                  bookedDates={editCalendarBlockedDates}
                />

                <div className="mt-8">
                  <h4 className="font-bold text-[#2E3192] mb-3 flex items-center text-lg">
                    <span className="w-8 h-8 rounded-full bg-[#2E3192] text-white flex items-center justify-center mr-3 text-sm">2</span>
                    Choose New Time Slot
                  </h4>
                  <select
                    value={reservationEditTime}
                    onChange={(e) => {
                      setReservationEditTime(e.target.value);
                      setReservationLookupError('');
                    }}
                    disabled={!reservationEditDate}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">
                      {!reservationEditDate
                        ? 'Select new date first'
                        : reservationEditTimeOptions.length > 0
                          ? 'Select new time slot'
                          : 'No slots available on selected date'}
                    </option>
                    {reservationEditTimeOptions.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>

                {reservationLookupError && (
                  <div className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                    {reservationLookupError}
                  </div>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleReservationUpdateSubmit}
                    disabled={isReservationSubmitting || !reservationEditDate || !reservationEditTime}
                    className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all disabled:opacity-60"
                  >
                    {isReservationSubmitting ? 'Updating...' : 'Submit Update'}
                  </button>
                  <button
                    onClick={() => setCurrentPage(Page.RESERVATION_OPTIONS)}
                    className="w-full sm:w-auto px-8 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case Page.RESERVATION_RESULT:
        return (
          <section className="py-24 px-4 bg-gray-50 min-h-screen">
            <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-check text-2xl"></i>
              </div>
              <h2 className="text-3xl font-bold text-[#2E3192] serif mb-3">Request Completed</h2>
              <p className="text-gray-600 mb-8">{reservationResultMessage}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    resetReservationFlow();
                    setCurrentPage(Page.HOME);
                  }}
                  className="px-8 py-3 rounded-lg bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all"
                >
                  Back to Homepage
                </button>
                <button
                  onClick={() => {
                    resetReservationFlow();
                    setCurrentPage(Page.RESERVATION_CONFIRMATION);
                  }}
                  className="px-8 py-3 rounded-lg border border-[#2E3192] text-[#2E3192] font-bold hover:bg-[#2E3192]/5 transition-all"
                >
                  Manage Another
                </button>
              </div>
            </div>
          </section>
        );

      case Page.INSTRUCTIONS:
        return (
          <section className="py-20 px-4 bg-white min-h-screen">
            <div className="container mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold text-[#2E3192] mb-8 serif">Backend Setup & Deployment</h2>
              <div className="prose prose-indigo max-w-none text-gray-700">
                <p className="text-lg mb-6 font-semibold">Your Google Sheet must have these columns in order (A-I):</p>
                <div className="bg-[#2E3192]/5 p-6 rounded-xl font-mono text-sm mb-8 grid grid-cols-1 gap-2 border border-[#2E3192]/10">
                  <div className="flex justify-between"><span className="font-bold">Column A:</span> <code>typeOfProgram</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column B:</span> <code>date</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column C:</span> <code>name</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column D:</span> <code>email</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column E:</span> <code>phoneNumber</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column F:</span> <code>fullAddress</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column G:</span> <code>occasion</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column H:</span> <code>additionalNotes</code></div>
                  <div className="flex justify-between"><span className="font-bold">Column I:</span> <code>timestamp</code></div>
                </div>
                
                <h3 className="text-xl font-bold mb-4">Resetting Bookings</h3>
                <div className="bg-gray-50 p-6 rounded-xl border mb-10">
                   <p className="mb-4 text-sm text-gray-600">
                     <strong>Option 1: Permanent Reset (Global)</strong><br />
                     Delete the rows directly in your Google Sheet. New visitors will then see those dates as available once the page is refreshed.
                   </p>
                   <p className="mb-4 text-sm text-gray-600">
                     <strong>Option 2: Session Reset (Local)</strong><br />
                     Click the button below to clear the dates you have blocked in this current browser session.
                   </p>
                   <button 
                     onClick={handleResetBookedDates}
                     className="px-4 py-2 border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold transition-colors text-sm"
                   >
                     Reset Local Calendar State
                   </button>
                </div>

                <h3 className="text-xl font-bold mb-4">Apps Script Setup</h3>
                <ol className="list-decimal pl-6 space-y-4">
                  <li>In Google Sheets, go to <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Paste your <code>doPost</code> function.</li>
                  <li>Click <strong>Deploy &gt; New Deployment</strong>, select <strong>Web App</strong>.</li>
                  <li>Set Access to <strong>Anyone</strong>.</li>
                  <li>Copy the Web App URL and paste it into <code>constants.tsx</code>.</li>
                </ol>
              </div>
              <div className="mt-12 pt-8 border-t">
                <button onClick={() => setCurrentPage(Page.HOME)} className="bg-gray-100 text-gray-800 px-6 py-3 rounded-lg font-bold">Back to App</button>
              </div>
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  if (isLoadingBookedDates) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-700">
        <div className="text-center space-y-3">
          <div className="text-sm uppercase tracking-widest text-gray-400 font-bold">Loading</div>
          <div className="text-2xl font-bold text-[#2E3192] serif">Checking booked dates...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#FFCC00] selection:text-[#2E3192]">
      <Header 
        onNavigate={setCurrentPage} 
        currentPage={currentPage} 
        onOpenDonate={() => handleDonateOpen()}
      />
      <main className="flex-grow">{renderContent()}</main>
      <DonateModal 
        isOpen={isDonateOpen} 
        onClose={() => setIsDonateOpen(false)} 
        title={donateTitle}
        message={donateMessage}
      />
      <EventPopupModal
        isOpen={isEventPopupOpen}
        openInFullView={eventPopupStartInFullView}
        onClose={() => {
          setIsEventPopupOpen(false);
          setEventPopupStartInFullView(false);
        }}
      />
      <Footer />
    </div>
  );
};

export default App;
