export interface DevotionalProgram {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  videoUrl?: string;
  donationAmount?: string;
  imageUrl?: string;
  checklist?: ProgramChecklist;
}

export interface ProgramChecklist {
  label?: string;
  href: string;
}

export enum Page {
  HOME = 'home',
  BOOKING_CALENDAR = 'booking_calendar',
  BOOKING_FORM = 'booking_form',
  BOOKING_PROCESSING = 'booking_processing',
  BOOKING_FAILED = 'booking_failed',
  SUCCESS = 'success',
  INSTRUCTIONS = 'instructions',
  RESERVATION_CONFIRMATION = 'reservation_confirmation',
  RESERVATION_OPTIONS = 'reservation_options',
  RESERVATION_LOOKUP = 'reservation_lookup',
  RESERVATION_EDIT = 'reservation_edit',
  RESERVATION_RESULT = 'reservation_result'
}

export interface TimeSlot {
  start: string;
  end: string;
  durationLabel: string;
  period: 'Morning' | 'Evening';
}

export interface BookingData {
  typeOfProgram: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phoneNumber: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  fullAddress: string;
  occasion: string;
  additionalNotes: string;
}

export interface BookingRecord {
  date: string;
  type: string;
  time?: string;
  email?: string;
  confirmationNumber?: string;
  occasion?: string;
}

export interface ReservationLookupData {
  confirmationNumber: string;
  programType?: string;
  date?: string;
  time?: string;
  email?: string;
}
export interface ReservationDetails {
  programType: string;
  date: string;
  time: string;
  email: string;
  confirmationNumber: string;
  occasion?: string;
}

export interface FormErrors {
  [key: string]: string;
}
