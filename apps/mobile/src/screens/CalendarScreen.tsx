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

interface CalendarScreenProps {
  selectedProgram: DevotionalProgram | null;
  selectedDate: Date | null;
  onSelectedDateChange: (date: Date) => void;
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  blockedDates: string[];
  namaBhikshaSlotsByDate: Record<string, string[]>;
  satsangDates: string[];
  onContinue: () => void;
}

export const CalendarScreen: React.FC<CalendarScreenProps> = ({
  selectedProgram,
  selectedDate,
  onSelectedDateChange,
  selectedSlot,
  onSelectSlot,
  blockedDates,
  namaBhikshaSlotsByDate,
  satsangDates,
  onContinue
}) => {
  const selectedDateKey = selectedDate ? toDateKey(selectedDate) : '';

  const markedDates = useMemo(() => {
    if (!selectedProgram) return {};

    return buildCalendarMarkedDates({
      programId: selectedProgram.id,
      blockedDates,
      selectedDateKey
    });
  }, [blockedDates, selectedDateKey, selectedProgram]);

  const availableSlots = useMemo(() => {
    if (!selectedProgram || !selectedDate) return [];

    const generatedSlots = generateSlots(selectedProgram.id, selectedDate);
    const dateKey = toDateKey(selectedDate);
    const satsangBlocksEvening = satsangDates.includes(dateKey);
    const slotsAfterSatsang = satsangBlocksEvening
      ? generatedSlots.filter((slot) => !isSatsangBlockedSlot(slot))
      : generatedSlots;

    if (!isNamaBhikshaType(selectedProgram.name)) {
      return slotsAfterSatsang;
    }

    const bookedTimes = new Set(namaBhikshaSlotsByDate[dateKey] || []);

    return slotsAfterSatsang.filter((slot) => {
      const label = toSlotLabel(slot);
      return !(bookedTimes.has(label) || bookedTimes.has(slot.start));
    });
  }, [selectedProgram, selectedDate, namaBhikshaSlotsByDate, satsangDates]);

  const handleDatePick = (day: DateData) => {
    if (!selectedProgram) return;
    const date = new Date(day.year, day.month - 1, day.day);
    if (!isDateSelectable(selectedProgram.id, date, blockedDates)) {
      return;
    }
    onSelectedDateChange(date);
  };

  if (!selectedProgram) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.infoText}>Please select a program first.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>{selectedProgram.name}</Text>
        <Text style={styles.subheading}>Choose a date and time slot</Text>

        <Calendar
          minDate={toDateKey(new Date())}
          maxDate={CALENDAR_MAX_DATE}
          markedDates={markedDates}
          onDayPress={handleDatePick}
          theme={{
            selectedDayBackgroundColor: mobileTheme.colors.brand,
            todayTextColor: mobileTheme.colors.brand,
            arrowColor: mobileTheme.colors.brand
          }}
        />

        {selectedDate && (
          <View style={styles.slotSection}>
            <Text style={styles.slotHeading}>Available Slots ({selectedDateKey})</Text>
            {availableSlots.length === 0 ? (
              <Text style={styles.infoText}>No slots available on this date.</Text>
            ) : (
              availableSlots.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                return (
                  <Pressable
                    key={`${slot.start}-${slot.end}-${slot.durationLabel}`}
                    style={[styles.slotButton, isSelected ? styles.slotButtonSelected : null]}
                    onPress={() => onSelectSlot(slot)}
                  >
                    <Text style={[styles.slotText, isSelected ? styles.slotTextSelected : null]}>
                      {toSlotLabel(slot)} ({slot.durationLabel})
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        <Pressable
          style={[styles.continueButton, !(selectedDate && selectedSlot) ? styles.disabled : null]}
          disabled={!(selectedDate && selectedSlot)}
          onPress={onContinue}
        >
          <Text style={styles.continueText}>Continue to Host Details</Text>
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
    paddingBottom: 30
  },
  heading: {
    fontSize: 22,
    color: mobileTheme.colors.textPrimary,
    fontWeight: '700'
  },
  subheading: {
    color: mobileTheme.colors.textMuted,
    marginBottom: 12
  },
  slotSection: {
    marginTop: 16,
    gap: 8
  },
  slotHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: mobileTheme.colors.textPrimary
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
  continueButton: {
    marginTop: 18,
    backgroundColor: mobileTheme.colors.brand,
    borderRadius: mobileTheme.radius.sm,
    paddingVertical: 12,
    alignItems: 'center'
  },
  continueText: {
    color: mobileTheme.colors.surface,
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.5
  },
  infoText: {
    color: mobileTheme.colors.textMuted
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
