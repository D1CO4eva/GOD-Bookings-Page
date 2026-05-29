import { createBookingApiClient } from '@shared/apiClient';
import type {
  ReservationLookupResult,
  UpdateReservationPayload
} from '@shared/apiClient';
import { BookingData, BookingRecord, ReservationLookupData } from '../types';
import { DEFAULT_API_BASE } from '@shared/programCatalog';
import type { BookingSubmitResult } from '@shared/types';

const normalizeApiBase = (value: string) => value.replace(/\/+$/, '');
const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE || DEFAULT_API_BASE);

const bookingApiClient = createBookingApiClient({ apiBase: API_BASE, fetchImpl: fetch });

export type { BookingSubmitResult };

export const submitToGoogleSheets = async (data: BookingData): Promise<BookingSubmitResult> => {
  return bookingApiClient.submitBooking(data);
};

export const fetchBookings = async (): Promise<BookingRecord[]> => {
  return bookingApiClient.fetchBookings();
};

export const verifyReservation = async (
  lookup: ReservationLookupData
): Promise<ReservationLookupResult> => {
  return bookingApiClient.verifyReservation(lookup);
};

export const updateReservation = async (
  payload: UpdateReservationPayload
): Promise<{ success: boolean; message?: string }> => {
  return bookingApiClient.updateReservation(payload);
};

export const cancelReservation = async (
  lookup: ReservationLookupData
): Promise<{ success: boolean; message?: string }> => {
  return bookingApiClient.cancelReservation(lookup);
};
