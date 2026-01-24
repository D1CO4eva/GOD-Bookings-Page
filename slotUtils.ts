
import { TimeSlot } from '../types';

export const generateSlots = (programId: string, date: Date): TimeSlot[] => {
  const day = date.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
  const isWeekend = day === 0 || day === 6;
  const isFriday = day === 5;
  const slots: TimeSlot[] = [];

  const addSlot = (startH: number, startM: number, endH: number, endM: number, label: string) => {
    const formatTime = (h: number, m: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const hours = h % 12 || 12;
      const mins = m.toString().padStart(2, '0');
      return `${hours}:${mins} ${period}`;
    };

    const period: 'Morning' | 'Evening' = startH < 12 ? 'Morning' : 'Evening';
    slots.push({
      start: formatTime(startH, startM),
      end: formatTime(endH, endM),
      durationLabel: label,
      period
    });
  };

  if (programId === 'radha-kalyanam') {
    if (isWeekend) {
      addSlot(10, 0, 13, 0, '3 Hours');
      addSlot(16, 0, 19, 0, '3 Hours');
    }
  } else if (programId === 'nikunja-utsavam') {
    if (isWeekend) {
      // Morning window: 10:00 - 12:30
      // 1.5h slots
      addSlot(10, 0, 11, 30, '1.5 Hours');
      addSlot(10, 30, 12, 0, '1.5 Hours');
      addSlot(11, 0, 12, 30, '1.5 Hours');
      // 2h slots
      addSlot(10, 0, 12, 0, '2 Hours');
      addSlot(10, 30, 12, 30, '2 Hours');

      // Evening window: 4:00 - 7:00
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
        // Morning 10:00 - 12:30 (1h and 2h)
        addSlot(10, 0, 11, 0, '1 Hour');
        addSlot(10, 30, 11, 30, '1 Hour');
        addSlot(11, 0, 12, 0, '1 Hour');
        addSlot(11, 30, 12, 30, '1 Hour');
        addSlot(10, 0, 12, 0, '2 Hours');
        addSlot(10, 30, 12, 30, '2 Hours');
      }
      // Evening 4:00 - 7:00 (1h and 2h)
      addSlot(16, 0, 17, 0, '1 Hour');
      addSlot(16, 30, 17, 30, '1 Hour');
      addSlot(17, 0, 18, 0, '1 Hour');
      addSlot(17, 30, 18, 30, '1 Hour');
      addSlot(18, 0, 19, 0, '1 Hour');
      addSlot(16, 0, 18, 0, '2 Hours');
      addSlot(16, 30, 18, 30, '2 Hours');
      addSlot(17, 0, 19, 0, '2 Hours');
    }
  } else if (programId === 'nama-bhiksha') {
    // Any day evening: 4:00 - 7:30
    // 0.5h slots
    for (let h = 16; h <= 18; h++) {
      addSlot(h, 0, h, 30, '30 Minutes');
      addSlot(h, 30, h + 1, 0, '30 Minutes');
    }
    addSlot(19, 0, 19, 30, '30 Minutes');
    // 1h slots
    for (let h = 16; h <= 18; h++) {
      addSlot(h, 0, h + 1, 0, '1 Hour');
      addSlot(h, 30, h + 1, 30, '1 Hour');
    }
  }

  return slots;
};

export const isDateSelectable = (programId: string, date: Date, bookedDates: string[] = []): boolean => {
  // Prevent selection of past dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (checkDate < today) {
    return false;
  }

  const dateStr = date.toISOString().split('T')[0];
  if (bookedDates.includes(dateStr)) {
    return false;
  }

  const day = date.getDay();
  if (programId === 'radha-kalyanam' || programId === 'nikunja-utsavam') {
    return day === 0 || day === 6;
  }
  if (programId === 'nama-ruchi') {
    return day === 0 || day === 6 || day === 5;
  }
  return true; // Nama Bhiksha any day
};
