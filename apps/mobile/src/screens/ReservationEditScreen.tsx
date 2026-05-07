import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import {
  DevotionalProgram,
  generateSlots,
  isDateSelectable,
  isNamaBhikshaType,
  isSatsangBlockedSlot,
  TimeSlot,
  toDateKey,
  toSlotLabel
} from '../../../../packages/shared/src';
import { mobileTheme } from '../theme/tokens';
import { buildCalendarMarkedDates, CALENDAR_MAX_DATE } from '../utils/calendarMarks';

interface ReservationEditScreenProps {
  selectedProgram: DevotionalProgram | null;
  reservationEditDate: Date | null;
  reservationEditSlot: TimeSlot | null;
  onReservationEditDateChange: (date: Date) => void;
  onReservationEditSlotChange: (slot: TimeSlot) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
  error: string;
  reservationBlockedDates: string[];
  reservationNamaBhikshaSlotsByDate: Record<string, string[]>;
  satsangDates: string[];
}

export const ReservationEditScreen: React.FC<ReservationEditScreenProps> = ({
  selectedProgram,
  reservationEditDate,
  reservationEditSlot,
  onReservationEditDateChange,
  onReservationEditSlotChange,
  onSubmit,
  submitting,
  error,
  reservationBlockedDates,
  reservationNamaBhikshaSlotsByDate,
  satsangDates
}) => {
  const selectedDateKey = reservationEditDate ? toDateKey(reservationEditDate) : '';

  const markedDates = useMemo(() => {
    if (!selectedProgram) return {};

    return buildCalendarMarkedDates({
      programId: selectedProgram.id,
      blockedDates: reservationBlockedDates,
      selectedDateKey
    });
  }, [reservationBlockedDates, selectedDateKey, selectedProgram]);

  const slotOptions = useMemo(() => {
    if (!selectedProgram || !reservationEditDate) return [];

    const generatedSlots = generateSlots(selectedProgram.id, reservationEditDate);
    const dateKey = toDateKey(reservationEditDate);
    const satsangBlocksEvening = satsangDates.includes(dateKey);
    const slotsAfterSatsang = satsangBlocksEvening
      ? generatedSlots.filter((slot) => !isSatsangBlockedSlot(slot))
      : generatedSlots;

    if (!isNamaBhikshaType(selectedProgram.name)) {
      return slotsAfterSatsang;
    }

    const bookedTimes = new Set(reservationNamaBhikshaSlotsByDate[dateKey] || []);

    return slotsAfterSatsang.filter((slot) => {
      const label = toSlotLabel(slot);
      return !(bookedTimes.has(label) || bookedTimes.has(slot.start));
    });
  }, [selectedProgram, reservationEditDate, reservationNamaBhikshaSlotsByDate, satsangDates]);

  const onDayPress = (day: DateData) => {
    if (!selectedProgram) return;
    const date = new Date(day.year, day.month - 1, day.day);
    if (!isDateSelectable(selectedProgram.id, date, reservationBlockedDates)) {
      return;
    }
    onReservationEditDateChange(date);
  };

  if (!selectedProgram) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.info}>Unable to resolve your reservation program type.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Edit Reservation</Text>
        <Text style={styles.subtitle}>Choose a new date and slot for {selectedProgram.name}.</Text>

        <Calendar
          minDate={toDateKey(new Date())}
          maxDate={CALENDAR_MAX_DATE}
          markedDates={markedDates}
          onDayPress={onDayPress}
          theme={{
            selectedDayBackgroundColor: mobileTheme.colors.brand,
            todayTextColor: mobileTheme.colors.brand,
            arrowColor: mobileTheme.colors.brand
          }}
        />

        <View style={styles.slotSection}>
          {slotOptions.map((slot) => {
            const selected =
              reservationEditSlot?.start === slot.start && reservationEditSlot?.end === slot.end;
            return (
              <Pressable
                key={`${slot.start}-${slot.end}-${slot.durationLabel}`}
                style={[styles.slotButton, selected ? styles.slotButtonSelected : null]}
                onPress={() => onReservationEditSlotChange(slot)}
              >
                <Text style={[styles.slotText, selected ? styles.slotTextSelected : null]}>
                  {toSlotLabel(slot)} ({slot.durationLabel})
                </Text>
              </Pressable>
            );
          })}
          {reservationEditDate && slotOptions.length === 0 && (
            <Text style={styles.info}>No slots available on selected date.</Text>
          )}
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[
            styles.submitButton,
            !(reservationEditDate && reservationEditSlot) || submitting ? styles.disabled : null
          ]}
          disabled={!(reservationEditDate && reservationEditSlot) || submitting}
          onPress={onSubmit}
        >
          <Text style={styles.submitText}>{submitting ? 'Updating...' : 'Submit Reservation Update'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: mobileTheme.colors.background
  },
  container: {
    padding: 16,
    paddingBottom: 28
  },
  heading: {
    fontSize: 22,
    color: mobileTheme.colors.textPrimary,
    fontWeight: '700'
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 12,
    color: mobileTheme.colors.textMuted
  },
  slotSection: {
    marginTop: 14,
    gap: 8
  },
  slotButton: {
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.sm,
    padding: 10,
    backgroundColor: mobileTheme.colors.surface
  },
  slotButtonSelected: {
    borderColor: mobileTheme.colors.brand,
    backgroundColor: '#eef2ff'
  },
  slotText: {
    color: mobileTheme.colors.textBody,
    fontWeight: '500'
  },
  slotTextSelected: {
    color: mobileTheme.colors.textPrimary,
    fontWeight: '700'
  },
  submitButton: {
    marginTop: 16,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: mobileTheme.colors.brand
  },
  submitText: {
    color: mobileTheme.colors.surface,
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.55
  },
  error: {
    marginTop: 8,
    color: mobileTheme.colors.danger,
    fontWeight: '600'
  },
  info: {
    color: mobileTheme.colors.textMuted
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16
  }
});
