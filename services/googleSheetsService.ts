
import { BookingData, BookingRecord, ReservationDetails, ReservationLookupData } from '../types';

const normalizeApiBase = (value: string) => value.replace(/\/+$/, '');
const API_BASE = normalizeApiBase(
  import.meta.env.VITE_API_BASE || 'https://god-auth-service-693007788010.us-central1.run.app'
);
const BOOKINGS_ENDPOINT = `${API_BASE}/api/bookings`;
const RESERVATION_VERIFY_ENDPOINT = `${API_BASE}/api/reservations/verify`;
const RESERVATION_UPDATE_ENDPOINT = `${API_BASE}/api/reservations/update`;
const RESERVATION_DELETE_ENDPOINT = `${API_BASE}/api/reservations/delete`;

export interface BookingSubmitResult {
  success: boolean;
  status: number | null;
  message?: string;
}

export const submitToGoogleSheets = async (data: BookingData): Promise<BookingSubmitResult> => {
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

    const response = await fetch(BOOKINGS_ENDPOINT, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    const hasSuccessFlag = typeof json?.success === 'boolean';
    const isSuccessful = response.ok && hasSuccessFlag && json.success === true;
    const message =
      (typeof json?.message === 'string' && json.message) ||
      (typeof json?.error === 'string' && json.error) ||
      undefined;

    return {
      success: isSuccessful,
      status: response.status,
      message
    };
  } catch (error) {
    console.error('Error submitting booking:', error);
    return {
      success: false,
      status: null,
      message: 'Network error while submitting booking.'
    };
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

const normalizeTimeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeEmailString = (value: unknown): string => {
  if (typeof value !== 'string') return 'N/A';
  const normalized = value.trim();
  if (!normalized) return 'N/A';
  return normalized;
};

const normalizeConfirmationString = (value: unknown): string => {
  if (typeof value !== 'string') return 'N/A';
  const normalized = value.trim();
  if (!normalized) return 'N/A';
  return normalized;
};

const extractBookingsFromRow = (
  row: unknown,
  dateCol: number,
  programCol: number,
  timeCol: number,
  emailCol: number,
  confirmationCol: number,
  occasionCol: number
): BookingRecord[] => {
  if (Array.isArray(row)) {
    const rawDate = row[dateCol];
    const rawType = programCol >= 0 ? row[programCol] : '';
    const rawTime = timeCol >= 0 ? row[timeCol] : '';
    const rawEmail = emailCol >= 0 ? row[emailCol] : '';
    const rawConfirmation = confirmationCol >= 0 ? row[confirmationCol] : '';
    const rawOccasion = occasionCol >= 0 ? row[occasionCol] : '';
    const date =
      typeof rawDate === 'string'
        ? normalizeDateString(rawDate)
        : normalizeDateString(String(rawDate));
    if (!date) return [];
    return [
      {
        date,
        type: typeof rawType === 'string' ? rawType : String(rawType || ''),
        time: normalizeTimeString(rawTime),
        email: normalizeEmailString(rawEmail),
        confirmationNumber: normalizeConfirmationString(rawConfirmation),
        occasion: typeof rawOccasion === 'string' ? rawOccasion.trim() : String(rawOccasion || '').trim()
      }
    ];
  }

  if (row && typeof row === 'object') {
    const obj = row as Record<string, unknown>;
    const rawDate =
      obj.date ||
      obj.Date ||
      obj.programDate ||
      obj.program_date ||
      obj['Program Date'] ||
      obj['Date of Program'] ||
      obj['Date of Program (YYYY-MM-DD)'];
    const rawType =
      obj.type ||
      obj.Type ||
      obj.programType ||
      obj.program_type ||
      obj['Type of Program'] ||
      obj['Program Type'] ||
      obj.program ||
      obj.Program;
    const rawTime =
      obj.time ||
      obj.Time ||
      obj.programTime ||
      obj.program_time ||
      obj['Time Slot'] ||
      obj['Time'];
    const rawEmail =
      obj.hostEmail ||
      obj.host_email ||
      obj.email ||
      obj.Email ||
      obj['Host email'] ||
      obj['Host Email'] ||
      obj['Email Address'];
    const rawConfirmation =
      obj.confirmationNumber ||
      obj.confirmation_number ||
      obj.confirmation ||
      obj.Confirmation ||
      obj['Confirmation Number'] ||
      obj['confirmation number'];
    const rawOccasion =
      obj.occasion ||
      obj.Occasion ||
      obj['Occasion'] ||
      obj['Occasion / Reason'];
    const date =
      typeof rawDate === 'string'
        ? normalizeDateString(rawDate)
        : normalizeDateString(String(rawDate || ''));
    if (!date) return [];
    return [
      {
        date,
        type: typeof rawType === 'string' ? rawType : String(rawType || ''),
        time: normalizeTimeString(rawTime),
        email: normalizeEmailString(rawEmail),
        confirmationNumber: normalizeConfirmationString(rawConfirmation),
        occasion: typeof rawOccasion === 'string' ? rawOccasion.trim() : String(rawOccasion || '').trim()
      }
    ];
  }

  if (typeof row === 'string') {
    const date = normalizeDateString(row);
    return date ? [{ date, type: '', time: '', email: 'N/A', confirmationNumber: 'N/A', occasion: '' }] : [];
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
  let emailCol = -1;
  let confirmationCol = -1;
  let occasionCol = -1;

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
    emailCol = headerStrings.findIndex(cell => cell.includes('host email') || cell === 'email' || cell.includes('email'));
    confirmationCol = headerStrings.findIndex(
      cell => cell.includes('confirmation number') || cell.includes('confirmation')
    );
    occasionCol = headerStrings.findIndex(cell => cell.includes('occasion'));
  }

  const bookings: BookingRecord[] = [];

  for (let i = startIndex; i < rows.length; i += 1) {
    bookings.push(
      ...extractBookingsFromRow(rows[i], dateCol, programCol, timeCol, emailCol, confirmationCol, occasionCol)
    );
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
        bookings.map(item => [
          `${item.date}|${item.type}|${item.time || ''}|${item.email || 'N/A'}|${item.confirmationNumber || 'N/A'}`,
          item
        ])
      ).values()
    );
    unique.sort((a, b) => a.date.localeCompare(b.date));
    return unique;
  } catch (error) {
    console.error('Error loading booked dates:', error);
    return [];
  }
};

const parseJsonResponse = async (response: Response): Promise<any> => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const pickFirstString = (...values: unknown[]): string => {
  for (const value of values) {
    const normalized = toTrimmedString(value);
    if (normalized) return normalized;
  }
  return '';
};

const buildVerifyReservationEndpoint = (lookup: ReservationLookupData): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(lookup)) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    params.set(key, trimmed);
  }

  const query = params.toString();
  return query ? `${RESERVATION_VERIFY_ENDPOINT}?${query}` : RESERVATION_VERIFY_ENDPOINT;
};

const coerceReservationDetails = (
  source: unknown,
  fallbackConfirmation: string
): ReservationDetails | null => {
  if (!source || typeof source !== 'object') return null;

  const obj = source as Record<string, unknown>;
  const rawDate = pickFirstString(
    obj.date,
    obj.Date,
    obj.programDate,
    obj.program_date,
    obj['Program Date'],
    obj['Date of Program']
  );
  const normalizedDate = normalizeDateString(rawDate);
  const programType = pickFirstString(
    obj.programType,
    obj.program_type,
    obj.type,
    obj.Type,
    obj['Type of Program'],
    obj['Program Type']
  );
  const time = pickFirstString(
    obj.time,
    obj.Time,
    obj.programTime,
    obj.program_time,
    obj['Time Slot']
  );
  const email = pickFirstString(
    obj.email,
    obj.Email,
    obj.hostEmail,
    obj.host_email,
    obj['Host email'],
    obj['Host Email'],
    obj['Email Address']
  );
  const confirmationNumber = pickFirstString(
    obj.confirmationNumber,
    obj.confirmation_number,
    obj.confirmation,
    obj.Confirmation,
    obj['Confirmation Number'],
    obj['confirmation number'],
    fallbackConfirmation
  );
  const occasion = pickFirstString(obj.occasion, obj.Occasion, obj['Occasion']);

  if (!normalizedDate || !programType || !email) {
    return null;
  }

  return {
    programType,
    date: normalizedDate,
    time,
    email,
    confirmationNumber,
    occasion
  };
};

const fallbackReservationFromBookings = async (
  confirmationNumber: string
): Promise<ReservationDetails | null> => {
  const normalizedConfirmation = confirmationNumber.trim().toLowerCase();
  if (!normalizedConfirmation) return null;

  const bookings = await fetchBookings();
  const match = bookings.find(
    (booking) => (booking.confirmationNumber || '').trim().toLowerCase() === normalizedConfirmation
  );
  if (!match) return null;

  if (!match.date || !match.type || !match.email) return null;
  return {
    programType: match.type,
    date: match.date,
    time: match.time || '',
    email: match.email,
    confirmationNumber: match.confirmationNumber || confirmationNumber,
    occasion: match.occasion || ''
  };
};

export const verifyReservation = async (
  lookup: ReservationLookupData
): Promise<{ found: boolean; reservation?: ReservationDetails; message?: string }> => {
  try {
    const verifyEndpoint = buildVerifyReservationEndpoint(lookup);
    const response = await fetch(verifyEndpoint, {
      method: 'GET',
      cache: 'no-cache'
    });

    const json = await parseJsonResponse(response);
    if (!response.ok) {
      return {
        found: false,
        message: json?.message || json?.error || 'Sorry! Could not find your Reservation! Please try again.'
      };
    }

    const reservationPayload =
      json?.reservation ||
      json?.data?.reservation ||
      json?.booking ||
      json?.data?.booking ||
      json?.result ||
      json?.data;
    const message = pickFirstString(json?.message, json?.error);
    const messageLower = message.toLowerCase();
    const messageImpliesFound =
      (messageLower.includes('booking exists') || messageLower.includes('reservation exists')) &&
      !messageLower.includes('not');
    const explicitFound = [
      json?.found,
      json?.exists,
      json?.reservationFound,
      json?.data?.found,
      json?.data?.exists,
      json?.success
    ].some((value) => value === true);
    let reservation =
      coerceReservationDetails(reservationPayload, lookup.confirmationNumber) ||
      coerceReservationDetails(json, lookup.confirmationNumber);

    if (!reservation && (explicitFound || messageImpliesFound)) {
      reservation = await fallbackReservationFromBookings(lookup.confirmationNumber);
    }

    return {
      found: explicitFound || Boolean(reservation) || messageImpliesFound,
      reservation: reservation || undefined,
      message: message || undefined
    };
  } catch (error) {
    console.error('Error verifying reservation:', error);
    return {
      found: false,
      message: 'Sorry! Could not find your Reservation! Please try again.'
    };
  }
};

export const updateReservation = async (payload: {
  lookup: ReservationLookupData;
  updates: {
    newDate: string;
    newTime?: string;
  };
}): Promise<{ success: boolean; message?: string }> => {
  try {
    const compatibilityPayload = {
      ...payload,
      confirmationNumber: payload.lookup.confirmationNumber,
      programType: payload.lookup.programType,
      date: payload.lookup.date,
      time: payload.lookup.time,
      email: payload.lookup.email,
      newDate: payload.updates.newDate,
      newTime: payload.updates.newTime,
      confirmation_number: payload.lookup.confirmationNumber,
      program_type: payload.lookup.programType,
      new_date: payload.updates.newDate,
      new_time: payload.updates.newTime
    };

    const response = await fetch(RESERVATION_UPDATE_ENDPOINT, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(compatibilityPayload)
    });

    const json = await parseJsonResponse(response);
    const successFlag =
      json?.success === true ||
      json?.updated === true ||
      json?.ok === true ||
      json?.data?.success === true;

    if (!response.ok) {
      return {
        success: false,
        message: json?.message || json?.error || 'Failed to update reservation.'
      };
    }

    if (json && typeof json === 'object' && !successFlag && (json?.message || json?.error)) {
      return {
        success: false,
        message: json?.message || json?.error || 'Failed to update reservation.'
      };
    }

    return { success: true, message: json?.message };
  } catch (error) {
    console.error('Error updating reservation:', error);
    return { success: false, message: 'Failed to update reservation.' };
  }
};

export const cancelReservation = async (
  lookup: ReservationLookupData
): Promise<{ success: boolean; message?: string }> => {
  try {
    const compatibilityPayload = {
      ...lookup,
      lookup,
      confirmation_number: lookup.confirmationNumber,
      program_type: lookup.programType
    };

    const response = await fetch(RESERVATION_DELETE_ENDPOINT, {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(compatibilityPayload)
    });

    const json = await parseJsonResponse(response);
    const successFlag =
      json?.success === true ||
      json?.deleted === true ||
      json?.ok === true ||
      json?.data?.success === true;

    if (!response.ok) {
      return {
        success: false,
        message: json?.message || json?.error || 'Failed to cancel reservation.'
      };
    }

    if (json && typeof json === 'object' && !successFlag && (json?.message || json?.error)) {
      return {
        success: false,
        message: json?.message || json?.error || 'Failed to cancel reservation.'
      };
    }

    return { success: true, message: json?.message };
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return { success: false, message: 'Failed to cancel reservation.' };
  }
};
