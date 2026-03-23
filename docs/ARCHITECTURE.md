# Architecture

## Tech Stack

- Runtime: Vite + React 19 + TypeScript
- Styling: Tailwind CDN classes + inline global CSS in `index.html`
- API Integration: Fetch-based client in `services/googleSheetsService.ts`
- Hosting base path: `/homebookings/` (configured in `vite.config.ts`)

## High-Level Structure

- `App.tsx`
  - Owns top-level UI state, page switching, booking/reservation flow orchestration, and modal visibility.
- `components/`
  - Stateless/presentational blocks for header/footer/cards/modals/form/calendar.
- `services/googleSheetsService.ts`
  - Centralized API client for booking create, booking fetch, reservation verify/update/cancel.
- `utils/`
  - Business helpers for slots, dates, routes, program normalization/rules, and asset URL resolution.
- `constants.tsx`
  - Program catalog and static constants (e.g., donation email).
- `types.ts`
  - Shared app domain types.

## State Model (`App.tsx`)

Main state groups:

- Navigation state: `currentPage`, `reservationMode`
- Booking state: `selectedProgram`, `selectedDate`, `selectedSlot`, `isSubmitting`, `bookingSubmitError`
- Booking availability state:
  - API-backed `bookings`
  - local optimistic blocks (`localBookedDates`, `localBookedSlots`)
- Reservation management state:
  - lookup fields
  - verification status
  - edit date/time fields
  - submission/result messages
- Modal state: donation modal and fundraiser event popup

Derived state uses `useMemo` for:

- blocked dates
- Nama Bhiksha slot occupancy
- Satsang date effects
- edit-mode availability (excluding currently verified reservation)

## Routing Model

Custom route mapping is handled by `utils/routeUtils.ts`:

- `getPathForPage(page, reservationMode)`
- `parsePathToPage(pathname)`

The app updates URL via `history.pushState` and listens to `popstate` to keep browser navigation in sync.

## Booking Rules

Rules are enforced by `utils/slotUtils.ts` + `App.tsx` checks:

- Program-specific allowed days and slot windows
- Full-day blocking for most programs
- Nama Bhiksha:
  - up to two slots per date
  - slot-level blocking
- Satsang:
  - blocks evening slots only on affected date

## Reservation Management

Flow:

1. User validates confirmation number.
2. App fetches reservation details via `GET /api/reservations/verify` with query parameters.
3. User chooses edit or cancel.
4. Edit path submits `/api/reservations/update`.
5. Cancel path submits `/api/reservations/delete`.

API response compatibility is handled defensively in service helpers to support multiple backend payload shapes.
