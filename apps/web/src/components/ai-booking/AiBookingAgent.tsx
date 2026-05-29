import React, { useEffect, useMemo, useRef, useState } from 'react';
import CalendarView from '../CalendarView';
import { DevotionalProgram, BookingData, BookingRecord, ReservationDetails, ReservationLookupData, TimeSlot } from '../../types';
import { parseDateKey, toDateKey } from '../../utils/dateUtils';
import { generateSlots, isDateSelectable, isSatsangBlockedSlot } from '../../utils/slotUtils';
import { resolvePublicAssetUrl } from '../../utils/assetUtils';
import {
  isNamaBhikshaType,
  isSatsangType,
  normalizeConfirmationForMatch,
  normalizeEmailForMatch,
  normalizeProgramType,
  resolveProgramByType
} from '../../utils/programUtils';
import {
  AiBookingDraft,
  requestAiBookingExtraction
} from '../../services/openRouterService';
import type { ReservationLookupResult, UpdateReservationPayload } from '@shared/apiClient';

interface AiBookingAgentProps {
  programs: DevotionalProgram[];
  bookings: BookingRecord[];
  isSubmitting: boolean;
  getAvailableSlots: (program: DevotionalProgram, date: Date) => TimeSlot[];
  verifyReservation: (lookup: ReservationLookupData) => Promise<ReservationLookupResult>;
  updateReservation: (payload: UpdateReservationPayload) => Promise<{ success: boolean; message?: string }>;
  cancelReservation: (lookup: ReservationLookupData) => Promise<{ success: boolean; message?: string }>;
  onSubmitBooking: (
    data: BookingData,
    program: DevotionalProgram,
    date: Date,
    slot: TimeSlot
  ) => Promise<void>;
  onReservationChanged: () => Promise<void>;
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AddressSuggestion {
  display: string;
  placeId: string;
  source?: 'google' | 'nominatim';
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

type FlowStep =
  | 'program-date'
  | 'slot'
  | 'contact'
  | 'address'
  | 'occasion'
  | 'review';

type EditSection =
  | 'date'
  | 'time'
  | 'host'
  | 'contact'
  | 'address'
  | 'occasion'
  | 'notes'
  | null;

type ReservationAction = 'edit' | 'cancel';

const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const ALLOWED_STATES = new Set(['GA', 'AL', 'TN', 'NC', 'SC', 'FL']);
const GOOGLE_PLACES_SCRIPT_ID = 'google-places-api-script';

let googlePlacesScriptPromise: Promise<void> | null = null;
let googlePlacesUnavailable = false;

const initialAssistantMessage =
  'Radhe Radhe! My name is Uddhav. I am pleased to be able to assist you today in booking a home program with Atlanta Namadwaar! Shall we get started?';

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const slotLabel = (slot: TimeSlot) => `${slot.start} - ${slot.end}`;
const getTodayIso = () => toDateKey(new Date());
const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
];
const formatDateNumeric = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });

const formatDateLong = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

const waitForGooglePlacesApi = async (): Promise<void> => {
  const win = window as any;
  if (win.google?.maps?.places) return;

  if (win.google?.maps?.importLibrary) {
    await win.google.maps.importLibrary('places');
    if (win.google?.maps?.places) return;
  }

  await new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (win.google?.maps?.places) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > 5000) {
        reject(new Error('Google Places API is not available.'));
        return;
      }
      window.setTimeout(check, 100);
    };
    check();
  });
};

const loadGooglePlacesScript = (apiKey: string): Promise<void> => {
  const win = window as any;
  if (win.google?.maps?.places) return Promise.resolve();
  if (win.google?.maps) return waitForGooglePlacesApi();
  if (!apiKey) return Promise.reject(new Error('Missing VITE_GOOGLE_MAPS_API_KEY'));
  if (googlePlacesScriptPromise) return googlePlacesScriptPromise;

  googlePlacesScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_PLACES_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      void waitForGooglePlacesApi().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_PLACES_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Places script'));
    document.head.appendChild(script);
  })
    .then(waitForGooglePlacesApi)
    .catch((error) => {
      googlePlacesScriptPromise = null;
      throw error;
    });

  return googlePlacesScriptPromise;
};

const getAddressComponent = (components: any[], type: string, useShortName = false): string => {
  const match = components.find(
    (component: any) => Array.isArray(component.types) && component.types.includes(type)
  );
  if (!match) return '';
  return useShortName ? match.short_name || '' : match.long_name || '';
};

const getCityFromComponents = (components: any[]): string => {
  return (
    getAddressComponent(components, 'locality') ||
    getAddressComponent(components, 'postal_town') ||
    getAddressComponent(components, 'administrative_area_level_3') ||
    getAddressComponent(components, 'sublocality')
  );
};

const STATE_NAME_TO_CODE: Record<string, string> = {
  georgia: 'GA',
  alabama: 'AL',
  tennessee: 'TN',
  'north carolina': 'NC',
  'south carolina': 'SC',
  florida: 'FL'
};

const normalizeFallbackAddress = (item: any): AddressSuggestion | null => {
  const address = item?.address || {};
  const stateName = typeof address.state === 'string' ? address.state.toLowerCase() : '';
  const state = STATE_NAME_TO_CODE[stateName] || '';
  if (!state || !ALLOWED_STATES.has(state)) return null;

  const street = [address.house_number, address.road].filter(Boolean).join(' ').trim();
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.suburb ||
    address.neighbourhood ||
    '';
  const zipCode = address.postcode || '';
  const display = typeof item?.display_name === 'string' ? item.display_name : '';

  if (!display || !street || !zipCode) return null;

  return {
    display,
    placeId: `nominatim:${item.place_id}`,
    source: 'nominatim',
    street,
    city,
    state,
    zipCode
  };
};

const searchFallbackAddresses = async (query: string): Promise<AddressSuggestion[]> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=us&limit=6&q=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) return [];
  const data = await response.json().catch(() => []);
  if (!Array.isArray(data)) return [];

  const suggestions = data
    .map(normalizeFallbackAddress)
    .filter((item): item is AddressSuggestion => Boolean(item));

  return Array.from(
    new Map(suggestions.map((item) => [`${item.street}|${item.city}|${item.state}|${item.zipCode}`, item])).values()
  );
};

const mergeDraft = (current: AiBookingDraft, incoming: AiBookingDraft): AiBookingDraft => {
  const next = { ...current };
  for (const [key, value] of Object.entries(incoming) as Array<[keyof AiBookingDraft, unknown]>) {
    if (typeof value === 'string' && value.trim()) {
      (next[key] as string | undefined) = value.trim();
    }
  }
  if (incoming.preferredPeriod) {
    next.preferredPeriod = incoming.preferredPeriod;
  }
  return next;
};

const mergeModelAndLocalDraft = (localDraft: AiBookingDraft, modelDraft: AiBookingDraft): AiBookingDraft => {
  const next = mergeDraft(localDraft, modelDraft);
  const locallyTrustedFields: Array<keyof AiBookingDraft> = [
    'programId',
    'date',
    'slotLabel',
    'email',
    'phoneNumber',
    'state',
    'zipCode'
  ];

  for (const field of locallyTrustedFields) {
    const value = localDraft[field];
    if (typeof value === 'string' && value.trim()) {
      (next[field] as string | undefined) = value.trim();
    }
  }
  if (localDraft.preferredPeriod) {
    next.preferredPeriod = localDraft.preferredPeriod;
  }
  return next;
};

const hasDraftSignal = (draft: AiBookingDraft) =>
  Boolean(
    draft.programId ||
      draft.date ||
      draft.slotLabel ||
      draft.preferredPeriod ||
      draft.name ||
      draft.email ||
      draft.phoneNumber ||
      draft.street ||
      draft.city ||
      draft.zipCode ||
      draft.occasion ||
      draft.additionalNotes
  );

const buildValidDateKey = (year: number, month: number, day: number): string | undefined => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }
  return toDateKey(parsed);
};

const resolveMonthDate = (monthIndex: number, day: number, explicitYear?: number): string | undefined => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = explicitYear || today.getFullYear();
  const dateKey = buildValidDateKey(year, monthIndex + 1, day);
  if (!dateKey || explicitYear) return dateKey;

  const parsed = parseDateKey(dateKey);
  if (parsed && parsed < today) {
    return buildValidDateKey(year + 1, monthIndex + 1, day);
  }
  return dateKey;
};

const wantsEarliestBookableDate = (text: string) => {
  const normalized = normalizeText(text);
  return /\b(asap|soonest|earliest|first available|next available|whenever available)\b/.test(normalized);
};

const parseLocalDate = (text: string): string | undefined => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const normalized = normalizeText(text);

  const mentionsSpecificWeekday = WEEKDAY_NAMES.some((weekday) => normalized.includes(weekday));
  if (/\b(?:this|next|coming)?\s*weekend\b/.test(normalized) && !mentionsSpecificWeekday) {
    return undefined;
  }

  if (/\b(today|tonight)\b/.test(normalized)) {
    return toDateKey(today);
  }

  if (normalized.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return toDateKey(tomorrow);
  }

  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const dateKey = buildValidDateKey(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    if (dateKey) return dateKey;
  }

  const usMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (usMatch) {
    const dateKey = buildValidDateKey(Number(usMatch[3]), Number(usMatch[1]), Number(usMatch[2]));
    if (dateKey) return dateKey;
  }

  const monthPattern = MONTH_NAMES.join('|');
  const monthFirstMatch = normalized.match(new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`));
  if (monthFirstMatch) {
    const monthIndex = MONTH_NAMES.indexOf(monthFirstMatch[1]);
    const dateKey = resolveMonthDate(monthIndex, Number(monthFirstMatch[2]), monthFirstMatch[3] ? Number(monthFirstMatch[3]) : undefined);
    if (dateKey) return dateKey;
  }

  const dayFirstMatch = normalized.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})(?:\\s+(20\\d{2}))?\\b`));
  if (dayFirstMatch) {
    const monthIndex = MONTH_NAMES.indexOf(dayFirstMatch[2]);
    const dateKey = resolveMonthDate(monthIndex, Number(dayFirstMatch[1]), dayFirstMatch[3] ? Number(dayFirstMatch[3]) : undefined);
    if (dateKey) return dateKey;
  }

  const afterNextMatch =
    normalized.match(new RegExp(`\\b(${WEEKDAY_NAMES.join('|')})\\s+after\\s+next\\b`)) ||
    normalized.match(new RegExp(`\\bafter\\s+next\\s+(${WEEKDAY_NAMES.join('|')})\\b`));
  if (afterNextMatch) {
    const requestedDay = WEEKDAY_NAMES.indexOf(afterNextMatch[1]);
    const next = new Date(today);
    const daysAhead = (requestedDay - today.getDay() + 7) % 7 || 7;
    next.setDate(today.getDate() + daysAhead + 7);
    return toDateKey(next);
  }

  const weekdayMatch = normalized.match(new RegExp(`\\b(?:(this|next|coming)\\s+)?(${WEEKDAY_NAMES.join('|')})\\b`));
  if (weekdayMatch) {
    const modifier = weekdayMatch[1];
    const requestedDay = WEEKDAY_NAMES.indexOf(weekdayMatch[2]);
    const next = new Date(today);
    let daysAhead = (requestedDay - today.getDay() + 7) % 7;
    if (!modifier || modifier === 'next' || daysAhead === 0) {
      daysAhead = daysAhead || 7;
    }
    next.setDate(today.getDate() + daysAhead);
    return toDateKey(next);
  }

  return undefined;
};

const inferProgramId = (text: string, programs: DevotionalProgram[]) => {
  const normalized = normalizeText(text);
  const aliases: Record<string, string[]> = {
    'radha-kalyanam': ['radha kalyanam', 'kalyanam', 'wedding'],
    'nikunja-utsavam': ['nikunja', 'nikunjam', 'utsavam'],
    thirumanjanam: ['thirumanjanam', 'abhishek', 'abhishekam'],
    'nama-ruchi': ['nama ruchi', 'kirtan', 'mahamantra kirtan'],
    'nama-bhiksha': ['nama bhiksha', 'bhiksha', 'chant', 'chanting']
  };

  for (const program of programs) {
    const candidates = [program.name, ...(aliases[program.id] || [])];
    if (candidates.some((candidate) => normalized.includes(normalizeText(candidate)))) {
      return program.id;
    }
  }
  return undefined;
};

const extractPhoneNumber = (text: string): string | undefined => {
  const labeledPhoneMatch = text.match(
    /\b(?:phone|cell|mobile|call|number|tel)[:\s]*(?:\+?1[\s.-]*)?(\(?[2-9]\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{4})\b/i
  );
  const formattedPhoneMatch =
    labeledPhoneMatch ||
    text.match(/\b(?:\+?1[\s.-]*)?(\(?[2-9]\d{2}\)?[\s.-]+\d{3}[\s.-]+\d{4})\b/);
  const compactPhoneMatch = formattedPhoneMatch || text.match(/\b(?:\+?1)?([2-9]\d{9})\b/);
  const digits = compactPhoneMatch?.[1]?.replace(/\D/g, '');
  return digits && digits.length >= 10 ? digits.slice(-10) : undefined;
};

const formatTimeDraft = (hour: number, minutes: number, period: 'AM' | 'PM') => {
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

const extractTimeDraft = (text: string): Pick<AiBookingDraft, 'slotLabel' | 'preferredPeriod'> => {
  const normalized = normalizeText(text);
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2] || '0');
    const period = timeMatch[3].toUpperCase() as 'AM' | 'PM';
    if (hour >= 1 && hour <= 12 && minutes >= 0 && minutes <= 59) {
      return {
        slotLabel: formatTimeDraft(hour, minutes, period),
        preferredPeriod: period === 'AM' ? 'Morning' : 'Evening'
      };
    }
  }

  const time24Match = text.match(/\b(?:at|@)?\s*([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (time24Match) {
    const rawHour = Number(time24Match[1]);
    const minutes = Number(time24Match[2]);
    const period: 'AM' | 'PM' = rawHour >= 12 ? 'PM' : 'AM';
    return {
      slotLabel: formatTimeDraft(rawHour, minutes, period),
      preferredPeriod: rawHour >= 16 ? 'Evening' : 'Morning'
    };
  }

  const bareHourMatch = text.match(/\b(?:at|around|by)\s+(\d{1,2})(?:\s*o'?clock)?\b/i);
  if (bareHourMatch) {
    const hour = Number(bareHourMatch[1]);
    if (hour >= 1 && hour <= 12) {
      if (/\b(morning|am)\b/.test(normalized)) {
        return { slotLabel: formatTimeDraft(hour, 0, 'AM'), preferredPeriod: 'Morning' };
      }
      if (/\b(evening|night|tonight|pm)\b/.test(normalized) || hour >= 4) {
        return { slotLabel: formatTimeDraft(hour, 0, 'PM'), preferredPeriod: 'Evening' };
      }
    }
  }

  if (normalized.includes('morning')) return { preferredPeriod: 'Morning' };
  if (/\b(evening|night|tonight)\b/.test(normalized)) return { preferredPeriod: 'Evening' };
  return {};
};

const inferDraftLocally = (
  text: string,
  programs: DevotionalProgram[],
  currentDraft: AiBookingDraft
): AiBookingDraft => {
  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  const stateMatch = text.match(/\b(GA|AL|TN|NC|SC|FL)\b/i);
  const zipMatch = text.match(/\b\d{5}(?:-\d{4})?\b/);
  const normalized = normalizeText(text);
  const phoneNumber = extractPhoneNumber(text);
  const timeDraft = extractTimeDraft(text);

  const inferred: AiBookingDraft = {
    programId: inferProgramId(text, programs),
    date: parseLocalDate(text),
    ...timeDraft
  };

  if (emailMatch) inferred.email = emailMatch[0];
  if (phoneNumber) inferred.phoneNumber = phoneNumber;
  if (stateMatch) inferred.state = stateMatch[1].toUpperCase();
  if (zipMatch) inferred.zipCode = zipMatch[0];
  if (/birthday|anniversary|housewarming|wedding|memorial|prayer|special/i.test(text)) {
    inferred.occasion = currentDraft.occasion || text.trim().slice(0, 120);
  }

  return inferred;
};

const getAllowedDayDescription = (programId: string) => {
  switch (programId) {
    case 'radha-kalyanam':
      return 'Sundays only';
    case 'nikunja-utsavam':
    case 'thirumanjanam':
      return 'Saturdays and Sundays only';
    case 'nama-ruchi':
      return 'Fridays, Saturdays, and Sundays only';
    case 'nama-bhiksha':
      return 'any day, subject to slot availability';
    default:
      return 'eligible program days only';
  }
};

const getProgramBookableDayNames = (programId: string) => {
  switch (programId) {
    case 'radha-kalyanam':
      return ['Sunday'];
    case 'nikunja-utsavam':
    case 'thirumanjanam':
      return ['Saturday', 'Sunday'];
    case 'nama-ruchi':
      return ['Friday', 'Saturday', 'Sunday'];
    case 'nama-bhiksha':
      return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    default:
      return [];
  }
};

const hasExplicitCalendarDate = (text: string) => {
  const normalized = normalizeText(text);
  const monthPattern = MONTH_NAMES.join('|');
  return Boolean(
    /\b20\d{2}-\d{1,2}-\d{1,2}\b/.test(text) ||
      /\b\d{1,2}\/\d{1,2}\/20\d{2}\b/.test(text) ||
      new RegExp(`\\b(${monthPattern})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+20\\d{2})?\\b`).test(normalized) ||
      new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(${monthPattern})(?:\\s+20\\d{2})?\\b`).test(normalized)
  );
};

const isProgramCatalogOrMonthPrompt = (text: string, programs: DevotionalProgram[]) => {
  const normalized = normalizeText(text);
  if (hasExplicitCalendarDate(text)) return false;

  const asksProgramDetails = /\b(programs?|details?|hosted|available|offered|calendar|schedule|book)\b/.test(normalized);
  const asksMonthScope = MONTH_NAMES.some((month) => normalized.includes(month)) || /\bmonth\b/.test(normalized);
  const mentionsProgram = inferProgramId(text, programs) !== undefined;
  return asksMonthScope && (asksProgramDetails || mentionsProgram);
};

const isHostedCalendarPrompt = (text: string) => {
  const normalized = normalizeText(text);
  return /\b(hosted|events?|calendar|throughout|full month|whole month)\b/.test(normalized);
};

const wantsAvailableDates = (text: string) => {
  const normalized = normalizeText(text);
  if (hasExplicitCalendarDate(text)) return false;
  return Boolean(
    /\b(what|which|show)\s+(me\s+)?(the\s+)?(dates?|days?|options?)\b/.test(normalized) ||
      /\bavailable\s+(dates?|days?)\b/.test(normalized) ||
      /\b(other|alternative|different)\s+(dates?|days?)\b/.test(normalized) ||
      /\b(when|what\s+dates?)\s+(can|could)\s+(you|i|we)\b/.test(normalized)
  );
};

const isProgramScheduleQuestion = (text: string, programs: DevotionalProgram[]) => {
  const normalized = normalizeText(text);
  const mentionsProgram = inferProgramId(text, programs) !== undefined;
  if (!mentionsProgram || hasExplicitCalendarDate(text)) return false;

  return Boolean(
    /\b(what|which)\s+days?\b.*\b(book|host|schedule|available|offered)\b/.test(normalized) ||
      /\b(book|host|schedule|available|offered)\b.*\b(what|which)\s+days?\b/.test(normalized) ||
      /\bwhen\s+can\s+i\s+(book|host|schedule)\b/.test(normalized) ||
      /\bwhat\s+is\s+the\s+schedule\b/.test(normalized)
  );
};

const getRequestedMonth = (text: string) => {
  const normalized = normalizeText(text);
  const monthIndex = MONTH_NAMES.findIndex((month) => normalized.includes(month));
  if (monthIndex < 0) return null;

  const explicitYear = text.match(/\b(20\d{2})\b/);
  const today = new Date();
  return {
    monthIndex,
    year: explicitYear ? Number(explicitYear[1]) : today.getFullYear()
  };
};

const getMonthDateList = (year: number, monthIndex: number, allowedDays: string[]) => {
  const allowed = new Set(allowedDays);
  const formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const dates: string[] = [];
  const cursor = new Date(year, monthIndex, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (cursor.getMonth() === monthIndex) {
    const dayName = cursor.toLocaleDateString('en-US', { weekday: 'long' });
    if (allowed.has(dayName)) {
      const checkDate = new Date(cursor);
      checkDate.setHours(0, 0, 0, 0);
      if (checkDate >= today) {
        dates.push(formatter.format(cursor));
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

const buildProgramScheduleAnswer = (text: string, programs: DevotionalProgram[]) => {
  const programId = inferProgramId(text, programs);
  const program = programs.find((item) => item.id === programId);
  if (!program) {
    return 'I can help with Radha Kalyanam, Nikunja Utsavam, Thirumanjanam, Nama Ruchi, or Nama Bhiksha. Which program would you like the schedule for?';
  }

  const dayNames = getProgramBookableDayNames(program.id);
  const dayText =
    dayNames.length === 7
      ? 'any day, subject to slot availability'
      : getAllowedDayDescription(program.id);

  return `${program.name} can be booked on ${dayText}. Tell me the exact date you prefer and I can check available times.`;
};

const findNextBookableDate = (
  program: DevotionalProgram | undefined,
  getAvailableSlots: (program: DevotionalProgram, date: Date) => TimeSlot[],
  options: { preferredPeriod?: 'Morning' | 'Evening'; maxDays?: number } = {}
) => {
  if (!program) return null;
  const maxDays = options.maxDays ?? 90;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (let offset = 0; offset <= maxDays; offset += 1) {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + offset);
    const slots = getAvailableSlots(program, date);
    if (!slots.length) continue;
    if (options.preferredPeriod && !slots.some((slot) => slot.period === options.preferredPeriod)) {
      continue;
    }
    return date;
  }

  return null;
};

const findMatchingSlot = (slots: TimeSlot[], value?: string) => {
  if (!value) return undefined;
  const normalized = normalizeText(value);
  return slots.find((slot) => {
    const label = slotLabel(slot);
    return normalizeText(label) === normalized || normalizeText(slot.start) === normalized;
  });
};

const extractConfirmationNumber = (text: string) => {
  const match = text.match(/\b\d{6,12}\b/);
  return match?.[0];
};

const inferReservationAction = (text: string): ReservationAction | null => {
  const normalized = normalizeText(text);
  const wantsCancel = /\b(cancel|cancelled|canceled|delete|remove)\b/.test(normalized);
  const wantsEdit = /\b(edit|change|reschedule|move|update|modify)\b/.test(normalized);
  if (wantsCancel && wantsEdit) return null;
  if (wantsCancel) return 'cancel';
  if (wantsEdit) return 'edit';
  return null;
};

const isReservationManagementMessage = (text: string) => {
  const normalized = normalizeText(text);
  return Boolean(
    inferReservationAction(text) ||
      normalized.includes('confirmation') ||
      normalized.includes('reservation') ||
      normalized.includes('my booking')
  );
};

const isSessionMemoryQuestion = (text: string) => {
  const normalized = normalizeText(text);
  return Boolean(
    /\b(what|which|when|who)\b.*\b(i|my|me)\b.*\b(said|asked|told|mentioned|requested|booked|chose)\b/.test(normalized) ||
      /\b(previous|last|earlier|before)\b.*\b(message|prompt|request|thing|ask)\b/.test(normalized) ||
      /\bdo you remember\b/.test(normalized)
  );
};

const formatDraftMemory = (
  draft: AiBookingDraft,
  selectedProgram: DevotionalProgram | undefined,
  selectedDate: Date | null,
  selectedSlot: TimeSlot | undefined
) => {
  const details = [
    selectedProgram ? `program: ${selectedProgram.name}` : '',
    selectedDate ? `date: ${formatDateLong(selectedDate)}` : '',
    selectedSlot ? `time: ${slotLabel(selectedSlot)}` : draft.preferredPeriod ? `preferred period: ${draft.preferredPeriod}` : '',
    draft.name ? `host: ${draft.name}` : '',
    draft.email ? `email: ${draft.email}` : '',
    draft.phoneNumber ? `phone: ${draft.phoneNumber}` : '',
    draft.street || draft.city || draft.zipCode
      ? `address: ${[draft.street, draft.city, draft.state, draft.zipCode].filter(Boolean).join(', ')}`
      : '',
    draft.occasion ? `occasion: ${draft.occasion}` : '',
    draft.additionalNotes ? `notes: ${draft.additionalNotes}` : ''
  ].filter(Boolean);

  return details.join('; ');
};

const buildSessionMemoryText = (
  messages: ChatMessage[],
  draft: AiBookingDraft,
  selectedProgram: DevotionalProgram | undefined,
  selectedDate: Date | null,
  selectedSlot: TimeSlot | undefined,
  managedReservation: ReservationDetails | null
) => {
  const userMessages = messages
    .filter((message) => message.role === 'user')
    .map((message, index) => `${index + 1}. ${message.content}`);
  const draftMemory = formatDraftMemory(draft, selectedProgram, selectedDate, selectedSlot);
  const reservationMemory = managedReservation
    ? `managed reservation: ${managedReservation.programType}, confirmation ${managedReservation.confirmationNumber}, date ${managedReservation.date}, time ${managedReservation.time || 'not listed'}, email ${managedReservation.email}`
    : '';

  return [
    userMessages.length ? `User messages this session:\n${userMessages.join('\n')}` : '',
    draftMemory ? `Current booking draft: ${draftMemory}` : '',
    reservationMemory
  ].filter(Boolean).join('\n');
};

const getBookingsWithoutReservation = (
  bookings: BookingRecord[],
  reservation: ReservationDetails | null
) => {
  if (!reservation) return bookings;

  const normalizedProgram = normalizeProgramType(reservation.programType);
  const normalizedEmail = normalizeEmailForMatch(reservation.email || '');
  const normalizedConfirmation = normalizeConfirmationForMatch(reservation.confirmationNumber || '');

  const indexToRemove = bookings.findIndex((booking) => {
    if (normalizeProgramType(booking.type || '') !== normalizedProgram) return false;
    if (booking.date !== reservation.date) return false;
    if (normalizeEmailForMatch(booking.email || '') !== normalizedEmail) return false;
    return normalizeConfirmationForMatch(booking.confirmationNumber || '') === normalizedConfirmation;
  });

  if (indexToRemove < 0) return bookings;
  return bookings.filter((_, index) => index !== indexToRemove);
};

const getCalendarBookedDatesForProgram = (
  program: DevotionalProgram | undefined,
  bookings: BookingRecord[],
  reservationToExclude: ReservationDetails | null = null
) => {
  if (!program) return [];

  const comparableBookings = getBookingsWithoutReservation(bookings, reservationToExclude);
  const blockedDates = new Set<string>();
  const namaBhikshaSlotsByDate: Record<string, string[]> = {};

  for (const booking of comparableBookings) {
    if (!booking.date) continue;
    if (isSatsangType(booking.type)) continue;

    if (isNamaBhikshaType(booking.type)) {
      const timeLabel = booking.time?.trim();
      if (!timeLabel) continue;
      namaBhikshaSlotsByDate[booking.date] = namaBhikshaSlotsByDate[booking.date] || [];
      if (!namaBhikshaSlotsByDate[booking.date].includes(timeLabel)) {
        namaBhikshaSlotsByDate[booking.date].push(timeLabel);
      }
      continue;
    }

    blockedDates.add(booking.date);
  }

  if (program.id === 'nama-bhiksha') {
    for (const [date, slots] of Object.entries(namaBhikshaSlotsByDate)) {
      if (slots.length >= 2) {
        blockedDates.add(date);
      }
    }
  }

  return Array.from(blockedDates);
};

const getContactComplete = (draft: AiBookingDraft) =>
  Boolean(
    draft.name?.trim() &&
      draft.email?.trim() &&
      EMAIL_REGEX.test(draft.email.trim()) &&
      draft.phoneNumber?.replace(/\D/g, '').match(/^\d{10}$/)
  );

const getAddressComplete = (draft: AiBookingDraft) =>
  Boolean(draft.street?.trim() && draft.city?.trim() && draft.state?.trim() && draft.zipCode?.trim());

const getFlowStep = (
  draft: AiBookingDraft,
  selectedProgram: DevotionalProgram | undefined,
  selectedDate: Date | null,
  selectedSlot: TimeSlot | undefined
): FlowStep => {
  if (!selectedProgram || !selectedDate) return 'program-date';
  if (!selectedSlot) return 'slot';
  if (!getContactComplete(draft)) return 'contact';
  if (!getAddressComplete(draft)) return 'address';
  if (!draft.occasion?.trim()) return 'occasion';
  return 'review';
};

const getScheduleMessage = (
  draft: AiBookingDraft,
  selectedProgram: DevotionalProgram | undefined,
  selectedDate: Date | null,
  availableSlots: TimeSlot[],
  selectedSlot: TimeSlot | undefined
) => {
  if (!selectedProgram || !selectedDate) return '';

  const generatedSlots = generateSlots(selectedProgram.id, selectedDate);
  if (!generatedSlots.length) {
    return `${selectedProgram.name} is not offered on ${formatDateLong(selectedDate)}. ${selectedProgram.name} is offered on ${getAllowedDayDescription(selectedProgram.id)}. Please choose another eligible date.`;
  }

  if (!availableSlots.length) {
    return `${selectedProgram.name} is offered on ${formatDateLong(selectedDate)}, but there are no available slots left for that date. Please choose another date.`;
  }

  if ((draft.slotLabel || draft.preferredPeriod) && !selectedSlot) {
    const availablePreview = availableSlots.slice(0, 5).map(slotLabel).join(', ');
    return `That requested time is not available for ${selectedProgram.name} on ${formatDateLong(selectedDate)}. Available options include ${availablePreview}.`;
  }

  return '';
};

const makeAssistantFollowup = (
  draft: AiBookingDraft,
  programs: DevotionalProgram[],
  selectedProgram: DevotionalProgram | undefined,
  selectedDate: Date | null,
  availableSlots: TimeSlot[],
  selectedSlot: TimeSlot | undefined,
  hasConfirmedContact: boolean
) => {
  const scheduleMessage = getScheduleMessage(draft, selectedProgram, selectedDate, availableSlots, selectedSlot);
  if (scheduleMessage) return scheduleMessage;

  if (selectedProgram && selectedDate && selectedSlot && getContactComplete(draft) && !hasConfirmedContact) {
    return 'Please review the host contact details below, then press Continue.';
  }

  const step = getFlowStep(draft, selectedProgram, selectedDate, selectedSlot);
  if (step === 'program-date') {
    if (selectedProgram && !selectedDate) {
      return `I have ${selectedProgram.name}. Which exact date would you like to book?`;
    }
    return `I can book one of these programs: ${programs.map((program) => program.name).join(', ')}. Which program and date would you like?`;
  }
  if (step === 'slot') {
    const slotPreview = availableSlots.slice(0, 4).map(slotLabel).join(', ');
    return `I found ${availableSlots.length} available slot${availableSlots.length === 1 ? '' : 's'} for ${selectedProgram!.name} on ${formatDateLong(selectedDate!)}. Please choose a time. Options include ${slotPreview}.`;
  }
  if (step === 'contact') {
    return `Please provide the host's full name, email, and phone number for ${selectedProgram!.name} on ${formatDateLong(selectedDate!)} at ${slotLabel(selectedSlot!)}.`;
  }
  if (step === 'address') {
    return 'Please search and select the host address.';
  }
  if (step === 'occasion') {
    return 'What is the occasion for this booking, and are there any additional notes the organizers should know?';
  }
  return 'I have everything needed. Please review the booking details below and submit if everything looks good.';
};

const AiBookingAgent: React.FC<AiBookingAgentProps> = ({
  programs,
  bookings,
  isSubmitting,
  getAvailableSlots,
  verifyReservation,
  updateReservation,
  cancelReservation,
  onSubmitBooking,
  onReservationChanged,
  onBack
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: initialAssistantMessage }
  ]);
  const [draft, setDraft] = useState<AiBookingDraft>({ state: 'GA' });
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isAddressLookupLoading, setIsAddressLookupLoading] = useState(false);
  const [addressLookupError, setAddressLookupError] = useState('');
  const [hasConfirmedContact, setHasConfirmedContact] = useState(false);
  const [hasConfirmedOccasion, setHasConfirmedOccasion] = useState(false);
  const [activeEditSection, setActiveEditSection] = useState<EditSection>(null);
  const [reservationConfirmation, setReservationConfirmation] = useState('');
  const [isReservationManagementActive, setIsReservationManagementActive] = useState(false);
  const [reservationAction, setReservationAction] = useState<ReservationAction | null>(null);
  const [managedReservation, setManagedReservation] = useState<ReservationDetails | null>(null);
  const [reservationEditDraft, setReservationEditDraft] = useState({ date: '', slotLabel: '' });
  const [reservationError, setReservationError] = useState('');
  const [isReservationWorking, setIsReservationWorking] = useState(false);
  const [reservationResultMessage, setReservationResultMessage] = useState('');
  const [aiCalendarInitialMonth, setAiCalendarInitialMonth] = useState<Date | null>(null);
  const [isActivePanelSuppressed, setIsActivePanelSuppressed] = useState(false);

  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const placesContainerRef = useRef<HTMLDivElement | null>(null);
  const chatShellRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const googlePlacesApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const selectedProgram = useMemo(
    () => programs.find((program) => program.id === draft.programId),
    [draft.programId, programs]
  );
  const selectedDate = draft.date ? parseDateKey(draft.date) : null;
  const availableSlots = selectedProgram && selectedDate ? getAvailableSlots(selectedProgram, selectedDate) : [];

  const selectedSlot = useMemo(
    () => findMatchingSlot(availableSlots, draft.slotLabel),
    [availableSlots, draft.slotLabel]
  );
  const aiCalendarBookedDates = useMemo(
    () => getCalendarBookedDatesForProgram(selectedProgram, bookings),
    [bookings, selectedProgram]
  );
  const managedProgram = useMemo(
    () => managedReservation ? resolveProgramByType(managedReservation.programType, programs) : undefined,
    [managedReservation, programs]
  );
  const reservationEditDate = reservationEditDraft.date ? parseDateKey(reservationEditDraft.date) : null;
  const reservationCalendarBookedDates = useMemo(
    () => getCalendarBookedDatesForProgram(managedProgram, bookings, managedReservation),
    [bookings, managedProgram, managedReservation]
  );
  const reservationEditSlots = useMemo(() => {
    if (!managedProgram || !managedReservation || !reservationEditDate) return [];
    const dateStr = toDateKey(reservationEditDate);
    const comparableBookings = getBookingsWithoutReservation(bookings, managedReservation);
    const blockedDates = comparableBookings
      .filter((booking) => booking.date && !isNamaBhikshaType(booking.type) && !isSatsangType(booking.type))
      .map((booking) => booking.date);

    if (!isDateSelectable(managedProgram.id, reservationEditDate, blockedDates)) {
      return [];
    }

    const rawSlots = generateSlots(managedProgram.id, reservationEditDate);
    const hasSatsang = comparableBookings.some(
      (booking) => booking.date === dateStr && isSatsangType(booking.type)
    );
    const slotsAfterSatsang = hasSatsang
      ? rawSlots.filter((slot) => !isSatsangBlockedSlot(slot))
      : rawSlots;

    if (managedProgram.id !== 'nama-bhiksha') {
      return slotsAfterSatsang;
    }

    const bookedTimes = new Set(
      comparableBookings
        .filter((booking) => booking.date === dateStr && isNamaBhikshaType(booking.type))
        .map((booking) => booking.time?.trim())
        .filter((time): time is string => Boolean(time))
    );

    return slotsAfterSatsang.filter((slot) => {
      const label = slotLabel(slot);
      return !(bookedTimes.has(label) || bookedTimes.has(slot.start));
    });
  }, [bookings, managedProgram, managedReservation, reservationEditDate]);
  const selectedReservationEditSlot = useMemo(
    () => findMatchingSlot(reservationEditSlots, reservationEditDraft.slotLabel),
    [reservationEditDraft.slotLabel, reservationEditSlots]
  );
  const quickPrompts = useMemo(() => {
    const byId = (id: string) => programs.find((program) => program.id === id);
    const namaBhiksha = byId('nama-bhiksha');
    const namaRuchi = byId('nama-ruchi');
    const radhaKalyanam = byId('radha-kalyanam');
    const namaBhikshaDate = findNextBookableDate(namaBhiksha, getAvailableSlots);
    const namaRuchiDate = findNextBookableDate(namaRuchi, getAvailableSlots, { preferredPeriod: 'Evening' });
    const radhaDate = findNextBookableDate(radhaKalyanam, getAvailableSlots);
    const prompts = [
      namaBhikshaDate && `Book Nama Bhiksha on ${formatDateNumeric(namaBhikshaDate)}`,
      namaRuchiDate && `Book Nama Ruchi on ${formatDateNumeric(namaRuchiDate)} evening`,
      radhaDate && `Could I book a Radha Kalyanam on ${formatDateNumeric(radhaDate)}?`,
      'What can I book in May?',
      'Manage my booking'
    ].filter((prompt): prompt is string => Boolean(prompt));
    return prompts;
  }, [getAvailableSlots, programs]);
  const flowStep = getFlowStep(draft, selectedProgram, selectedDate, selectedSlot);
  const contactNeedsConfirmation = Boolean(
    selectedProgram &&
      selectedDate &&
      selectedSlot &&
      getContactComplete(draft) &&
      !hasConfirmedContact
  );
  const effectiveFlowStep = activeEditSection
    ? flowStep
    : contactNeedsConfirmation
      ? 'contact'
      : flowStep === 'review' && !hasConfirmedOccasion
      ? 'occasion'
      : flowStep;
  const scheduleMessage = getScheduleMessage(draft, selectedProgram, selectedDate, availableSlots, selectedSlot);
  const canSubmit =
    !activeEditSection && effectiveFlowStep === 'review' && selectedProgram && selectedDate && selectedSlot;
  const activeStepLabel =
    isReservationManagementActive
      ? 'Manage booking'
      : activeEditSection
        ? 'Editing details'
        : effectiveFlowStep === 'program-date'
          ? selectedProgram
            ? 'Choose a date'
            : 'Choose a program'
          : effectiveFlowStep === 'slot'
            ? 'Choose a time'
            : effectiveFlowStep === 'contact'
              ? 'Host contact'
              : effectiveFlowStep === 'address'
                ? 'Host address'
                : effectiveFlowStep === 'occasion'
                  ? 'Occasion'
                  : effectiveFlowStep === 'review'
                    ? 'Review request'
                    : 'Start request';
  const sessionMemory = useMemo(
    () => buildSessionMemoryText(messages, draft, selectedProgram, selectedDate, selectedSlot, managedReservation),
    [draft, managedReservation, messages, selectedDate, selectedProgram, selectedSlot]
  );
  const reservationScheduleMessage = (() => {
    if (!managedProgram || !reservationEditDate) return '';
    const generatedSlots = generateSlots(managedProgram.id, reservationEditDate);
    if (!generatedSlots.length) {
      return `${managedProgram.name} is not offered on ${formatDateLong(reservationEditDate)}. ${managedProgram.name} is offered on ${getAllowedDayDescription(managedProgram.id)}. Please choose another eligible date.`;
    }
    if (!reservationEditSlots.length) {
      return `${managedProgram.name} is offered on ${formatDateLong(reservationEditDate)}, but there are no available slots left for that date. Please choose another date.`;
    }
    if (reservationEditDraft.slotLabel && !selectedReservationEditSlot) {
      return 'That requested time is not available for this reservation. Please choose one of the available times below.';
    }
    return '';
  })();

  useEffect(() => {
    return () => {
      if (addressDebounceRef.current) {
        clearTimeout(addressDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [flowStep, isThinking, messages.length, reservationAction, managedReservation, reservationEditDraft.date]);

  const ensureGooglePlacesReady = async () => {
    await loadGooglePlacesScript(googlePlacesApiKey);
    const googleObj = (window as any).google;
    if (!googleObj?.maps?.places) throw new Error('Google Places API is not available.');
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new googleObj.maps.places.AutocompleteService();
    }
    if (!placesServiceRef.current) {
      placesContainerRef.current = document.createElement('div');
      placesServiceRef.current = new googleObj.maps.places.PlacesService(placesContainerRef.current);
    }
  };

  const updateDraftField = (field: keyof AiBookingDraft, value: string) => {
    setIsActivePanelSuppressed(false);
    setDraft((prev) => ({
      ...prev,
      [field]: field === 'state' ? value.toUpperCase() : value
    }));
    if (field === 'name' || field === 'email' || field === 'phoneNumber') {
      setHasConfirmedContact(false);
    }
    if (field === 'occasion' || field === 'additionalNotes') {
      setHasConfirmedOccasion(false);
    }
    setError('');
  };

  const updateCalendarInitialMonthFromText = (text: string) => {
    const requestedMonth = getRequestedMonth(text);
    setAiCalendarInitialMonth(
      requestedMonth ? new Date(requestedMonth.year, requestedMonth.monthIndex, 1) : null
    );
  };

  const applyDraftAndReply = (incomingDraft: AiBookingDraft, fallbackMessage?: string, sourceText = '') => {
    setIsActivePanelSuppressed(false);
    const nextDraft = mergeDraft(draft, incomingDraft);
    const incomingUpdatesContact = Boolean(incomingDraft.name || incomingDraft.email || incomingDraft.phoneNumber);
    const nextHasConfirmedContact = incomingUpdatesContact ? false : hasConfirmedContact;
    if (!nextDraft.date && wantsEarliestBookableDate(sourceText)) {
      const earliestProgram = programs.find((item) => item.id === nextDraft.programId);
      const earliestDate = findNextBookableDate(earliestProgram, getAvailableSlots, {
        preferredPeriod: nextDraft.preferredPeriod
      });
      if (earliestDate) {
        nextDraft.date = toDateKey(earliestDate);
      }
    }
    const program = programs.find((item) => item.id === nextDraft.programId);
    const date = nextDraft.date ? parseDateKey(nextDraft.date) : null;
    const slots = program && date ? getAvailableSlots(program, date) : [];
    const generatedSlots = program && date ? generateSlots(program.id, date) : [];

    if (program && date && generatedSlots.length === 0) {
      nextDraft.slotLabel = '';
      nextDraft.preferredPeriod = undefined;
    } else if (nextDraft.preferredPeriod && !nextDraft.slotLabel) {
      const preferredSlot = slots.find((slot) => slot.period === nextDraft.preferredPeriod);
      if (preferredSlot) {
        nextDraft.slotLabel = slotLabel(preferredSlot);
      }
    }

    if (nextDraft.slotLabel) {
      const matchedSlot = findMatchingSlot(slots, nextDraft.slotLabel);
      if (matchedSlot) {
        nextDraft.slotLabel = slotLabel(matchedSlot);
      }
    }

    const selectedNextSlot = findMatchingSlot(slots, nextDraft.slotLabel);
    const message =
      fallbackMessage ||
      makeAssistantFollowup(nextDraft, programs, program, date, slots, selectedNextSlot, nextHasConfirmedContact);

    if (incomingUpdatesContact) {
      setHasConfirmedContact(false);
    }
    if (incomingDraft.occasion || incomingDraft.additionalNotes) {
      setHasConfirmedOccasion(true);
    }
    setDraft(nextDraft);
    setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: message }]);
  };

  const appendAssistantMessage = (content: string) => {
    setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content }]);
  };

  const buildReservationLookup = (reservation: ReservationDetails): ReservationLookupData => ({
    programType: reservation.programType,
    date: reservation.date,
    time: reservation.time,
    email: reservation.email,
    confirmationNumber: reservation.confirmationNumber
  });

  const buildMonthlyAvailabilityContext = (text: string) => {
    const requestedMonth = getRequestedMonth(text);
    if (!requestedMonth) {
      return 'No specific month was detected. The assistant should ask which month the user wants to book in.';
    }

    const monthLabel = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(new Date(requestedMonth.year, requestedMonth.monthIndex, 1));

    const requestedProgramId = inferProgramId(text, programs);
    const relevantPrograms = requestedProgramId
      ? programs.filter((program) => program.id === requestedProgramId)
      : programs;

    const lines = relevantPrograms.map((program) => {
      const allowedDays = getProgramBookableDayNames(program.id);
      const ruleDates = getMonthDateList(requestedMonth.year, requestedMonth.monthIndex, allowedDays);
      const bookableDates = ruleDates.filter((dateLabel) => {
        const parsed = new Date(`${dateLabel}, ${requestedMonth.year}`);
        return getAvailableSlots(program, parsed).length > 0;
      });
      const preview = bookableDates.slice(0, 8).join(', ');
      const moreCount = bookableDates.length - 8;
      const dateText =
        bookableDates.length > 0
          ? `${preview}${moreCount > 0 ? `, and ${moreCount} more` : ''}`
          : 'No currently available dates';
      return `${program.name}: rule=${getAllowedDayDescription(program.id)}; currentlyBookableDates=${dateText}.`;
    });

    const hostedCalendarPrompt = isHostedCalendarPrompt(text);
    return [
      hostedCalendarPrompt
        ? `User asked about hosted-event calendar details for ${monthLabel}.`
        : `User asked which home programs can be booked in ${monthLabel}.`,
      hostedCalendarPrompt
        ? 'Important response instruction: The assistant must explain that it cannot provide a hosted-events calendar or details for every program hosted throughout the month. It should instead help the user book eligible home programs.'
        : 'Important response instruction: Do not mention hosted-events calendars. Answer directly with eligible home-program booking options for the month.',
      requestedProgramId
        ? 'The user already named the program. Do not ask which program. Acknowledge the named program and ask only for the exact date if needed.'
        : 'If no program was named, help the user choose from the listed bookable programs.',
      `Use these current booking facts for ${monthLabel}:`,
      ...lines,
      'End by asking the user to choose a program and exact date so available times can be checked.'
    ].join('\n');
  };

  const applyVerifiedReservation = (
    reservation: ReservationDetails,
    confirmationNumber: string,
    action: ReservationAction | null,
    sourceText: string
  ) => {
    const verified = {
      programType: reservation.programType,
      date: reservation.date,
      time: reservation.time || '',
      email: reservation.email,
      confirmationNumber: reservation.confirmationNumber || confirmationNumber,
      occasion: reservation.occasion || ''
    };
    const inferredDraft = inferDraftLocally(sourceText, programs, {});
    const requestedDate = parseLocalDate(sourceText) || verified.date;

    setManagedReservation(verified);
    setReservationConfirmation(verified.confirmationNumber);
    setIsReservationManagementActive(true);
    setReservationAction(action);
    setReservationResultMessage('');
    setReservationEditDraft({
      date: requestedDate,
      slotLabel: inferredDraft.slotLabel || ''
    });

    const details = `${verified.programType} on ${formatDateLong(parseDateKey(verified.date) || new Date(`${verified.date}T00:00:00`))}${verified.time ? ` at ${verified.time}` : ''}`;
    if (action === 'edit') {
      appendAssistantMessage(`I found your reservation for ${details}. Choose the new date and time below, then submit the update.`);
    } else if (action === 'cancel') {
      appendAssistantMessage(`I found your reservation for ${details}. Please review the cancellation panel below before cancelling.`);
    } else {
      appendAssistantMessage(`I found your reservation for ${details}. Would you like to edit it or cancel it?`);
    }
  };

  const verifyManagedReservation = async (
    confirmationNumber: string,
    action: ReservationAction | null,
    sourceText: string
  ) => {
    setIsReservationWorking(true);
    setReservationError('');
    try {
      const result = await verifyReservation({ confirmationNumber });
      if (!result.found || !result.reservation) {
        setManagedReservation(null);
        setReservationError(result.message || 'Sorry! Could not find your reservation. Please check the confirmation number.');
        appendAssistantMessage(result.message || 'Sorry, I could not find that reservation. Please check the confirmation number and try again.');
        return;
      }
      if (!result.reservation.date || !result.reservation.programType || !result.reservation.email) {
        setManagedReservation(null);
        setReservationError('Found reservation, but required details are incomplete. Please contact support.');
        appendAssistantMessage('I found the reservation, but required details are incomplete. Please contact support.');
        return;
      }
      applyVerifiedReservation(result.reservation, confirmationNumber, action, sourceText);
    } finally {
      setIsReservationWorking(false);
    }
  };

  const handleReservationActionSelect = (action: ReservationAction) => {
    if (!managedReservation) return;
    setReservationAction(action);
    setReservationError('');
    setReservationResultMessage('');
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: action === 'edit' ? 'Edit this booking.' : 'Cancel this booking.' },
      {
        role: 'assistant',
        content:
          action === 'edit'
            ? 'Choose the new date and time below, then submit the update.'
            : 'Please review the cancellation panel below before cancelling.'
      }
    ]);
  };

  const handleReservationMessage = async (text: string): Promise<boolean> => {
    const actionFromText = inferReservationAction(text);
    const confirmationNumber = extractConfirmationNumber(text);
    const shouldHandle =
      Boolean(isReservationManagementActive || reservationAction || managedReservation) ||
      isReservationManagementMessage(text) ||
      Boolean(actionFromText && confirmationNumber);

    if (!shouldHandle) return false;

    const nextAction = actionFromText || reservationAction;
    setIsReservationManagementActive(true);
    setReservationError('');
    setError('');

    if (confirmationNumber && (!managedReservation || confirmationNumber !== managedReservation.confirmationNumber)) {
      setReservationConfirmation(confirmationNumber);
      await verifyManagedReservation(confirmationNumber, nextAction, text);
      return true;
    }

    if (!managedReservation) {
      if (nextAction) setReservationAction(nextAction);
      appendAssistantMessage('Please enter your confirmation number so I can find the booking to edit or cancel.');
      return true;
    }

    if (actionFromText) {
      handleReservationActionSelect(actionFromText);
      const inferredDraft = inferDraftLocally(text, programs, {});
      const requestedDate = parseLocalDate(text);
      if (actionFromText === 'edit' && (requestedDate || inferredDraft.slotLabel)) {
        setReservationEditDraft((prev) => ({
          date: requestedDate || prev.date || managedReservation.date,
          slotLabel: inferredDraft.slotLabel || prev.slotLabel || managedReservation.time || ''
        }));
      }
      return true;
    }

    appendAssistantMessage('I can edit the reservation date/time or cancel the booking. Choose one of the options below.');
    return true;
  };

  const handleSend = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isThinking) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setIsThinking(true);
    setError('');
    updateCalendarInitialMonthFromText(text);

    try {
      const handledReservationMessage = await handleReservationMessage(text);
      if (handledReservationMessage) return;

      if (isProgramScheduleQuestion(text, programs)) {
        setIsActivePanelSuppressed(true);
        setActiveEditSection(null);
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: 'assistant', content: buildProgramScheduleAnswer(text, programs) }
        ]);
        return;
      }

      if (wantsAvailableDates(text)) {
        const candidateProgramId = inferProgramId(text, programs) || draft.programId;
        const candidateProgram = programs.find((program) => program.id === candidateProgramId);
        if (candidateProgram) {
          const upcoming: Date[] = [];
          const cursor = new Date();
          cursor.setHours(0, 0, 0, 0);
          for (let offset = 0; offset < 180 && upcoming.length < 6; offset += 1) {
            const candidate = new Date(cursor);
            candidate.setDate(cursor.getDate() + offset);
            if (getAvailableSlots(candidateProgram, candidate).length > 0) {
              upcoming.push(candidate);
            }
          }

          setDraft((prev) => ({
            ...prev,
            programId: candidateProgram.id,
            date: undefined,
            slotLabel: '',
            preferredPeriod: undefined
          }));
          setIsActivePanelSuppressed(false);
          setActiveEditSection(null);

          const dayRule = getAllowedDayDescription(candidateProgram.id);
          const message = upcoming.length
            ? `${candidateProgram.name} can be booked on ${dayRule}. Here are the next available dates:\n\n${upcoming
                .map((date) => `- ${formatDateLong(date)}`)
                .join('\n')}\n\nWhich date works for you?`
            : `I do not see any upcoming available dates for ${candidateProgram.name} right now. Would you like to try a different program?`;

          appendAssistantMessage(message);
          return;
        }
      }

      const locallyInferredDraft = inferDraftLocally(text, programs, draft);
      const availabilityContext = isProgramCatalogOrMonthPrompt(text, programs)
        ? buildMonthlyAvailabilityContext(text)
        : undefined;
      const hasLocalSignal = !availabilityContext && Object.values(locallyInferredDraft).some(Boolean);
      const result = await requestAiBookingExtraction({
        messages: nextMessages,
        draft,
        programs,
        todayIso: getTodayIso(),
        sessionMemory,
        availabilityContext
      });
      if (availabilityContext || isSessionMemoryQuestion(text) || (result.intent === 'info' && !hasDraftSignal(result.draft))) {
        if (availabilityContext && Object.values(locallyInferredDraft).some(Boolean)) {
          setDraft((prevDraft) => mergeDraft(prevDraft, locallyInferredDraft));
        }
        setIsActivePanelSuppressed(true);
        setMessages((prevMessages) => [
          ...prevMessages,
          { role: 'assistant', content: result.assistantMessage }
        ]);
      } else {
        applyDraftAndReply(
          hasLocalSignal ? mergeModelAndLocalDraft(locallyInferredDraft, result.draft) : result.draft,
          undefined,
          text
        );
      }
    } catch (requestError) {
      console.error('AI booking agent error:', requestError);
      const inferredDraft = inferDraftLocally(text, programs, draft);
      const hasLocalSignal = Object.values(inferredDraft).some(Boolean);
      if (hasLocalSignal) {
        applyDraftAndReply(inferredDraft, undefined, text);
        setError('AI extraction is unavailable, so I used local parsing for this message.');
      } else if (/what|which|explain|tell me|program/i.test(text)) {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: 'assistant',
            content:
              'I could not reach the AI service, so I cannot answer that from the chat model right now. Please try again in a moment.'
          }
        ]);
        setError('AI service unavailable.');
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            role: 'assistant',
            content:
              'I could not reach the AI service. Please tell me the program and date, and I can still use local booking rules.'
          }
        ]);
        setError(requestError instanceof Error ? requestError.message : 'AI service unavailable.');
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleSlotChoice = (slot: TimeSlot) => {
    setIsActivePanelSuppressed(false);
    void handleSend(slotLabel(slot));
  };

  const scrollToChat = () => {
    chatShellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAiDateSelect = (date: Date) => {
    setIsActivePanelSuppressed(false);
    setDraft((prev) => ({
      ...prev,
      date: toDateKey(date),
      slotLabel: '',
      preferredPeriod: undefined
    }));
    setError('');
  };

  const handleReservationConfirmationContinue = () => {
    const confirmationNumber = reservationConfirmation.trim();
    if (!confirmationNumber) {
      setReservationError('Please enter your confirmation number.');
      return;
    }
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: `Confirmation number ${confirmationNumber}` }
    ]);
    void verifyManagedReservation(confirmationNumber, reservationAction, `Confirmation number ${confirmationNumber}`);
  };

  const handleReservationEditSubmit = async () => {
    if (!managedReservation || !managedProgram || !reservationEditDate || !selectedReservationEditSlot) {
      setReservationError('Please choose a valid new date and time before submitting the update.');
      return;
    }
    if (reservationScheduleMessage) {
      setReservationError(reservationScheduleMessage);
      return;
    }

    setIsReservationWorking(true);
    setReservationError('');
    const newDate = toDateKey(reservationEditDate);
    const newTime = slotLabel(selectedReservationEditSlot);

    const result = await updateReservation({
      lookup: buildReservationLookup(managedReservation),
      updates: {
        newDate,
        newTime
      }
    });

    setIsReservationWorking(false);

    if (!result.success) {
      setReservationError(result.message || 'Failed to update reservation.');
      appendAssistantMessage(result.message || 'I could not update that reservation. Please try again or contact support.');
      return;
    }

    await onReservationChanged();
    const message = `Your reservation has been updated to ${formatDateLong(reservationEditDate)} at ${newTime}.`;
    setReservationResultMessage(message);
    setIsReservationManagementActive(false);
    setReservationAction(null);
    setManagedReservation(null);
    appendAssistantMessage(message);
  };

  const handleReservationCancelSubmit = async () => {
    if (!managedReservation) {
      setReservationError('Please verify a reservation before cancelling.');
      return;
    }

    setIsReservationWorking(true);
    setReservationError('');
    const result = await cancelReservation({
      programType: managedReservation.programType,
      date: managedReservation.date,
      email: managedReservation.email,
      confirmationNumber: managedReservation.confirmationNumber
    });
    setIsReservationWorking(false);

    if (!result.success) {
      setReservationError(result.message || 'Failed to cancel reservation.');
      appendAssistantMessage(result.message || 'I could not cancel that reservation. Please try again or contact support.');
      return;
    }

    await onReservationChanged();
    const message = 'Your reservation has been cancelled successfully.';
    setReservationResultMessage(message);
    setIsReservationManagementActive(false);
    setReservationAction(null);
    setManagedReservation(null);
    appendAssistantMessage(message);
  };

  const handleReservationReset = () => {
    setIsReservationManagementActive(false);
    setReservationAction(null);
    setManagedReservation(null);
    setReservationConfirmation('');
    setReservationEditDraft({ date: '', slotLabel: '' });
    setReservationError('');
    setReservationResultMessage('');
    appendAssistantMessage('No changes were made. You can give me another confirmation number if you need to manage a different booking.');
  };

  const handleContactContinue = () => {
    const hasValidName = Boolean(draft.name?.trim());
    const hasValidEmail = Boolean(draft.email?.trim() && EMAIL_REGEX.test(draft.email.trim()));
    const hasValidPhone = Boolean(draft.phoneNumber?.replace(/\D/g, '').match(/^\d{10}$/));
    const hasRequiredFields =
      activeEditSection === 'host'
        ? hasValidName
        : activeEditSection === 'contact'
          ? hasValidEmail && hasValidPhone
          : getContactComplete(draft);

    if (!hasRequiredFields) {
      setError('Please enter a valid full name, email, and 10 digit phone number.');
      return;
    }
    if (activeEditSection === 'host' || activeEditSection === 'contact') {
      const sectionLabel = activeEditSection === 'host' ? 'host name' : 'contact details';
      setActiveEditSection(null);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: `Updated ${sectionLabel}.` },
        { role: 'assistant', content: `${sectionLabel[0].toUpperCase()}${sectionLabel.slice(1)} updated. Please review the booking again.` }
      ]);
      return;
    }
    setHasConfirmedContact(true);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: 'user',
        content: `My name is ${draft.name}, my email is ${draft.email}, and my phone number is ${draft.phoneNumber}.`
      },
      { role: 'assistant', content: 'Please search and select the host address.' }
    ]);
  };

  const getAddressText = () =>
    `${draft.street || ''}, ${draft.city || ''}, ${draft.state || ''} ${draft.zipCode || ''}`
      .replace(/\s+/g, ' ')
      .trim();

  const handleAddressContinue = () => {
    if (!getAddressComplete(draft)) {
      setAddressLookupError('Please select or enter a complete address.');
      return;
    }
    if (activeEditSection === 'address') {
      setActiveEditSection(null);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: `Updated address to ${getAddressText()}.` },
        { role: 'assistant', content: 'Address updated. Please review the booking again.' }
      ]);
      return;
    }
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: `The host address is ${getAddressText()}.` },
      {
        role: 'assistant',
        content: 'What is the occasion for this booking, and are there any additional notes the organizers should know?'
      }
    ]);
  };

  const handleOccasionContinue = () => {
    if (activeEditSection !== 'notes' && !draft.occasion?.trim()) {
      setError('Please enter the occasion before continuing.');
      return;
    }
    const notes = draft.additionalNotes?.trim()
      ? `Additional notes: ${draft.additionalNotes.trim()}`
      : 'There are no additional notes.';
    setHasConfirmedOccasion(true);
    if (activeEditSection === 'occasion' || activeEditSection === 'notes') {
      const sectionLabel = activeEditSection === 'occasion' ? 'occasion' : 'additional notes';
      setActiveEditSection(null);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', content: `Updated ${sectionLabel}. Occasion: ${draft.occasion?.trim() || 'None'}. ${notes}` },
        { role: 'assistant', content: `${sectionLabel[0].toUpperCase()}${sectionLabel.slice(1)} updated. Please review the booking again.` }
      ]);
      return;
    }
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: `The occasion is ${draft.occasion.trim()}. ${notes}` },
      {
        role: 'assistant',
        content: 'I have everything needed. Please review the booking details below and submit if everything looks good.'
      }
    ]);
  };

  const searchAddress = async (query: string) => {
    if (query.trim().length < 3) {
      setAddressSuggestions([]);
      setAddressLookupError('');
      return;
    }

    setIsAddressLookupLoading(true);
    setAddressLookupError('');

    try {
      let suggestions: AddressSuggestion[] = [];

      if (!googlePlacesUnavailable) {
        try {
          await ensureGooglePlacesReady();
          const googleObj = (window as any).google;
          const result: { predictions: any[]; timedOut: boolean } = await new Promise(resolve => {
            const timeoutId = window.setTimeout(
              () => resolve({ predictions: [], timedOut: true }),
              3000
            );
            autocompleteServiceRef.current.getPlacePredictions(
              {
                input: query,
                componentRestrictions: { country: 'us' },
                types: ['address']
              },
              (results: any, status: any) => {
                window.clearTimeout(timeoutId);
                if (status !== googleObj.maps.places.PlacesServiceStatus.OK || !results) {
                  resolve({ predictions: [], timedOut: false });
                  return;
                }
                resolve({ predictions: results, timedOut: false });
              }
            );
          });

          if (result.timedOut) {
            googlePlacesUnavailable = true;
          }

          suggestions = result.predictions.slice(0, 6).map(prediction => ({
            display: prediction.description,
            placeId: prediction.place_id,
            source: 'google'
          }));
        } catch (googleError) {
          googlePlacesUnavailable = true;
          console.warn('Google Places lookup unavailable, using fallback address search:', googleError);
        }
      }

      if (!suggestions.length) {
        suggestions = await searchFallbackAddresses(query);
      }

      setAddressSuggestions(suggestions);
      if (!suggestions.length) {
        setAddressLookupError('Please enter a valid address.');
      }
    } catch (lookupError) {
      console.error('Address lookup error:', lookupError);
      setAddressSuggestions([]);
      setAddressLookupError('Please enter a valid address.');
    } finally {
      setIsAddressLookupLoading(false);
    }
  };

  const handleAddressLookupChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setAddressQuery(value);
    setAddressLookupError('');

    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
    }

    if (value.trim().length < 3) {
      setAddressSuggestions([]);
      setIsAddressLookupLoading(false);
      return;
    }

    addressDebounceRef.current = setTimeout(() => {
      void searchAddress(value);
    }, 300);
  };

  const applyAddressSuggestion = async (suggestion: AddressSuggestion) => {
    setAddressLookupError('');
    setAddressSuggestions([]);
    setAddressQuery(suggestion.display);

    if (suggestion.source === 'nominatim') {
      setDraft((prev) => ({
        ...prev,
        street: suggestion.street || prev.street,
        city: suggestion.city || prev.city,
        state: suggestion.state || prev.state || 'GA',
        zipCode: suggestion.zipCode || prev.zipCode
      }));
      return;
    }

    try {
      await ensureGooglePlacesReady();
      const googleObj = (window as any).google;
      const details: any = await new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(
          () => reject(new Error('Address details request timed out.')),
          8000
        );
        placesServiceRef.current.getDetails(
          {
            placeId: suggestion.placeId,
            fields: ['formatted_address', 'address_components']
          },
          (result: any, status: any) => {
            window.clearTimeout(timeoutId);
            if (status !== googleObj.maps.places.PlacesServiceStatus.OK || !result) {
              reject(new Error('Unable to load full address details.'));
              return;
            }
            resolve(result);
          }
        );
      });

      const components = details.address_components || [];
      const streetNumber = getAddressComponent(components, 'street_number');
      const route = getAddressComponent(components, 'route');
      const street = [streetNumber, route].filter(Boolean).join(' ').trim();
      const city = getCityFromComponents(components);
      const state = getAddressComponent(components, 'administrative_area_level_1', true).toUpperCase();
      const zipCode = getAddressComponent(components, 'postal_code');

      setDraft((prev) => ({
        ...prev,
        street: street || prev.street,
        city: city || prev.city,
        state: ALLOWED_STATES.has(state) ? state : prev.state || 'GA',
        zipCode: zipCode || prev.zipCode
      }));
      setAddressQuery(details.formatted_address || suggestion.display);
    } catch (lookupError) {
      console.error('Address detail lookup error:', lookupError);
      setAddressLookupError('Please enter a valid address.');
    }
  };

  const handleSubmit = async () => {
    if (!selectedProgram || !selectedDate || !selectedSlot) return;
    const fullAddress = `${draft.street}, ${draft.city}, ${draft.state} ${draft.zipCode}`;
    const data: BookingData = {
      typeOfProgram: selectedProgram.name,
      date: toDateKey(selectedDate),
      time: slotLabel(selectedSlot),
      name: draft.name!.trim(),
      email: draft.email!.trim(),
      phoneNumber: draft.phoneNumber!.replace(/\D/g, ''),
      street: draft.street!.trim(),
      city: draft.city!.trim(),
      state: draft.state!.trim().toUpperCase(),
      zipCode: draft.zipCode!.trim(),
      fullAddress,
      occasion: draft.occasion!.trim(),
      additionalNotes: draft.additionalNotes?.trim() || ''
    };

    await onSubmitBooking(data, selectedProgram, selectedDate, selectedSlot);
  };

  const addAssistantPrompt = (content: string) => {
    setMessages((prev) => {
      if (prev[prev.length - 1]?.role === 'assistant' && prev[prev.length - 1]?.content === content) {
        return prev;
      }
      return [...prev, { role: 'assistant', content }];
    });
  };

  const startEditSection = (section: Exclude<EditSection, null>) => {
    setIsActivePanelSuppressed(false);
    setActiveEditSection(section);
    setError('');
    setAddressLookupError('');
    if (section === 'date') {
      addAssistantPrompt('Update the date below, choose an available time for that date, then press Save Date and Time.');
    } else if (section === 'time') {
      addAssistantPrompt('Choose a new available time below, then press Save Time.');
    } else if (section === 'host') {
      addAssistantPrompt('Update the host name below, then press Continue.');
    } else if (section === 'contact') {
      addAssistantPrompt('Update the email or phone number below, then press Continue.');
    } else if (section === 'address') {
      addAssistantPrompt('Update the host address below, then press Continue.');
    } else if (section === 'occasion') {
      addAssistantPrompt('Update the occasion below, then press Continue.');
    } else {
      addAssistantPrompt('Update the additional notes below, then press Continue.');
    }
  };

  const renderReservationDetails = (reservation: ReservationDetails) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl bg-[#2E3192]/5 p-4">
        <strong>Program:</strong> {reservation.programType}
      </div>
      <div className="rounded-xl bg-[#2E3192]/5 p-4">
        <strong>Confirmation:</strong> {reservation.confirmationNumber}
      </div>
      <div className="rounded-xl bg-[#2E3192]/5 p-4">
        <strong>Date:</strong> {formatDateLong(parseDateKey(reservation.date) || new Date(`${reservation.date}T00:00:00`))}
      </div>
      <div className="rounded-xl bg-[#2E3192]/5 p-4">
        <strong>Time:</strong> {reservation.time || 'Not listed'}
      </div>
      <div className="rounded-xl bg-[#2E3192]/5 p-4 md:col-span-2">
        <strong>Email:</strong> {reservation.email}
      </div>
    </div>
  );

  const renderReservationManagementPanel = () => {
    if (!isReservationManagementActive) return null;
    if (reservationResultMessage) return null;

    if (!managedReservation) {
      return (
        <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
          <h3 className="text-xl font-bold text-[#2E3192] serif mb-2">Find Your Booking</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enter the confirmation number for the booking you want to edit or cancel.
          </p>
          <input
            value={reservationConfirmation}
            onChange={(event) => {
              setReservationConfirmation(event.target.value.replace(/\D/g, '').slice(0, 12));
              setReservationError('');
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
            placeholder="Confirmation number"
            inputMode="numeric"
          />
          {reservationError && (
            <p className="mt-3 text-sm font-semibold text-amber-700">{reservationError}</p>
          )}
          <button
            type="button"
            onClick={handleReservationConfirmationContinue}
            disabled={isThinking || isReservationWorking || !reservationConfirmation.trim()}
            className="mt-4 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all disabled:opacity-60"
          >
            Find Booking
          </button>
        </div>
      );
    }

    if (!reservationAction) {
      return (
        <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
          <h3 className="text-xl font-bold text-[#2E3192] serif mb-3">Manage Booking</h3>
          {renderReservationDetails(managedReservation)}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => handleReservationActionSelect('edit')}
              className="flex-1 px-6 py-3 rounded-xl bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all"
            >
              Edit Date or Time
            </button>
            <button
              type="button"
              onClick={() => handleReservationActionSelect('cancel')}
              className="flex-1 px-6 py-3 rounded-xl border border-red-200 text-red-700 font-bold hover:bg-red-50 transition-all"
            >
              Cancel Booking
            </button>
          </div>
        </div>
      );
    }

    if (reservationAction === 'cancel') {
      return (
        <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
          <h3 className="text-xl font-bold text-[#2E3192] serif mb-3">Confirm Cancellation</h3>
          {renderReservationDetails(managedReservation)}
          <p className="mt-4 text-sm text-gray-600">
            This will cancel the booking above. This action should only be submitted if you are sure.
          </p>
          {reservationError && (
            <p className="mt-3 text-sm font-semibold text-amber-700">{reservationError}</p>
          )}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleReservationCancelSubmit}
              disabled={isThinking || isReservationWorking}
              className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all disabled:opacity-60"
            >
              {isReservationWorking ? 'Cancelling...' : 'Cancel This Booking'}
            </button>
            <button
              type="button"
              onClick={handleReservationReset}
              disabled={isReservationWorking}
              className="px-6 py-3 rounded-xl border border-[#2E3192] text-[#2E3192] font-bold hover:bg-[#2E3192]/5 disabled:opacity-60"
            >
              Keep Booking
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
        <h3 className="text-xl font-bold text-[#2E3192] serif mb-3">Edit Date and Time</h3>
        {renderReservationDetails(managedReservation)}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">New Date</label>
            {managedProgram && (
              <CalendarView
                programId={managedProgram.id}
                onSelectDate={(date) => {
                  setReservationEditDraft({ date: toDateKey(date), slotLabel: '' });
                  setReservationError('');
                }}
                selectedDate={reservationEditDate}
                bookedDates={reservationCalendarBookedDates}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Selected Time</label>
            <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 min-h-[50px]">
              {selectedReservationEditSlot ? slotLabel(selectedReservationEditSlot) : 'Choose a time below'}
            </div>
          </div>
        </div>
        {reservationScheduleMessage && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm font-semibold">
            {reservationScheduleMessage}
          </div>
        )}
        {reservationEditSlots.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {reservationEditSlots.map((slot) => {
              const label = slotLabel(slot);
              const isSelected = selectedReservationEditSlot && slotLabel(selectedReservationEditSlot) === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setReservationEditDraft((prev) => ({ ...prev, slotLabel: label }));
                    setReservationError('');
                  }}
                  className={`px-4 py-3 rounded-lg text-left border transition-all ${
                    isSelected
                      ? 'border-[#2E3192] bg-[#2E3192] text-white'
                      : 'border-gray-200 bg-white hover:border-[#FFCC00] hover:bg-[#FFCC00]/10'
                  }`}
                >
                  <span className="block font-bold">{label}</span>
                  <span className={`block text-xs ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                    {slot.period} - {slot.durationLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {reservationError && (
          <p className="mt-3 text-sm font-semibold text-amber-700">{reservationError}</p>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleReservationEditSubmit}
            disabled={isThinking || isReservationWorking || Boolean(reservationScheduleMessage) || !selectedReservationEditSlot}
            className="flex-1 px-6 py-3 rounded-xl bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all disabled:opacity-60"
          >
            {isReservationWorking ? 'Updating...' : 'Submit Update'}
          </button>
          <button
            type="button"
            onClick={handleReservationReset}
            disabled={isReservationWorking}
            className="px-6 py-3 rounded-xl border border-[#2E3192] text-[#2E3192] font-bold hover:bg-[#2E3192]/5 disabled:opacity-60"
          >
            Keep Current Booking
          </button>
        </div>
      </div>
    );
  };

  const renderContactPanel = () => {
    const isHostEdit = activeEditSection === 'host';
    const isContactEdit = activeEditSection === 'contact';
    const hasValidName = Boolean(draft.name?.trim());
    const hasValidEmail = Boolean(draft.email?.trim() && EMAIL_REGEX.test(draft.email.trim()));
    const hasValidPhone = Boolean(draft.phoneNumber?.replace(/\D/g, '').match(/^\d{10}$/));
    const canContinue =
      isHostEdit
        ? hasValidName
        : isContactEdit
          ? hasValidEmail && hasValidPhone
          : getContactComplete(draft);

    return (
      <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
        <h3 className="text-xl font-bold text-[#2E3192] serif mb-2">
          {isHostEdit ? 'Host Name' : isContactEdit ? 'Email and Phone' : 'Host Contact'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {isHostEdit
            ? 'Update the host name.'
            : isContactEdit
              ? 'Update the email address or phone number.'
              : 'Please enter all three contact details.'}
        </p>
        <div className={`grid grid-cols-1 gap-3 ${isHostEdit ? '' : 'md:grid-cols-2'} ${!isHostEdit && !isContactEdit ? 'md:grid-cols-3' : ''}`}>
          {!isContactEdit && (
            <input
              value={draft.name || ''}
              onChange={(event) => updateDraftField('name', event.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
              placeholder="Full name"
            />
          )}
          {!isHostEdit && (
            <>
              <input
                value={draft.email || ''}
                onChange={(event) => updateDraftField('email', event.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
                placeholder="Email address"
              />
              <input
                value={draft.phoneNumber || ''}
                onChange={(event) => updateDraftField('phoneNumber', event.target.value.replace(/\D/g, '').slice(0, 10))}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
                placeholder="Phone number"
                inputMode="numeric"
              />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleContactContinue}
          disabled={isThinking || !canContinue}
          className="mt-4 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    );
  };

  const renderAddressPanel = () => (
    <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
      <h3 className="text-xl font-bold text-[#2E3192] serif mb-2">Host Address</h3>
      <div className="relative mb-4">
        <input
          type="text"
          value={addressQuery}
          onChange={handleAddressLookupChange}
          className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent border-gray-300"
          placeholder="Type at least 3 characters to search address"
          autoComplete="off"
        />
        {isAddressLookupLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Searching...</div>
        )}
        {addressSuggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {addressSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.placeId}-${index}`}
                type="button"
                onClick={() => applyAddressSuggestion(suggestion)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                {suggestion.display}
              </button>
            ))}
          </div>
        )}
      </div>
      {addressLookupError && (
        <p className="mb-3 text-xs text-amber-700 font-semibold">{addressLookupError}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <input
          value={draft.street || ''}
          onChange={(event) => updateDraftField('street', event.target.value)}
          className="md:col-span-6 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
          placeholder="Street address"
        />
        <input
          value={draft.city || ''}
          onChange={(event) => updateDraftField('city', event.target.value)}
          className="md:col-span-3 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
          placeholder="City"
        />
        <select
          value={draft.state || 'GA'}
          onChange={(event) => updateDraftField('state', event.target.value)}
          className="md:col-span-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192]"
        >
          {Array.from(ALLOWED_STATES).map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        <input
          value={draft.zipCode || ''}
          onChange={(event) => updateDraftField('zipCode', event.target.value)}
          className="md:col-span-2 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
          placeholder="Zip code"
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Powered by Google Places with local fallback search. Select a suggestion to auto-fill street, city, state, and zip.
      </p>
      <button
        type="button"
        onClick={handleAddressContinue}
        disabled={isThinking || !getAddressComplete(draft)}
        className="mt-4 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all disabled:opacity-60"
      >
        Continue
      </button>
    </div>
  );

  const renderOccasionPanel = () => {
    const isOccasionEdit = activeEditSection === 'occasion';
    const isNotesEdit = activeEditSection === 'notes';
    const canContinue = isNotesEdit || Boolean(draft.occasion?.trim());

    return (
      <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
        <h3 className="text-xl font-bold text-[#2E3192] serif mb-2">
          {isOccasionEdit ? 'Occasion' : isNotesEdit ? 'Additional Notes' : 'Occasion and Notes'}
        </h3>
        <div className="space-y-3">
          {!isNotesEdit && (
            <input
              value={draft.occasion || ''}
              onChange={(event) => updateDraftField('occasion', event.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
              placeholder="Occasion, e.g. birthday, anniversary, housewarming"
            />
          )}
          {!isOccasionEdit && (
            <textarea
              value={draft.additionalNotes || ''}
              onChange={(event) => updateDraftField('additionalNotes', event.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2E3192] focus:border-transparent"
              placeholder="Any additional notes for the organizers"
            />
          )}
        </div>
        <button
          type="button"
          onClick={handleOccasionContinue}
          disabled={isThinking || !canContinue}
          className="mt-4 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    );
  };

  const handleScheduleSave = () => {
    if (!selectedProgram || !selectedDate || !selectedSlot) {
      setError('Please choose an eligible date and time before saving.');
      return;
    }
    const sectionLabel = activeEditSection === 'time' ? 'time' : 'date and time';
    setActiveEditSection(null);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        role: 'user',
        content: `Updated ${sectionLabel} to ${formatDateLong(selectedDate)} at ${slotLabel(selectedSlot)}.`
      },
      { role: 'assistant', content: `${sectionLabel[0].toUpperCase()}${sectionLabel.slice(1)} updated. Please review the booking again.` }
    ]);
  };

  const renderScheduleEditPanel = () => {
    const isTimeOnly = activeEditSection === 'time';

    return (
      <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
        <h3 className="text-xl font-bold text-[#2E3192] serif mb-3">
          {isTimeOnly ? 'Edit Time' : 'Edit Date'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Date</label>
            {isTimeOnly ? (
              <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 min-h-[50px]">
                {selectedDate ? formatDateLong(selectedDate) : 'Choose a date'}
              </div>
            ) : (
              selectedProgram && (
                <CalendarView
                  programId={selectedProgram.id}
                  onSelectDate={handleAiDateSelect}
                  selectedDate={selectedDate}
                  bookedDates={aiCalendarBookedDates}
                  initialMonthDate={aiCalendarInitialMonth}
                />
              )
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Selected Time</label>
            <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 min-h-[50px]">
              {selectedSlot ? slotLabel(selectedSlot) : 'Choose a time below'}
            </div>
          </div>
        </div>
        {scheduleMessage ? (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm font-semibold">
            {scheduleMessage}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableSlots.map((slot) => {
              const label = slotLabel(slot);
              const isSelected = selectedSlot && slotLabel(selectedSlot) === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => updateDraftField('slotLabel', label)}
                  className={`px-4 py-3 rounded-lg text-left border transition-all ${
                    isSelected
                      ? 'border-[#2E3192] bg-[#2E3192] text-white'
                      : 'border-gray-200 bg-white hover:border-[#FFCC00] hover:bg-[#FFCC00]/10'
                  }`}
                >
                  <span className="block font-bold">{label}</span>
                  <span className={`block text-xs ${isSelected ? 'text-indigo-100' : 'text-gray-500'}`}>
                    {slot.period} - {slot.durationLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleScheduleSave}
            disabled={isThinking || Boolean(scheduleMessage) || !selectedSlot}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2E3192] text-white font-bold hover:bg-indigo-900 transition-all disabled:opacity-60"
          >
            {isTimeOnly ? 'Save Time' : 'Save Date and Time'}
          </button>
          <button
            type="button"
            onClick={() => setActiveEditSection(null)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#2E3192] text-[#2E3192] font-bold hover:bg-[#2E3192]/5"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const renderSummaryTile = (
    label: string,
    value: React.ReactNode,
    editSection: Exclude<EditSection, null>,
    className = ''
  ) => (
    <div className={`rounded-xl bg-[#2E3192]/5 p-4 flex items-start justify-between gap-3 ${className}`}>
      <div>
        <strong>{label}:</strong> {value}
      </div>
      <button
        type="button"
        onClick={() => startEditSection(editSection)}
        className="shrink-0 rounded-lg border border-[#2E3192]/20 bg-white px-3 py-1 text-xs font-bold text-[#2E3192] hover:bg-[#2E3192]/5"
      >
        Edit
      </button>
    </div>
  );

  const renderReviewCard = () => {
    if (!selectedProgram || !selectedDate || !selectedSlot) return null;
    const imageSrc = selectedProgram.imageUrl ? resolvePublicAssetUrl(selectedProgram.imageUrl) : '';
    return (
      <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-lg overflow-hidden">
        {imageSrc && (
          <img
            src={imageSrc}
            alt={selectedProgram.name}
            className="w-full h-64 object-cover"
          />
        )}
        <div className="p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h3 className="text-3xl font-bold text-[#2E3192] serif">{selectedProgram.name}</h3>
              <p className="mt-2 text-gray-600">{selectedProgram.description}</p>
            </div>
            <div className="rounded-xl bg-[#FFCC00]/20 border border-[#FFCC00]/40 px-4 py-3 text-sm font-bold text-[#2E3192]">
              {selectedProgram.donationAmount || 'Donation appreciated'}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {renderSummaryTile('Date', formatDateLong(selectedDate), 'date')}
            {renderSummaryTile('Time', slotLabel(selectedSlot), 'time')}
            {renderSummaryTile('Host', draft.name, 'host')}
            {renderSummaryTile('Contact', `${draft.email} / ${draft.phoneNumber}`, 'contact')}
            {renderSummaryTile(
              'Address',
              `${draft.street}, ${draft.city}, ${draft.state} ${draft.zipCode}`,
              'address',
              'md:col-span-2'
            )}
            {renderSummaryTile('Occasion', draft.occasion, 'occasion')}
            {renderSummaryTile('Notes', draft.additionalNotes || 'None', 'notes')}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex-1 px-6 py-4 bg-[#2E3192] text-white rounded-xl font-bold hover:bg-indigo-900 transition-all shadow-lg disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting...' : 'Everything Looks Good - Submit Request'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderSlotPanel = () => (
    <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
      <h3 className="text-xl font-bold text-[#2E3192] serif mb-3">Choose a Time</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {availableSlots.map((slot) => (
          <button
            key={slotLabel(slot)}
            type="button"
            onClick={() => handleSlotChoice(slot)}
            disabled={isThinking}
            className="px-4 py-3 rounded-lg text-left border border-gray-200 bg-white hover:border-[#FFCC00] hover:bg-[#FFCC00]/10 transition-all disabled:opacity-60"
          >
            <span className="block font-bold">{slotLabel(slot)}</span>
            <span className="block text-xs text-gray-500">{slot.period} - {slot.durationLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderProgramDatePanel = () => {
    if (!selectedProgram) return null;

    return (
      <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 md:p-5">
        <h3 className="text-xl font-bold text-[#2E3192] serif mb-2">Choose a Date</h3>
        <p className="mb-4 text-sm text-gray-600">
          Select an eligible date for {selectedProgram.name}. I will show available times after you pick a date.
        </p>
        <CalendarView
          programId={selectedProgram.id}
          onSelectDate={handleAiDateSelect}
          selectedDate={selectedDate}
          bookedDates={aiCalendarBookedDates}
          initialMonthDate={aiCalendarInitialMonth}
        />
      </div>
    );
  };

  const renderMessageContent = (content: string) => {
    const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

    return (
      <div className="space-y-3">
        {blocks.map((block, blockIndex) => {
          const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
          const isBulletList = lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line));

          if (isBulletList) {
            return (
              <ul key={`block-${blockIndex}`} className="space-y-2">
                {lines.map((line, lineIndex) => {
                  const cleanLine = line.replace(/^[-*]\s+/, '');
                  const [label, ...rest] = cleanLine.split(':');
                  return (
                    <li key={`line-${lineIndex}`} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFCC00]"></span>
                      <span>
                        {rest.length > 0 ? (
                          <>
                            <strong className="text-[#2E3192]">{label}:</strong>
                            {rest.join(':')}
                          </>
                        ) : (
                          cleanLine
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            );
          }

          return (
            <p key={`block-${blockIndex}`}>
              {lines.map((line, lineIndex) => (
                <React.Fragment key={`line-${lineIndex}`}>
                  {lineIndex > 0 && <br />}
                  {line}
                </React.Fragment>
              ))}
            </p>
          );
        })}
      </div>
    );
  };

  const renderActiveChatPanel = () => {
    if (isActivePanelSuppressed) return null;
    const reservationPanel = renderReservationManagementPanel();
    if (reservationPanel) return reservationPanel;
    if (activeEditSection === 'date' || activeEditSection === 'time') return renderScheduleEditPanel();
    if (activeEditSection === 'host' || activeEditSection === 'contact') return renderContactPanel();
    if (activeEditSection === 'address') return renderAddressPanel();
    if (activeEditSection === 'occasion' || activeEditSection === 'notes') return renderOccasionPanel();
    if (scheduleMessage) return null;
    if (effectiveFlowStep === 'program-date' && selectedProgram && !selectedDate) return renderProgramDatePanel();
    if (effectiveFlowStep === 'slot') return renderSlotPanel();
    if (effectiveFlowStep === 'contact') return renderContactPanel();
    if (effectiveFlowStep === 'address') return renderAddressPanel();
    if (effectiveFlowStep === 'occasion') return renderOccasionPanel();
    if (effectiveFlowStep === 'review') return renderReviewCard();
    return null;
  };

  const activeChatPanel = renderActiveChatPanel();
  const hasUserStartedChat = messages.some((message) => message.role === 'user');
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setHasMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <section
      className={`min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7f7fb_48%,#f3f4f8_100%)] transition-all duration-700 ease-out ${
        hasMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.96)_0%,rgba(255,255,255,0.74)_20%,rgba(255,255,255,0)_42%),linear-gradient(112deg,#fde9bd_0%,#fff8e8_24%,#f6f8ff_52%,#bcd7ff_76%,#84b6ff_100%)]">
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_10%_78%,rgba(255,204,0,0.34)_0%,rgba(255,204,0,0)_30%),radial-gradient(circle_at_87%_76%,rgba(46,49,146,0.2)_0%,rgba(46,49,146,0)_34%)]"></div>
        <div className="absolute left-[-8rem] top-[-6rem] h-96 w-96 rounded-full border border-white/35 opacity-60"></div>
        <div className="absolute right-[-10rem] top-[-7rem] h-[30rem] w-[30rem] rounded-full border border-white/40 opacity-50"></div>
        <div className="absolute left-6 top-16 hidden md:block text-[12rem] leading-none text-white/30 serif rotate-[-18deg] select-none">
          &#10087;
        </div>
        <div className="absolute right-8 top-20 hidden md:block text-[13rem] leading-none text-white/25 serif rotate-[18deg] select-none">
          &#10087;
        </div>
        <div className="absolute left-0 bottom-0 hidden md:block h-48 w-[34rem] opacity-30">
          <div className="absolute bottom-0 left-0 h-20 w-full bg-[linear-gradient(180deg,rgba(209,137,50,0)_0%,rgba(209,137,50,0.4)_100%)]"></div>
          <div className="absolute bottom-10 left-10 h-28 w-16 bg-[#d18a32]/30 rounded-t-full"></div>
          <div className="absolute bottom-10 left-32 h-36 w-20 bg-[#d18a32]/25 rounded-t-full"></div>
          <div className="absolute bottom-10 left-60 h-24 w-14 bg-[#d18a32]/25 rounded-t-full"></div>
          <div className="absolute bottom-10 left-80 h-32 w-24 bg-[#d18a32]/20 rounded-t-full"></div>
        </div>
        <div className="absolute right-0 bottom-0 hidden md:block h-64 w-[35rem] opacity-30">
          <div className="absolute bottom-0 right-0 h-20 w-full bg-[linear-gradient(180deg,rgba(46,49,146,0)_0%,rgba(46,49,146,0.28)_100%)]"></div>
          <div className="absolute bottom-10 right-10 h-36 w-40 rounded-t-[5rem] border-t-[18px] border-x-[18px] border-[#2E3192]/30"></div>
          <div className="absolute bottom-12 right-28 h-28 w-28 rounded-t-full border-t-[14px] border-x-[14px] border-[#2E3192]/25"></div>
          <div className="absolute bottom-11 right-52 h-44 w-24 rounded-t-full border-t-[12px] border-x-[12px] border-[#2E3192]/20"></div>
          <div className="absolute bottom-44 right-24 h-10 w-10 rounded-full bg-[#2E3192]/20"></div>
          <div className="absolute bottom-36 right-64 h-8 w-8 rounded-full bg-[#2E3192]/18"></div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(247,247,251,0.84)_100%)]"></div>
        <div className="relative container mx-auto max-w-7xl px-4 min-h-[calc(100vh-88px)] py-5 md:py-6 flex flex-col">
          <button
            type="button"
            onClick={onBack}
            className="absolute top-5 right-4 md:right-6 z-20 px-4 md:px-5 py-2.5 md:py-3 rounded-2xl border border-white/60 bg-white/35 text-[#2E3192] font-bold shadow-sm backdrop-blur hover:bg-white/60 transition-all"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Programs
          </button>

          {hasUserStartedChat ? (
            <div
              ref={chatShellRef}
              className="flex-1 flex flex-col gap-4 md:gap-6 pt-16 md:pt-20 pb-44 md:pb-52 min-h-0"
            >
              <div className="flex-1 min-h-0 flex flex-col rounded-3xl bg-white/72 backdrop-blur-md border border-white/70 shadow-xl shadow-[#2E3192]/10 overflow-hidden">
                <div className="px-4 md:px-6 py-3 border-b border-white/60 bg-white/40 flex items-center gap-3 shrink-0">
                  <div className="h-10 w-10 rounded-full bg-[radial-gradient(circle_at_32%_24%,#3f69ff_0%,#18229b_46%,#070957_100%)] text-[#FFCC00] flex items-center justify-center shadow-md">
                    <span className="serif text-lg font-bold leading-none">{'\u0936\u094d\u0930\u0940'}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-[#11185f] serif text-lg leading-tight">Uddhav</h3>
                    <p className="text-xs text-[#6078d8] font-semibold truncate">{activeStepLabel}</p>
                  </div>
                </div>
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-5 space-y-4 min-h-0"
                >
                  {messages.map((message, index) => {
                    const isUserMessage = message.role === 'user';
                    return (
                      <div
                        key={`${message.role}-${index}`}
                        className={`flex items-end gap-3 ${isUserMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-2xl px-4 md:px-5 py-3 text-sm md:text-base leading-7 ${
                            isUserMessage
                              ? 'bg-[#2E3192] text-white rounded-br-md shadow-lg shadow-[#2E3192]/20'
                              : 'bg-white/95 text-gray-800 border border-white/80 rounded-bl-md shadow-sm'
                          }`}
                        >
                          {renderMessageContent(message.content)}
                        </div>
                      </div>
                    );
                  })}
                  {isThinking && (
                    <div className="flex items-end gap-3 justify-start">
                      <div className="rounded-2xl rounded-bl-md px-5 py-3 bg-white/95 border border-white/80 text-gray-500 shadow-sm flex items-center gap-3">
                        <span className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-[#2E3192] animate-pulse"></span>
                          <span className="h-2 w-2 rounded-full bg-[#2E3192] animate-pulse [animation-delay:120ms]"></span>
                          <span className="h-2 w-2 rounded-full bg-[#2E3192] animate-pulse [animation-delay:240ms]"></span>
                        </span>
                        <span className="text-sm font-semibold">Thinking</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 max-h-[45vh] flex flex-col rounded-3xl bg-white/72 backdrop-blur-md border border-white/70 shadow-xl shadow-[#2E3192]/10 p-4 md:p-5 overflow-y-auto custom-scrollbar">
                <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Action panel</p>
                    <h3 className="text-xl font-bold text-[#2E3192] serif">{activeStepLabel}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-[#FFCC00]/25 text-[#2E3192] flex items-center justify-center">
                    <i className="fas fa-list-check"></i>
                  </div>
                </div>
                {!isThinking && activeChatPanel ? (
                  activeChatPanel
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#2E3192]/20 bg-white/60 p-5 text-sm text-gray-600">
                    <p className="font-bold text-[#2E3192]">Tell Uddhav what you need.</p>
                    <p className="mt-2">Structured controls will appear here once a program, booking lookup, or next step is ready.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center pb-16 md:pb-18">
              <div className="relative mb-3 h-16 w-16 md:h-20 md:w-20 rounded-full bg-[radial-gradient(circle_at_32%_24%,#3f69ff_0%,#18229b_46%,#070957_100%)] text-[#FFCC00] flex items-center justify-center shadow-[0_0_0_8px_rgba(255,255,255,0.34),0_0_42px_rgba(255,204,0,0.62)]">
                <div className="absolute inset-[-1.35rem] rounded-full border border-[#FFCC00]/25"></div>
                <div className="absolute inset-[-2.25rem] rounded-full border border-white/30"></div>
                <span className="serif text-2xl md:text-3xl font-bold leading-none">
                  {'\u0936\u094d\u0930\u0940'}
                </span>
                <span className="absolute -right-1 top-4 h-8 w-4 rotate-[28deg] rounded-full border-2 border-[#FFCC00] bg-[radial-gradient(circle_at_50%_35%,#2E3192_0%,#2E3192_24%,#1fc1a5_25%,#1fc1a5_42%,#FFCC00_43%,#FFCC00_58%,transparent_59%)]"></span>
              </div>
              <h2 className="relative text-6xl md:text-7xl lg:text-8xl font-bold text-[#11185f] serif leading-none tracking-normal">
                Uddhav
                <span className="absolute -right-7 md:-right-10 top-1/2 hidden sm:block h-16 w-8 md:h-20 md:w-10 -translate-y-1/2 rotate-[25deg] rounded-full border-[3px] border-[#c79317] bg-[radial-gradient(circle_at_50%_34%,#2E3192_0%,#2E3192_22%,#29bba5_23%,#29bba5_42%,#FFCC00_43%,#FFCC00_56%,transparent_57%)]"></span>
              </h2>
              <div className="mt-3 flex items-center justify-center gap-3 text-[#d3a83d]">
                <span className="h-px w-28 bg-[#d3a83d]/70"></span>
                <i className="fas fa-spa text-sm"></i>
                <span className="h-px w-28 bg-[#d3a83d]/70"></span>
              </div>
              <p className="mt-4 max-w-4xl text-2xl md:text-[1.9rem] lg:text-[2.15rem] leading-tight font-semibold text-[#11185f]">
                Radhe Radhe! My name is Uddhav.<br />
                I am pleased to be able to assist you today in<br className="hidden md:block" />
                booking a home program with Atlanta Namadwaar!<br />
                Shall we get started?
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-3xl">
                {quickPrompts.map((prompt) => (
                  <button
                    type="button"
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isThinking}
                    className="px-3.5 py-2 rounded-full bg-white/60 backdrop-blur text-[#11185f] text-xs md:text-sm font-bold border border-white/70 hover:bg-[#2E3192] hover:text-white hover:border-[#2E3192] transition-all disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="absolute left-1/2 bottom-6 md:bottom-10 z-10 w-[min(70rem,78vw)] -translate-x-1/2 rounded-[2rem] md:rounded-[3rem] border-[10px] border-white/70 bg-white/72 px-6 py-5 md:px-11 md:py-7 shadow-[0_18px_70px_rgba(46,49,146,0.18)] backdrop-blur-md"
          >
            <div className="flex items-center gap-4 md:gap-7">
              <div className="relative h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-[radial-gradient(circle_at_32%_24%,#3f69ff_0%,#18229b_46%,#070957_100%)] text-[#FFCC00] flex items-center justify-center shadow-[0_0_0_4px_rgba(255,204,0,0.18)]">
                <span className="serif text-xl md:text-2xl font-bold">{'\u0936\u094d\u0930\u0940'}</span>
              </div>
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    const hadText = Boolean(input.trim());
                    void handleSend();
                    if (hadText) scrollToChat();
                  }
                }}
                disabled={isThinking}
                placeholder="Type your message..."
                className="flex-1 min-w-0 bg-transparent text-base md:text-xl text-gray-800 placeholder:text-gray-400 focus:outline-none disabled:opacity-60"
                aria-label="Type your message"
              />
              <button
                type="button"
                onClick={() => {
                  const hadText = Boolean(input.trim());
                  void handleSend();
                  if (hadText) scrollToChat();
                }}
                disabled={isThinking || !input.trim()}
                className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-[#e6e8ff] text-[#6078d8] flex items-center justify-center hover:bg-[#2E3192] hover:text-white transition-all disabled:opacity-40 disabled:hover:bg-[#e6e8ff] disabled:hover:text-[#6078d8]"
                aria-label="Send message"
              >
                <i className="fas fa-paper-plane text-lg"></i>
              </button>
            </div>
          </div>
        </div>

      </div>

    </section>
  );
};

export default AiBookingAgent;
