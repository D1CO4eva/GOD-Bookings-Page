# Functional Flows

## Booking Flow

1. User opens home page and selects a program card.
2. App navigates to calendar page and shows valid dates for that program.
3. User selects a date; app generates valid slots via `generateSlots()`.
4. User selects a slot; app opens booking form.
5. User submits host/contact details.
6. App runs final availability checks against in-memory booking data.
7. App posts booking payload to `/api/bookings`.
8. On success:
  - app marks local date/slot as blocked to prevent immediate duplicate submissions
  - app navigates to success page
  - app refreshes booking records from API
9. On failure:
  - app navigates to booking-failed page and shows contact fallback.

## AI Booking Flow

1. User opens `/homebookings/bookwithai` from the header or home hero and sees a full-height gradient greeting page from Uddhav, the Namadwaar booking assistant.
2. The greeting says: "Radhe Radhe! My name is Uddhav. I am pleased to be able to assist you today in booking a home program with Atlanta Namadwaar! Shall we get started?"
3. User scrolls down or presses the start control to enter the chat; the same greeting appears as the first assistant message, so the conversation continues in one transcript.
4. User prompts the booking agent with a program question or booking request.
5. The app sends recent chat context, the current booking draft, today's date, and the local program catalog to the GOD Auth Service `/homebookings/ai-booking` proxy.
  - The proxy adds the server-side OpenRouter API key and forwards the request to OpenRouter.
6. The AI response is parsed as structured booking details plus a user-facing assistant message.
7. The React page merges extracted details into the in-progress booking draft and immediately validates program day/time eligibility locally.
  - Deterministic local parsing for program aliases, explicit dates, relative weekday phrases, times, email, phone, state, and zip code takes priority over model guesses.
  - Ambiguous phrases such as "next weekend" are treated as incomplete until the user chooses an exact date.
  - Earliest-date phrases such as "ASAP" or "next available" resolve to the next locally bookable date once a program is known.
  - Exact month/day booking requests, such as "Nama Bhiksha on July 18th," stay in the booking flow and are not handled as month-wide hosted-calendar questions.
  - Program schedule questions, such as "What days can I book Nama Ruchi on?", answer the program's allowed days without reusing any previously selected booking date.
  - Informational answers suppress stale booking controls so a prior date/time panel is not shown under the new answer.
8. If the requested program is not offered on that date or time, the agent stops and explains the allowed schedule before collecting host details.
9. Hosted-calendar or month-wide program-detail prompts are not treated as bookings. The agent explains it cannot provide hosted-event calendar details and steers the user toward eligible bookable home-program dates.
  - The hosted-events disclaimer is shown only for prompts that explicitly ask for hosted events, event calendars, or full-month hosted details.
10. Quick prompt chips are generated from current availability so invalid examples, such as Radha Kalyanam on a Saturday or a fully blocked date, are not suggested.
11. When a program is known but the exact date is missing, the agent uses the shared `CalendarView` date picker from the main booking flow.
12. For valid program/date/time selections, the agent asks for host contact details, address lookup, occasion, and optional organizer notes as embedded controls inside the chat transcript.
  - AI booking address lookup uses Google Places first and falls back to OpenStreetMap/Nominatim when local referrer restrictions block Google Places.
13. Slot-option clicks are appended as user chat messages and processed before the next embedded control is shown.
14. Once required details are complete, the chat transcript shows a final program review card and asks the user to confirm before submitting.
15. Submit reuses the existing final availability checks and `POST /api/bookings` flow.
16. The same AI page can manage existing bookings when the prompt includes edit/cancel language or a confirmation number.
  - Confirmation lookup uses `/api/reservations/verify`.
  - Edit supports date/time changes through the existing `/api/reservations/update` endpoint.
  - Cancel shows a final cancellation panel before calling `/api/reservations/delete`.
17. If the AI proxy is unavailable, the page falls back to local program/date parsing and still allows guided completion where possible.

## Reservation Lookup And Edit Flow

1. User selects "Already have a Reservation?" on a program.
2. User enters confirmation number.
3. App verifies reservation via `/api/reservations/verify` using query parameters (no JSON request body).
4. On success, user chooses "Edit Reservation".
5. App displays current reservation and available replacement dates/slots.
6. User submits new date/time.
7. App calls `/api/reservations/update`.
8. On success, app refreshes bookings and shows completion page.

## Reservation Email Deep-Link Flow

1. Email link includes confirmation and action:
  - Preferred: `/homebookings/reservationaction?action=edit&confirmationNumber=...`
  - Preferred: `/homebookings/reservationaction?action=cancel&confirmationNumber=...`
2. App auto-validates confirmation number via `/api/reservations/verify`.
3. On success, app routes directly to edit or cancel based on the `action` query value.
4. On failure, app falls back to confirmation-number page with an error.

## Reservation Cancel Flow

1. User validates confirmation number.
2. User chooses "Cancel Reservation".
3. App shows reservation details for confirmation.
4. User submits cancellation.
5. App calls `/api/reservations/delete`.
6. On success, app refreshes bookings and shows completion page.

## Address Lookup Flow (Booking Form)

1. User types address query (3+ chars).
2. Form loads Google Places script dynamically (once per session).
3. App calls `AutocompleteService.getPlacePredictions`.
4. User selects a suggestion.
5. App calls `PlacesService.getDetails`.
6. App auto-fills street/city/state/zip fields.
