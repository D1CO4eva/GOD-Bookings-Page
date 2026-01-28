
import { BookingData, BookingRecord } from '../types';

const API_BASE = '';
const BOOKINGS_ENDPOINT = `${API_BASE}/api/bookings`;

export const submitToGoogleSheets = async (data: BookingData): Promise<boolean> => {
  try {
    const payload: Record<string, string> = {
      'Date': data.date,
      'Time': data.time,
      'Type of Program': data.typeOfProgram,
      'Host Name': data.name,
      'Host Address': data.fullAddress,
      'Host Phone Number': data.phoneNumber,
      'Host email': data.email,
      'Occasion': data.occasion,
      'Additional Notes': data.additionalNotes
    };

    await fetch(BOOKINGS_ENDPOINT, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return true;
  } catch (error) {
    console.error('Error submitting booking:', error);
    return false;
  }
};

const normalizeDateString = (value: string): string | null => {
  const isoMatch = value.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) {
    return isoMatch[0];
  }

  const usMatch = value.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
  if (usMatch) {
    const [monthStr, dayStr, yearStr] = usMatch[0].split('/');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
  }

  return null;
};

const normalizeProgramName = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const normalizeTimeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const extractBookingsFromRow = (
  row: unknown,
  dateCol: number,
  programCol: number,
  timeCol: number
): BookingRecord[] => {
  if (Array.isArray(row)) {
    const rawDate = row[dateCol];
    const rawType = programCol >= 0 ? row[programCol] : '';
    const rawTime = timeCol >= 0 ? row[timeCol] : '';
    const date =
      typeof rawDate === 'string'
        ? normalizeDateString(rawDate)
        : normalizeDateString(String(rawDate));
    if (!date) return [];
    return [
      {
        date,
        type: typeof rawType === 'string' ? rawType : String(rawType || ''),
        time: normalizeTimeString(rawTime)
      }
    ];
  }

  if (row && typeof row === 'object') {
    const obj = row as Record<string, unknown>;
    const rawDate =
      obj.date ||
      obj.Date ||
      obj['Program Date'] ||
      obj['Date of Program'] ||
      obj['Date of Program (YYYY-MM-DD)'];
    const rawType = obj.type || obj.Type || obj['Type of Program'] || obj.program || obj.Program;
    const rawTime = obj.time || obj.Time || obj['Time Slot'] || obj['Time'];
    const date =
      typeof rawDate === 'string'
        ? normalizeDateString(rawDate)
        : normalizeDateString(String(rawDate || ''));
    if (!date) return [];
    return [
      {
        date,
        type: typeof rawType === 'string' ? rawType : String(rawType || ''),
        time: normalizeTimeString(rawTime)
      }
    ];
  }

  if (typeof row === 'string') {
    const date = normalizeDateString(row);
    return date ? [{ date, type: '', time: '' }] : [];
  }

  return [];
};

const extractBookings = (data: unknown): BookingRecord[] => {
  if (!data) return [];

  const rows: unknown[] = [];

  if (Array.isArray(data)) {
    rows.push(...data);
  } else if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const container =
      (Array.isArray(obj.data) && obj.data) ||
      (Array.isArray(obj.bookings) && obj.bookings) ||
      (Array.isArray(obj.rows) && obj.rows);
    if (container) {
      rows.push(...container);
    }
  }

  if (!rows.length) return [];

  const headerRow = Array.isArray(rows[0]) ? rows[0] : null;
  let startIndex = 0;
  let dateCol = -1;
  let programCol = -1;
  let timeCol = -1;

  if (headerRow) {
    const headerStrings = headerRow.map(cell => String(cell).toLowerCase());
    if (headerStrings.some(cell => cell.includes('date'))) {
      startIndex = 1;
    }
    dateCol = headerStrings.findIndex(cell => cell.includes('date'));
    programCol = headerStrings.findIndex(cell =>
      cell.includes('type of program') ||
      cell.includes('program type') ||
      cell.includes('program')
    );
    timeCol = headerStrings.findIndex(cell => cell.includes('time'));
  }

  const bookings: BookingRecord[] = [];

  for (let i = startIndex; i < rows.length; i += 1) {
    bookings.push(...extractBookingsFromRow(rows[i], dateCol, programCol, timeCol));
  }

  return bookings;
};

export const fetchBookings = async (): Promise<BookingRecord[]> => {
  try {
    const response = await fetch(BOOKINGS_ENDPOINT, {
      method: 'GET',
      cache: 'no-cache'
    });

    const text = await response.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }

    const bookings = extractBookings(json);
    const unique = Array.from(
      new Map(
        bookings.map(item => [`${item.date}|${item.type}|${item.time || ''}`, item])
      ).values()
    );
    unique.sort((a, b) => a.date.localeCompare(b.date));
    return unique;
  } catch (error) {
    console.error('Error loading booked dates:', error);
    return [];
  }
};
