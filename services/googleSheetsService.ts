
import { BookingData } from '../types';

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
    
    // We send as a POST to the Web App URL. 
    // mode: 'no-cors' is common for Apps Script endpoints to bypass cross-origin restrictions on simple POSTs.
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

const extractDatesFromRow = (row: unknown): string[] => {
  const dates: string[] = [];

  if (typeof row === 'string') {
    const normalized = normalizeDateString(row);
    if (normalized) dates.push(normalized);
    return dates;
  }

  if (Array.isArray(row)) {
    for (const cell of row) {
      if (typeof cell === 'string') {
        const normalized = normalizeDateString(cell);
        if (normalized) {
          dates.push(normalized);
          break;
        }
      }
    }
    return dates;
  }

  if (row && typeof row === 'object') {
    const obj = row as Record<string, unknown>;
    const candidateKeys = [
      'Date',
      'date',
      'Date of Program',
      'Date of Program (YYYY-MM-DD)',
      'Program Date'
    ];
    for (const key of candidateKeys) {
      const value = obj[key];
      if (typeof value === 'string') {
        const normalized = normalizeDateString(value);
        if (normalized) {
          dates.push(normalized);
          break;
        }
      }
    }

    if (dates.length === 0) {
      for (const value of Object.values(obj)) {
        if (typeof value === 'string') {
          const normalized = normalizeDateString(value);
          if (normalized) {
            dates.push(normalized);
            break;
          }
        }
      }
    }
  }

  return dates;
};

const extractBookedDates = (data: unknown): string[] => {
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

  const dates: string[] = [];
  const headerRow = Array.isArray(rows[0]) ? rows[0] : null;
  let startIndex = 0;

  if (headerRow) {
    const headerStrings = headerRow.map(cell => String(cell).toLowerCase());
    if (headerStrings.some(cell => cell.includes('date'))) {
      startIndex = 1;
    }
  }

  for (let i = startIndex; i < rows.length; i += 1) {
    dates.push(...extractDatesFromRow(rows[i]));
  }

  return dates;
};

export const fetchBookedDates = async (): Promise<string[]> => {
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

    const dates = extractBookedDates(json);
    const uniqueDates = Array.from(new Set(dates)).filter(Boolean);
    uniqueDates.sort();
    return uniqueDates;
  } catch (error) {
    console.error('Error loading booked dates:', error);
    return [];
  }
};
