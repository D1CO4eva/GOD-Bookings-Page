export interface ProgramChecklist {
  label?: string;
  href: string;
}

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

export interface BookingSubmitResult {
  success: boolean;
  status: number | null;
  message?: string;
}
