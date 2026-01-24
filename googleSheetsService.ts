
import { BookingData } from '../types';

export const submitToGoogleSheets = async (url: string, data: BookingData): Promise<boolean> => {
  try {
    const payload = {
      typeOfProgram: data.typeOfProgram,
      date: data.date,
      name: data.name,
      email: data.email,
      phoneNumber: data.phoneNumber,
      fullAddress: data.fullAddress,
      occasion: data.occasion,
      additionalNotes: data.additionalNotes,
      timestamp: new Date().toLocaleString()
    };
    
    // We send as a POST to the Web App URL. 
    // mode: 'no-cors' is common for Apps Script endpoints to bypass cross-origin restrictions on simple POSTs.
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
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
