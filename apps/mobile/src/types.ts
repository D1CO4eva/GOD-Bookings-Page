import { DevotionalProgram, ReservationDetails, TimeSlot } from '../../../packages/shared/src/types';

export type RootStackParamList = {
  Home: undefined;
  Calendar: undefined;
  BookingForm: undefined;
  BookingResult: { success: boolean; message?: string };
  ReservationLookup: undefined;
  ReservationOptions: undefined;
  ReservationEdit: undefined;
  ReservationResult: { success: boolean; message: string; mode: 'edit' | 'cancel' };
};

export interface BookingDraft {
  selectedProgram: DevotionalProgram | null;
  selectedDate: Date | null;
  selectedSlot: TimeSlot | null;
}

export interface ReservationDraft {
  details: ReservationDetails | null;
  mode: 'edit' | 'cancel' | null;
}
