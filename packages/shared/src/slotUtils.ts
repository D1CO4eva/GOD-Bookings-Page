import { TimeSlot } from './types';
import { toDateKey } from './dateUtils';

const EVENING_SLOT_START_HOUR = 16;
const EVENING_SLOT_START_MINUTES = EVENING_SLOT_START_HOUR * 60;

export const toSlotLabel = (slot: TimeSlot): string => `${slot.start} - ${slot.end}`;

const parseTimeToMinutes = (value: string): number | null => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  const rawHours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (rawHours < 1 || rawHours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  let hours = rawHours % 12;
  if (period === 'PM') {
    hours += 12;
  }

  return hours * 60 + minutes;
};

export const isSatsangBlockedSlot = (slot: TimeSlot): boolean => {
  const startMinutes = parseTimeToMinutes(slot.start);
  if (startMinutes === null) {
    return slot.period === 'Evening';
  }
  return startMinutes >= EVENING_SLOT_START_MINUTES;
};

export const generateSlots = (programId: string, date: Date): TimeSlot[] => {
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  const isSunday = day === 0;
  const isFriday = day === 5;
  const slots: TimeSlot[] = [];

  const addSlot = (startH: number, startM: number, endH: number, endM: number, label: string) => {
    const formatTime = (h: number, m: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hours = h % 12 || 12;
      const mins = m.toString().padStart(2, '0');
      return `${hours}:${mins} ${period}`;
    };

    const period: 'Morning' | 'Evening' = startH >= EVENING_SLOT_START_HOUR ? 'Evening' : 'Morning';
    slots.push({
      start: formatTime(startH, startM),
      end: formatTime(endH, endM),
      durationLabel: label,
      period
    });
  };

  if (programId === 'radha-kalyanam') {
    if (isSunday) {
      addSlot(10, 0, 13, 0, '3 Hours');
      addSlot(16, 0, 19, 0, '3 Hours');
    }
  } else if (programId === 'thirumanjanam') {
    if (isWeekend) {
      addSlot(10, 0, 12, 0, '2 Hours');
      addSlot(10, 15, 12, 15, '2 Hours');
      addSlot(10, 30, 12, 30, '2 Hours');
    }
  } else if (programId === 'nikunja-utsavam') {
    if (isWeekend) {
      addSlot(10, 0, 11, 30, '1.5 Hours');
      addSlot(10, 30, 12, 0, '1.5 Hours');
      addSlot(11, 0, 12, 30, '1.5 Hours');
      addSlot(10, 0, 12, 0, '2 Hours');
      addSlot(10, 30, 12, 30, '2 Hours');

      addSlot(16, 0, 17, 30, '1.5 Hours');
      addSlot(16, 30, 18, 0, '1.5 Hours');
      addSlot(17, 0, 18, 30, '1.5 Hours');
      addSlot(17, 30, 19, 0, '1.5 Hours');
      addSlot(16, 0, 18, 0, '2 Hours');
      addSlot(16, 30, 18, 30, '2 Hours');
      addSlot(17, 0, 19, 0, '2 Hours');
    }
  } else if (programId === 'nama-ruchi') {
    const valid = isWeekend || isFriday;
    if (valid) {
      if (isWeekend) {
        addSlot(10, 0, 11, 0, '1 Hour');
        addSlot(10, 30, 11, 30, '1 Hour');
        addSlot(11, 0, 12, 0, '1 Hour');
        addSlot(11, 30, 12, 30, '1 Hour');
        addSlot(10, 0, 11, 30, '1.5 Hours');
        addSlot(10, 30, 12, 0, '1.5 Hours');
        addSlot(11, 0, 12, 30, '1.5 Hours');
        addSlot(10, 0, 12, 0, '2 Hours');
        addSlot(10, 30, 12, 30, '2 Hours');
      }
      addSlot(16, 0, 17, 0, '1 Hour');
      addSlot(16, 30, 17, 30, '1 Hour');
      addSlot(17, 0, 18, 0, '1 Hour');
      addSlot(17, 30, 18, 30, '1 Hour');
      addSlot(18, 0, 19, 0, '1 Hour');
      addSlot(16, 0, 17, 30, '1.5 Hours');
      addSlot(16, 30, 18, 0, '1.5 Hours');
      addSlot(17, 0, 18, 30, '1.5 Hours');
      addSlot(17, 30, 19, 0, '1.5 Hours');
      addSlot(16, 0, 18, 0, '2 Hours');
      addSlot(16, 30, 18, 30, '2 Hours');
      addSlot(17, 0, 19, 0, '2 Hours');
    }
  } else if (programId === 'nama-bhiksha') {
    if (isWeekend) {
      addSlot(10, 0, 10, 30, '30 Minutes');
      addSlot(10, 30, 11, 0, '30 Minutes');
      addSlot(11, 0, 11, 30, '30 Minutes');
      addSlot(11, 30, 12, 0, '30 Minutes');
      addSlot(12, 0, 12, 30, '30 Minutes');
      addSlot(10, 0, 11, 0, '1 Hour');
      addSlot(10, 30, 11, 30, '1 Hour');
      addSlot(11, 0, 12, 0, '1 Hour');
      addSlot(11, 30, 12, 30, '1 Hour');
    }

    for (let h = 16; h <= 18; h += 1) {
      addSlot(h, 0, h, 30, '30 Minutes');
      addSlot(h, 30, h + 1, 0, '30 Minutes');
    }
    addSlot(19, 0, 19, 30, '30 Minutes');

    for (let h = 16; h <= 18; h += 1) {
      addSlot(h, 0, h + 1, 0, '1 Hour');
      addSlot(h, 30, h + 1, 30, '1 Hour');
    }
  }

  return slots;
};

export const isDateSelectable = (programId: string, date: Date, bookedDates: string[] = []): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (checkDate < today) {
    return false;
  }

  const dateStr = toDateKey(date);
  if (bookedDates.includes(dateStr)) {
    return false;
  }

  const day = date.getDay();
  if (programId === 'radha-kalyanam') {
    return day === 0;
  }
  if (programId === 'nikunja-utsavam' || programId === 'thirumanjanam') {
    return day === 0 || day === 6;
  }
  if (programId === 'nama-ruchi') {
    return day === 0 || day === 6 || day === 5;
  }

  return true;
};
