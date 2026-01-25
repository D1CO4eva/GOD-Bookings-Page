export interface DevotionalProgram {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  videoUrl?: string;
  donationAmount?: string;
  imageUrl?: string;
}

export enum Page {
  HOME = 'home',
  BOOKING_CALENDAR = 'booking_calendar',
  BOOKING_FORM = 'booking_form',
  SUCCESS = 'success',
  INSTRUCTIONS = 'instructions'
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

export interface FormErrors {
  [key: string]: string;
}
