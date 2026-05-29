import Constants from 'expo-constants';
import { createBookingApiClient, DEFAULT_API_BASE } from '../../../../packages/shared/src';

const envApiBase = process.env.EXPO_PUBLIC_API_BASE;
const extraApiBase = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiBase;
const apiBase = envApiBase || extraApiBase || DEFAULT_API_BASE;

export const bookingApiClient = createBookingApiClient({ apiBase, fetchImpl: fetch });

export const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  ((Constants.expoConfig?.extra as Record<string, string> | undefined)?.googleMapsApiKey ?? '');
