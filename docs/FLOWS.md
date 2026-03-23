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
