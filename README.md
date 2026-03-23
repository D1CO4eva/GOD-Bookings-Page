# Atlanta Namadwaar Home Program Booking

A welcoming booking experience for Atlanta Namadwaar devotional home programs. Visitors can explore programs, choose an available date and time, and submit a request in just a few steps.

Live site: https://atlanta.godivinity.org
Subpage deployment path: https://atlanta.godivinity.org/homebookings/

## Documentation

Full technical docs are available in the [`docs/`](./docs) folder.

- Audit report: [`docs/AUDIT.md`](./docs/AUDIT.md)
- Architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- Functional flows: [`docs/FLOWS.md`](./docs/FLOWS.md)
- Setup/operations: [`docs/SETUP_AND_OPERATIONS.md`](./docs/SETUP_AND_OPERATIONS.md)
- File-by-file reference: [`docs/FILE_REFERENCE.md`](./docs/FILE_REFERENCE.md)

## App Flow

1. **Browse programs** on the home page, including images and brief descriptions.
2. **Select a program** to open the booking calendar.
3. **Choose a date and time slot** based on availability.
4. **Enter contact details** and submit the request.
5. **Receive confirmation** with next‑step contact information.

## Programs Offered

- Radha Kalyanam
- Nikunja Utsavam
- Thirumanjanam
- Nama Ruchi
- Nama Bhiksha

## Booking Behavior

- The calendar supports **2026 and 2027** in the UI.
- Past dates and already‑booked dates are disabled.
- Radha Kalyanam is available on **Sundays only**.
- Nikunja Utsavam is available on **Saturdays and Sundays**.
- Thirumanjanam is available on **Saturdays and Sundays (mornings only)**.
- Nama Ruchi is available on **Fridays and weekends**.
- Nama Bhiksha is available **any day**, with **up to two bookings per date**.
- If a **Satsang** booking exists for a date, **Nama Bhiksha evening slots** are blocked.

## Donation Experience

- Each program shows a suggested donation.
- A donation modal provides quick access to the Zelle email and easy copy‑to‑clipboard.

## Session Reset

A reset option clears only the locally blocked dates in the current browser session (useful for testing or quick adjustments).

## Quality Checks

- `npm run typecheck`
- `npm run build`
- `npm run check`

## Local Development

- `npm run dev`
  - Starts local development server on `http://localhost:5000/homebookings/`.

## FTPS Deployment

- `npm run deploy:ftps`
  - Builds and uploads `dist/` to your FTPS server.
- `npm run deploy:ftps:only`
  - Uploads without rebuilding first.
- Defaults are preconfigured for this project:
  - Host: `atlanta.godivinity.org`
  - User: `admin@atlanta.godivinity.org`
  - Port: `21`
  - Remote dir: `/homebookings`
- Set `FTPS_REMOTE_DIR` only if your host requires a different absolute path (for example `/public_html/homebookings`).
- `dist/.htaccess` is removed automatically after build.

See [`docs/SETUP_AND_OPERATIONS.md`](./docs/SETUP_AND_OPERATIONS.md) for required FTPS environment variables.
