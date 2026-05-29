export type {
  DevotionalProgram,
  ProgramChecklist,
  TimeSlot,
  BookingData,
  BookingRecord,
  ReservationLookupData,
  ReservationDetails,
  BookingSubmitResult
} from '@shared/types';

export enum Page {
  HOME = 'home',
  BOOKING_CALENDAR = 'booking_calendar',
  BOOKING_FORM = 'booking_form',
  BOOKING_PROCESSING = 'booking_processing',
  BOOKING_FAILED = 'booking_failed',
  AI_BOOKING = 'ai_booking',
  SUCCESS = 'success',
  INSTRUCTIONS = 'instructions',
  RESERVATION_CONFIRMATION = 'reservation_confirmation',
  RESERVATION_OPTIONS = 'reservation_options',
  RESERVATION_LOOKUP = 'reservation_lookup',
  RESERVATION_EDIT = 'reservation_edit',
  RESERVATION_RESULT = 'reservation_result'
}

export interface FormErrors {
  [key: string]: string;
}
