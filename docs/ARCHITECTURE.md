# Architecture

## Tech Stack

- Runtime: Vite + React 19 + TypeScript
- Styling: Tailwind CDN classes + inline global CSS in `apps/web/index.html`
- API Integration: Fetch-based client in `apps/web/src/services/googleSheetsService.ts`
- Hosting base path: `/homebookings/` (configured in `vite.config.ts`)
- Shared core module: `packages/shared` (types, booking rules, API client, image manifest)
- Mobile app: Expo + React Native in `apps/mobile`

## High-Level Structure

- `apps/web/src/App.tsx`
  - Owns top-level UI state, page switching, booking/reservation flow orchestration, and modal visibility.
- `apps/web/src/components/`
  - Stateless/presentational blocks for header/footer/cards/modals/form/calendar.
- `apps/web/src/components/ai-booking/AiBookingAgent.tsx`
  - Prompt-based booking page that chats with the user, extracts booking details, validates requested program day/time against shared slot rules, collects required details through embedded chat controls, shows a final review card inside the transcript, and submits through the existing booking API path.
- `apps/web/src/services/googleSheetsService.ts`
  - Web adapter around shared `packages/shared` API client.
- `apps/web/src/services/openRouterService.ts`
  - AI booking proxy adapter used by the AI booking agent. It sends OpenAI/OpenRouter-style chat-completion payloads to the GOD Auth Service `/homebookings/ai-booking` endpoint; the browser does not hold the OpenRouter API key.
- `apps/web/src/utils/`
  - Web routing and asset helpers; date/program/slot helpers now re-export shared core utilities.
- `apps/web/src/constants.tsx`
  - Web export of shared program catalog/constants.
- `apps/web/src/types.ts`
  - Web page/form types plus re-exported shared domain types.
- `packages/shared/`
  - Shared API client, slot/date/program logic, availability helpers, generated image manifest, and domain types for web + mobile.
- `apps/mobile/`
  - Native mobile app screens for booking and reservation flows.

## State Model (`apps/web/src/App.tsx`)

Main state groups:

- Navigation state: `currentPage`, `reservationMode`
- Booking state: `selectedProgram`, `selectedDate`, `selectedSlot`, `isSubmitting`, `bookingSubmitError`
- AI booking state is owned by `AiBookingAgent`; the route opens with a full-height gradient Uddhav greeting page, then continues into the same chat transcript where that greeting is the first assistant message until a final review card is shown. Successful submits pass an explicit program/date/slot selection back to `App.tsx` and reuse the same final availability and booking submission logic as the manual form.
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

Custom route mapping is handled by `apps/web/src/utils/routeUtils.ts`:

- `getPathForPage(page, reservationMode)`
- `parsePathToPage(pathname)`

AI booking route:

- `/homebookings/bookwithai`

The app updates URL via `history.pushState` and listens to `popstate` to keep browser navigation in sync.

## Booking Rules

Rules are enforced by `apps/web/src/utils/slotUtils.ts` + `apps/web/src/App.tsx` checks:

- Program-specific allowed days and slot windows
- Full-day blocking for most programs
- Nama Bhiksha:
  - up to two slots per date
  - slot-level blocking
- Satsang:
  - blocks evening slots only on affected date
  - "Evening" blocking starts at 4:00 PM, so morning slots ending at 12:30 PM remain bookable

The AI booking page does not bypass these rules. It uses the same generated slot list, blocked-date state, Nama Bhiksha slot limits, and Satsang evening-blocking checks before a request can be submitted. It also reuses the reservation verify/update/delete service helpers for prompt-based edit and cancellation flows.

## Reservation Management

Flow:

1. User validates confirmation number.
2. App fetches reservation details via `GET /api/reservations/verify` with query parameters.
3. User chooses edit or cancel.
4. Edit path submits `/api/reservations/update`.
5. Cancel path submits `/api/reservations/delete`.

API response compatibility is handled defensively in service helpers to support multiple backend payload shapes.
