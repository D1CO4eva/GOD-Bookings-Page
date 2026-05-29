import { isDateSelectable, toDateKey } from '../../../../packages/shared/src';

export const CALENDAR_MAX_DATE = '2027-12-31';

export const buildCalendarMarkedDates = ({
  programId,
  blockedDates,
  selectedDateKey,
  today = new Date()
}: {
  programId: string;
  blockedDates: string[];
  selectedDateKey?: string;
  today?: Date;
}): Record<string, any> => {
  const marks: Record<string, any> = {};
  const endDate = new Date(2027, 11, 31);

  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    const key = toDateKey(cursor);
    const isAllowedByProgramRules = isDateSelectable(programId, cursor, []);

    if (!isAllowedByProgramRules) {
      marks[key] = {
        ...(marks[key] || {}),
        disabled: true,
        disableTouchEvent: true
      };
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  for (const blockedDate of blockedDates) {
    marks[blockedDate] = {
      ...(marks[blockedDate] || {}),
      disabled: true,
      disableTouchEvent: true,
      marked: true,
      dotColor: '#d92d20'
    };
  }

  if (selectedDateKey) {
    marks[selectedDateKey] = {
      ...(marks[selectedDateKey] || {}),
      selected: true,
      selectedColor: '#2e3192'
    };
  }

  return marks;
};
