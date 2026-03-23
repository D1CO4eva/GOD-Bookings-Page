import { Page } from '../types';

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '');

const buildRoutePath = (segment: string): string => {
  if (!segment) return `${BASE_PATH}/`;
  return `${BASE_PATH}/${segment}`;
};

export const getPathForPage = (
  page: Page,
  reservationMode: 'edit' | 'cancel' | null
): string => {
  switch (page) {
    case Page.BOOKING_CALENDAR:
      return buildRoutePath('datepicker');
    case Page.BOOKING_FORM:
      return buildRoutePath('hostdetails');
    case Page.BOOKING_PROCESSING:
      return buildRoutePath('bookingprocessing');
    case Page.SUCCESS:
      return buildRoutePath('bookingconfirmed');
    case Page.BOOKING_FAILED:
      return buildRoutePath('bookingfailed');
    case Page.RESERVATION_CONFIRMATION:
      return buildRoutePath('confirmationnumber');
    case Page.RESERVATION_OPTIONS:
      return buildRoutePath('reservationaction');
    case Page.RESERVATION_EDIT:
      return buildRoutePath('reservationedit');
    case Page.RESERVATION_LOOKUP:
      return buildRoutePath('reservationcancel');
    case Page.RESERVATION_RESULT:
      return buildRoutePath(reservationMode === 'cancel' ? 'cancelconfirm' : 'editconfirm');
    case Page.HOME:
    case Page.INSTRUCTIONS:
    default:
      return buildRoutePath('');
  }
};

export const parsePathToPage = (
  pathname: string
): { page: Page; reservationMode: 'edit' | 'cancel' | null } => {
  const normalizedPath = pathname.replace(/\/+$/, '');
  const normalizedBase = BASE_PATH.replace(/\/+$/, '');
  if (!normalizedPath.startsWith(normalizedBase)) {
    return { page: Page.HOME, reservationMode: null };
  }

  const segment = normalizedPath.slice(normalizedBase.length).replace(/^\/+/, '');
  if (segment.startsWith('reservationaction')) {
    return { page: Page.RESERVATION_OPTIONS, reservationMode: null };
  }

  switch (segment) {
    case 'datepicker':
      return { page: Page.BOOKING_CALENDAR, reservationMode: null };
    case 'hostdetails':
      return { page: Page.BOOKING_FORM, reservationMode: null };
    case 'bookingprocessing':
      return { page: Page.BOOKING_PROCESSING, reservationMode: null };
    case 'bookingconfirmed':
      return { page: Page.SUCCESS, reservationMode: null };
    case 'bookingfailed':
      return { page: Page.BOOKING_FAILED, reservationMode: null };
    case 'confirmationnumber':
      return { page: Page.RESERVATION_CONFIRMATION, reservationMode: null };
    case 'reservationedit':
      return { page: Page.RESERVATION_EDIT, reservationMode: 'edit' };
    case 'reservationcancel':
      return { page: Page.RESERVATION_LOOKUP, reservationMode: 'cancel' };
    case 'editconfirm':
      return { page: Page.RESERVATION_RESULT, reservationMode: 'edit' };
    case 'cancelconfirm':
      return { page: Page.RESERVATION_RESULT, reservationMode: 'cancel' };
    default:
      return { page: Page.HOME, reservationMode: null };
  }
};
