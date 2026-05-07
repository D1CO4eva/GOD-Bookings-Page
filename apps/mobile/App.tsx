import 'react-native-gesture-handler';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  BookingData,
  BookingRecord,
  BookingSubmitResult,
  DevotionalProgram,
  normalizeConfirmationForMatch,
  normalizeEmailForMatch,
  normalizeProgramType,
  normalizeTimeForMatch,
  PROGRAMS,
  ReservationDetails,
  ReservationLookupData,
  resolveProgramByType,
  TimeSlot,
  toDateKey,
  toSlotLabel,
  isNamaBhikshaType,
  isSatsangBlockedSlot
} from '../../packages/shared/src';
import { bookingApiClient } from './src/api/client';
import { useBookingDerivedState } from './src/hooks/useBookingDerivedState';
import { RootStackParamList } from './src/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { BookingFormScreen } from './src/screens/BookingFormScreen';
import { ReservationLookupScreen } from './src/screens/ReservationLookupScreen';
import { ReservationOptionsScreen } from './src/screens/ReservationOptionsScreen';
import { ReservationEditScreen } from './src/screens/ReservationEditScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { mobileTheme } from './src/theme/tokens';

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [selectedProgram, setSelectedProgram] = useState<DevotionalProgram | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [localBookedDates, setLocalBookedDates] = useState<string[]>([]);
  const [localBookedSlots, setLocalBookedSlots] = useState<Record<string, string[]>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationLookupError, setReservationLookupError] = useState('');
  const [isReservationLookupLoading, setIsReservationLookupLoading] = useState(false);
  const [verifiedReservation, setVerifiedReservation] = useState<ReservationDetails | null>(null);
  const [reservationEditDate, setReservationEditDate] = useState<Date | null>(null);
  const [reservationEditSlot, setReservationEditSlot] = useState<TimeSlot | null>(null);
  const [isReservationSubmitting, setIsReservationSubmitting] = useState(false);

  const {
    blockedDates,
    namaBhikshaSlotsByDate,
    calendarBlockedDates,
    satsangDates,
    reservationBlockedDates,
    reservationNamaBhikshaSlotsByDate
  } = useBookingDerivedState({
    bookings,
    localBookedDates,
    localBookedSlots,
    selectedProgramId: selectedProgram?.id,
    verifiedReservation
  });

  const selectedProgramForReservationEdit = useMemo(() => {
    if (!verifiedReservation) return selectedProgram;

    const resolved = resolveProgramByType(verifiedReservation.programType, PROGRAMS);
    return resolved || selectedProgram;
  }, [selectedProgram, verifiedReservation]);

  const refreshBookings = async () => {
    const latest = await bookingApiClient.fetchBookings();
    setBookings(latest);
  };

  useEffect(() => {
    refreshBookings();
  }, []);

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
      if (normalizeConfirmationForMatch(booking.confirmationNumber || '') !== normalizedConfirmation) {
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

    const suffixedMatch = candidates.find((booking) => /^radha kalyanam\s*-/i.test((booking.type || '').trim()));
    return suffixedMatch?.type || candidates[0].type || programType;
  };

  const performBookingSubmit = async (data: BookingData): Promise<BookingSubmitResult> => {
    if (!selectedProgram || !selectedDate || !selectedSlot) {
      return { success: false, status: null, message: 'Missing program, date, or slot selection.' };
    }

    const dateStr = toDateKey(selectedDate);
    if (satsangDates.includes(dateStr) && isSatsangBlockedSlot(selectedSlot)) {
      return {
        success: false,
        status: null,
        message: 'Evening slots are unavailable on dates with Satsang.'
      };
    }

    if (isNamaBhikshaType(selectedProgram.name)) {
      const bookedTimes = new Set<string>();
      for (const booking of bookings) {
        if (booking.date !== dateStr || !isNamaBhikshaType(booking.type)) continue;
        if (booking.time) bookedTimes.add(booking.time.trim());
      }
      for (const timeLabel of localBookedSlots[dateStr] || []) {
        bookedTimes.add(timeLabel);
      }

      const selectedTime = toSlotLabel(selectedSlot);
      if (bookedTimes.size >= 2) {
        return {
          success: false,
          status: null,
          message: 'That date reached the maximum Nama Bhiksha bookings. Please choose another date.'
        };
      }
      if (bookedTimes.has(selectedTime) || bookedTimes.has(selectedSlot.start)) {
        return {
          success: false,
          status: null,
          message: 'That time slot was just booked. Please choose another slot.'
        };
      }

    } else if (blockedDates.includes(dateStr)) {
      return {
        success: false,
        status: null,
        message: 'That date was just booked. Please choose another date.'
      };
    }

    const result = await bookingApiClient.submitBooking(data);
    if (!result.success) {
      return result;
    }

    if (isNamaBhikshaType(selectedProgram.name)) {
      const timeLabel = toSlotLabel(selectedSlot);
      if (timeLabel) {
        setLocalBookedSlots((prev) => ({
          ...prev,
          [dateStr]: prev[dateStr] ? Array.from(new Set([...prev[dateStr], timeLabel])) : [timeLabel]
        }));
      }
    } else {
      setLocalBookedDates((prev) => (prev.includes(dateStr) ? prev : [...prev, dateStr]));
    }

    return result;
  };

  const resetToHomeState = () => {
    setSelectedProgram(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setVerifiedReservation(null);
    setReservationEditDate(null);
    setReservationEditSlot(null);
    setReservationLookupError('');
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: mobileTheme.colors.brand },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: mobileTheme.colors.background }
          }}
        >
          <Stack.Screen name="Home" options={{ title: 'Programs' }}>
            {({ navigation }) => (
              <HomeScreen
                onBookProgram={(program) => {
                  setSelectedProgram(program);
                  setSelectedDate(null);
                  setSelectedSlot(null);
                  navigation.navigate('Calendar');
                }}
                onManageReservation={(program) => {
                  setSelectedProgram(program);
                  setReservationLookupError('');
                  setVerifiedReservation(null);
                  navigation.navigate('ReservationLookup');
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Calendar" options={{ title: 'Choose Date & Slot' }}>
            {({ navigation }) => (
              <CalendarScreen
                selectedProgram={selectedProgram}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onSelectedDateChange={(date) => {
                  setSelectedDate(date);
                  setSelectedSlot(null);
                }}
                onSelectSlot={setSelectedSlot}
                blockedDates={calendarBlockedDates}
                namaBhikshaSlotsByDate={namaBhikshaSlotsByDate}
                satsangDates={satsangDates}
                onContinue={() => navigation.navigate('BookingForm')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="BookingForm" options={{ title: 'Host Details' }}>
            {({ navigation }) => (
              <BookingFormScreen
                program={selectedProgram}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                isSubmitting={isSubmitting}
                onSubmit={async (data) => {
                  setIsSubmitting(true);
                  const result = await performBookingSubmit(data);
                  setIsSubmitting(false);

                  if (result.success) {
                    await refreshBookings();
                    navigation.navigate('BookingResult', {
                      success: true,
                      message: 'Your booking has been submitted successfully.'
                    });
                    return;
                  }

                  navigation.navigate('BookingResult', {
                    success: false,
                    message:
                      result.message ||
                      'Booking could not be submitted. Please try again or contact support.'
                  });
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="BookingResult" options={{ title: 'Booking Status' }}>
            {({ route, navigation }) => (
              <ResultScreen
                title={route.params.success ? 'Booking Confirmed' : 'Booking Failed'}
                message={route.params.message || ''}
                onDone={() => {
                  resetToHomeState();
                  navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ReservationLookup" options={{ title: 'Find Reservation' }}>
            {({ navigation }) => (
              <ReservationLookupScreen
                loading={isReservationLookupLoading}
                error={reservationLookupError}
                onVerify={async (lookup) => {
                  setReservationLookupError('');
                  setIsReservationLookupLoading(true);
                  const result = await bookingApiClient.verifyReservation(lookup);
                  setIsReservationLookupLoading(false);

                  if (!result.found || !result.reservation) {
                    setReservationLookupError(
                      result.message || 'Sorry! Could not find your Reservation! Please try again.'
                    );
                    return;
                  }

                  const resolvedProgramType = resolveProgramTypeForReservationLookup({
                    programType: result.reservation.programType,
                    date: result.reservation.date,
                    time: result.reservation.time,
                    email: result.reservation.email,
                    confirmationNumber: result.reservation.confirmationNumber
                  });

                  const reservation: ReservationDetails = {
                    ...result.reservation,
                    programType: resolvedProgramType
                  };

                  setVerifiedReservation(reservation);
                  setSelectedProgram(resolveProgramByType(reservation.programType, PROGRAMS));
                  setReservationEditDate(null);
                  setReservationEditSlot(null);
                  navigation.navigate('ReservationOptions');
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ReservationOptions" options={{ title: 'Reservation Options' }}>
            {({ navigation }) => (
              <ReservationOptionsScreen
                reservation={verifiedReservation}
                isSubmitting={isReservationSubmitting}
                onEdit={() => {
                  setReservationLookupError('');
                  setReservationEditDate(null);
                  setReservationEditSlot(null);
                  navigation.navigate('ReservationEdit');
                }}
                onCancel={async () => {
                  if (!verifiedReservation) {
                    Alert.alert('Reservation not found', 'Please verify your reservation again.');
                    return;
                  }

                  setIsReservationSubmitting(true);

                  const lookup: ReservationLookupData = {
                    confirmationNumber: verifiedReservation.confirmationNumber,
                    programType: verifiedReservation.programType,
                    date: verifiedReservation.date,
                    time: verifiedReservation.time,
                    email: verifiedReservation.email
                  };

                  const result = await bookingApiClient.cancelReservation(lookup);
                  setIsReservationSubmitting(false);

                  if (result.success) {
                    await refreshBookings();
                    navigation.navigate('ReservationResult', {
                      success: true,
                      message: result.message || 'Your reservation has been cancelled.',
                      mode: 'cancel'
                    });
                    return;
                  }

                  navigation.navigate('ReservationResult', {
                    success: false,
                    message: result.message || 'Failed to cancel reservation.',
                    mode: 'cancel'
                  });
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ReservationEdit" options={{ title: 'Edit Reservation' }}>
            {({ navigation }) => (
              <ReservationEditScreen
                selectedProgram={selectedProgramForReservationEdit}
                reservationEditDate={reservationEditDate}
                reservationEditSlot={reservationEditSlot}
                onReservationEditDateChange={(date) => {
                  setReservationEditDate(date);
                  setReservationEditSlot(null);
                  setReservationLookupError('');
                }}
                onReservationEditSlotChange={(slot) => {
                  setReservationEditSlot(slot);
                  setReservationLookupError('');
                }}
                onSubmit={async () => {
                  if (!selectedProgramForReservationEdit || !verifiedReservation || !reservationEditDate || !reservationEditSlot) {
                    setReservationLookupError('Please choose a new date and time-slot before submitting.');
                    return;
                  }

                  setIsReservationSubmitting(true);

                  const lookup: ReservationLookupData = {
                    confirmationNumber: verifiedReservation.confirmationNumber,
                    programType: verifiedReservation.programType,
                    date: verifiedReservation.date,
                    time: verifiedReservation.time,
                    email: verifiedReservation.email
                  };

                  const result = await bookingApiClient.updateReservation({
                    lookup,
                    updates: {
                      newDate: toDateKey(reservationEditDate),
                      newTime: toSlotLabel(reservationEditSlot)
                    }
                  });

                  setIsReservationSubmitting(false);

                  if (result.success) {
                    await refreshBookings();
                    navigation.navigate('ReservationResult', {
                      success: true,
                      message: result.message || 'Your reservation was updated successfully.',
                      mode: 'edit'
                    });
                    return;
                  }

                  setReservationLookupError(result.message || 'Failed to update reservation.');
                }}
                submitting={isReservationSubmitting}
                error={reservationLookupError}
                reservationBlockedDates={reservationBlockedDates}
                reservationNamaBhikshaSlotsByDate={reservationNamaBhikshaSlotsByDate}
                satsangDates={satsangDates}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ReservationResult" options={{ title: 'Reservation Status' }}>
            {({ route, navigation }) => (
              <ResultScreen
                title={route.params.success ? 'Reservation Updated' : 'Reservation Error'}
                message={route.params.message}
                onDone={() => {
                  resetToHomeState();
                  navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
